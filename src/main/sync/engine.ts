import { EventEmitter } from 'node:events';
import type { OutboxEntry, SyncState } from '../../shared/ipc';
import type { Outbox } from '../outbox/outbox';
import type { Connectivity } from './connectivity';
import {
  ALREADY_SAVED_PATTERN,
  BACKOFF_BASE_MS,
  BACKOFF_JITTER,
  BACKOFF_MAX_MS,
  ENGINE_TICK_MS,
  REQUEST_TIMEOUT_MS,
  RETRYABLE_STATUSES,
  SHIFT_ID_PLACEHOLDER,
  SHIFT_START_ENTITY,
} from './constants';
import type { SessionStore } from './session';
import type { ShiftMap } from './shiftMap';
import type { FetchFn, SendResult, ServerReply } from './types';

export interface EngineDeps {
  outbox: Outbox;
  sessions: SessionStore;
  shiftMap: ShiftMap;
  connectivity: Connectivity;
  fetch: FetchFn;
  // Includes the API version, e.g. http://localhost:3000/api/v1
  apiBaseUrl: string;
  now?: () => Date;
  random?: () => number;
  tickMs?: number;
}

class NetworkError extends Error {}
class NoSessionError extends Error {}

/**
 * Sends the writes queued on this device. Runs in the main process, so it keeps going whichever screen is open and
 * resumes after a restart. Each write carries its outbox id as `Idempotency-Key`, so a retry after a lost answer never
 * duplicates a record. One shift's writes go in order (start, records, close).
 */
export class SyncEngine extends EventEmitter {
  private draining = false;
  private again = false;
  private timer: NodeJS.Timeout | null = null;
  private lastSyncedAt: string | null = null;
  private readonly now: () => Date;
  private readonly random: () => number;

  constructor(private readonly deps: EngineDeps) {
    super();
    this.now = deps.now ?? ((): Date => new Date());
    this.random = deps.random ?? Math.random;
  }

  start(): void {
    this.deps.outbox.recoverInterrupted();
    this.deps.outbox.on('changed', this.onOutboxChanged);
    this.deps.outbox.on('enqueued', this.onEnqueued);
    this.deps.sessions.on('changed', this.onSessionChanged);
    this.deps.connectivity.on('change', this.onConnectivityChanged);
    this.timer = setInterval(
      () => void this.syncNow(),
      this.deps.tickMs ?? ENGINE_TICK_MS,
    );
    this.timer.unref();
    void this.syncNow();
  }

  stop(): void {
    this.deps.outbox.off('changed', this.onOutboxChanged);
    this.deps.outbox.off('enqueued', this.onEnqueued);
    this.deps.sessions.off('changed', this.onSessionChanged);
    this.deps.connectivity.off('change', this.onConnectivityChanged);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getState(): SyncState {
    return {
      connectivity: this.deps.connectivity.state,
      syncing: this.draining,
      counts: this.deps.outbox.counts(),
      signInRequiredUserIds: this.signInRequired(),
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  /** Sends everything that is due. Calls made while a pass is running ask for one more pass. */
  async syncNow(): Promise<void> {
    if (this.draining) {
      this.again = true;
      return;
    }
    this.draining = true;
    this.emitState();
    try {
      do {
        this.again = false;
        await this.pass();
      } while (this.again);
    } finally {
      this.draining = false;
      this.emitState();
    }
  }

  private readonly onOutboxChanged = (): void => {
    this.emitState();
  };
  // A new write goes out at once instead of waiting for the next tick. Deferred so a transaction that is still
  // queuing the shift's other writes commits first: nothing is sent that could still be rolled back.
  private readonly onEnqueued = (): void => {
    setImmediate(() => void this.syncNow());
  };
  private readonly onSessionChanged = (): void => {
    this.emitState();
    void this.syncNow();
  };
  private readonly onConnectivityChanged = (): void => {
    this.emitState();
    void this.syncNow();
  };

  private emitState(): void {
    this.emit('state', this.getState());
  }

  // Users whose waiting writes cannot be sent until they sign in.
  private signInRequired(): number[] {
    return this.deps.outbox
      .userIdsWithUnsynced()
      .filter((userId) => this.deps.sessions.unavailable(userId));
  }

  private async pass(): Promise<void> {
    while (this.deps.connectivity.state === 'online') {
      const entry = this.deps.outbox.nextDue(this.now(), this.signInRequired());
      if (!entry) return;
      if ((await this.send(entry)) === 'network-down') return;
    }
  }

  private async send(entry: OutboxEntry): Promise<SendResult> {
    const { outbox, sessions } = this.deps;
    outbox.markSending(entry.id);
    try {
      let reply = await this.request(entry);
      if (reply.status === 401) {
        if (!(await this.refresh(entry.userId))) {
          sessions.markExpired(entry.userId);
          outbox.release(entry.id);
          return 'done';
        }
        reply = await this.request(entry);
      }
      this.settle(entry, reply);
      return 'done';
    } catch (error) {
      if (error instanceof NetworkError) {
        // Never reached the server: no attempt is counted, and the queue waits for the connection.
        outbox.release(entry.id);
        this.deps.connectivity.reportFailure();
        return 'network-down';
      }
      if (error instanceof NoSessionError) {
        // The user signed out mid-pass; the write waits for them.
        outbox.release(entry.id);
        return 'done';
      }
      outbox.markNeedsAttention(
        entry.id,
        error instanceof Error ? error.message : 'Unexpected error',
      );
      return 'done';
    }
  }

  private settle(entry: OutboxEntry, reply: ServerReply): void {
    const { outbox, shiftMap, sessions } = this.deps;
    const { status } = reply;
    const message = reply.message ?? `Server answered ${status}`;

    if (status >= 200 && status < 300) {
      if (entry.entity === SHIFT_START_ENTITY && entry.shiftClientId) {
        const id = (reply.data as { id?: unknown } | null)?.id;
        if (typeof id === 'number') shiftMap.set(entry.shiftClientId, id);
      }
      this.confirmed(entry.id);
    } else if (status === 409 && ALREADY_SAVED_PATTERN.test(message)) {
      // An earlier try got through and only its answer was lost.
      this.confirmed(entry.id);
    } else if (status >= 500 || RETRYABLE_STATUSES.has(status)) {
      outbox.scheduleRetry(entry.id, message, this.nextAttempt(entry.attempts));
    } else {
      outbox.markNeedsAttention(entry.id, message);
    }
    sessions.settle(
      entry.userId,
      outbox.userIdsWithUnsynced().includes(entry.userId),
    );
  }

  private confirmed(id: string): void {
    this.deps.outbox.markSynced(id);
    this.lastSyncedAt = this.now().toISOString();
  }

  private nextAttempt(attempts: number): Date {
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** attempts);
    const jitter = 1 + (this.random() * 2 - 1) * BACKOFF_JITTER;
    return new Date(this.now().getTime() + base * jitter);
  }

  private async request(entry: OutboxEntry): Promise<ServerReply> {
    const session = this.deps.sessions.get(entry.userId);
    if (!session) throw new NoSessionError('No session for this user');

    let { path } = entry;
    if (path.includes(SHIFT_ID_PLACEHOLDER)) {
      const serverId = entry.shiftClientId
        ? this.deps.shiftMap.get(entry.shiftClientId)
        : null;
      if (serverId === null)
        throw new Error('The shift this write belongs to has not been synced');
      path = path.replace(SHIFT_ID_PLACEHOLDER, String(serverId));
    }

    let response: Response;
    try {
      response = await this.deps.fetch(`${this.deps.apiBaseUrl}/${path}`, {
        method: entry.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'Idempotency-Key': entry.id,
        },
        body:
          entry.method === 'DELETE' ? undefined : JSON.stringify(entry.payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new NetworkError('Unable to reach the server');
    }
    return this.read(response);
  }

  private async read(response: Response): Promise<ServerReply> {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
      data?: unknown;
    } | null;
    return {
      status: response.status,
      message: typeof body?.message === 'string' ? body.message : null,
      data: body?.data ?? null,
    };
  }

  /** Trades the refresh token for new tokens. False when the server refuses it (the user must sign in again). */
  private async refresh(userId: number): Promise<boolean> {
    const session = this.deps.sessions.get(userId);
    if (!session) return false;
    let response: Response;
    try {
      response = await this.deps.fetch(`${this.deps.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new NetworkError('Unable to reach the server');
    }
    if (!response.ok) {
      if (response.status >= 500) throw new NetworkError('Server unavailable');
      return false;
    }
    const reply = await this.read(response);
    const data = reply.data as {
      token?: unknown;
      refreshToken?: unknown;
    } | null;
    if (
      typeof data?.token !== 'string' ||
      typeof data.refreshToken !== 'string'
    )
      return false;
    this.deps.sessions.set(userId, {
      accessToken: data.token,
      refreshToken: data.refreshToken,
    });
    return true;
  }
}
