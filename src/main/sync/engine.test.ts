import { EventEmitter } from 'node:events';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { EnqueueOutboxInput, SyncState } from '../../shared/ipc';
import { migrate } from '../db/database';
import { Outbox } from '../outbox/outbox';
import type { Connectivity } from './connectivity';
import { SyncEngine } from './engine';
import { SessionStore } from './session';
import { ShiftMap } from './shiftMap';
import type { FetchFn } from './types';

const API = 'http://api.test/api/v1';
const SHIFT = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';

class FakeConnectivity extends EventEmitter {
  state: 'online' | 'offline' = 'online';
  reportFailure = vi.fn();
  go(state: 'online' | 'offline'): void {
    this.state = state;
    this.emit('change', state);
  }
}

const reply = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), { status });
const ok = (data: unknown = {}): Response =>
  reply(201, { status: 'success', data });
const fail = (status: number, message: string): Response =>
  reply(status, { status: 'error', message });

let db: Database.Database;
let outbox: Outbox;
let sessions: SessionStore;
let shiftMap: ShiftMap;
let connectivity: FakeConnectivity;
let fetchFn: Mock<FetchFn>;
let clock: Date;
let engine: SyncEngine;

const queue = (overrides: Partial<EnqueueOutboxInput> = {}): string =>
  outbox.enqueue({
    userId: 7,
    entity: 'fuel-dip',
    method: 'POST',
    path: 'fuel-dips',
    payload: { shiftClientId: SHIFT },
    ...overrides,
  }).id;

// A response the test settles itself, to hold a request in flight.
const deferred = (): PromiseWithResolvers<Response> =>
  Promise.withResolvers<Response>();

const statusOf = (id: string): string => outbox.get(id).status;

const start = (): string =>
  queue({
    shiftClientId: SHIFT,
    entity: 'shift-start',
    path: 'shifts',
    payload: { userId: 7, clientId: SHIFT },
  });
const record = (): string => queue({ shiftClientId: SHIFT });
const close = (): string =>
  queue({
    shiftClientId: SHIFT,
    entity: 'shift-close',
    path: 'shifts/{shiftId}/close',
    payload: {},
  });

beforeEach(() => {
  db = new Database(':memory:');
  migrate(db);
  clock = new Date('2026-01-01T10:00:00.000Z');
  outbox = new Outbox(db, () => clock);
  sessions = new SessionStore(db, {
    available: false,
    encrypt: () => Buffer.alloc(0),
    decrypt: () => '',
  });
  sessions.set(7, { accessToken: 'access-1', refreshToken: 'refresh-1' });
  shiftMap = new ShiftMap(db);
  connectivity = new FakeConnectivity();
  fetchFn = vi.fn<FetchFn>().mockResolvedValue(ok());
  engine = new SyncEngine({
    outbox,
    sessions,
    shiftMap,
    connectivity: connectivity as unknown as Connectivity,
    fetch: fetchFn,
    apiBaseUrl: API,
    now: () => clock,
    random: () => 0.5,
  });
});

afterEach(() => {
  engine.stop();
});

describe('SyncEngine sending', () => {
  it('sends a queued write with its idempotency key and the user session', async () => {
    const id = queue();

    await engine.syncNow();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API}/fuel-dips`);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer access-1',
      'Idempotency-Key': id,
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init.body as string)).toEqual({ shiftClientId: SHIFT });
    expect(statusOf(id)).toBe('synced');
    expect(engine.getState().lastSyncedAt).toBe('2026-01-01T10:00:00.000Z');
  });

  it('sends nothing while offline and sends everything once the connection returns', async () => {
    connectivity.state = 'offline';
    engine.start();
    const first = queue();
    const second = queue({ entity: 'payouts', path: 'payouts' });

    await engine.syncNow();
    expect(fetchFn).not.toHaveBeenCalled();

    connectivity.go('online');
    await vi.waitFor(() => expect(statusOf(second)).toBe('synced'));
    expect(statusOf(first)).toBe('synced');
  });

  it('puts the write back without counting an attempt when the server cannot be reached', async () => {
    fetchFn.mockRejectedValueOnce(new TypeError('fetch failed'));
    const first = queue();
    const second = queue({ entity: 'payouts', path: 'payouts' });

    await engine.syncNow();

    expect(outbox.get(first)).toMatchObject({ status: 'pending', attempts: 0 });
    expect(statusOf(second)).toBe('pending');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(connectivity.reportFailure).toHaveBeenCalled();
  });

  it('recovers a write that was in flight when the app stopped', () => {
    connectivity.state = 'offline';
    const id = queue();
    outbox.markSending(id);

    engine.start();

    expect(statusOf(id)).toBe('pending');
  });

  it('skips a user who has no session and still sends everyone else', async () => {
    const waiting = queue({ userId: 8 });
    const sent = queue({ userId: 7 });

    await engine.syncNow();

    expect(statusOf(waiting)).toBe('pending');
    expect(statusOf(sent)).toBe('synced');
    expect(engine.getState().signInRequiredUserIds).toEqual([8]);
  });
});

describe('SyncEngine triggers', () => {
  it('sends a new write straight away while running and online', async () => {
    engine.start();

    const id = queue();

    await vi.waitFor(() => expect(statusOf(id)).toBe('synced'));
  });
});

describe('SyncEngine answers', () => {
  it.each([500, 503, 429, 408])(
    'retries after %i with a growing delay',
    async (status) => {
      fetchFn.mockResolvedValueOnce(fail(status, 'Try later'));
      const id = queue();

      await engine.syncNow();

      const entry = outbox.get(id);
      expect(entry).toMatchObject({
        status: 'pending',
        attempts: 1,
        lastError: 'Try later',
      });
      expect(entry.nextAttemptAt).toBe('2026-01-01T10:00:02.000Z');
    },
  );

  it('does not retry before the delay is over, then sends and clears the error', async () => {
    fetchFn.mockResolvedValueOnce(fail(503, 'Try later'));
    const id = queue();
    await engine.syncNow();

    clock = new Date('2026-01-01T10:00:01.000Z');
    await engine.syncNow();
    expect(fetchFn).toHaveBeenCalledTimes(1);

    clock = new Date('2026-01-01T10:00:03.000Z');
    await engine.syncNow();
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(outbox.get(id)).toMatchObject({ status: 'synced', lastError: null });
  });

  it('caps the delay at five minutes', async () => {
    fetchFn.mockResolvedValue(fail(500, 'down'));
    const id = queue();
    db.prepare('UPDATE outbox SET attempts = 20 WHERE id = ?').run(id);

    await engine.syncNow();

    expect(outbox.get(id).nextAttemptAt).toBe('2026-01-01T10:05:00.000Z');
  });

  it.each([400, 403, 404, 422])(
    'marks the write as needing attention after %i',
    async (status) => {
      fetchFn.mockResolvedValueOnce(fail(status, 'Refused'));
      const id = queue();

      await engine.syncNow();

      expect(outbox.get(id)).toMatchObject({
        status: 'needs_attention',
        lastError: 'Refused',
      });
    },
  );

  it('counts a 409 "already saved" as sent: an earlier try got through', async () => {
    fetchFn.mockResolvedValueOnce(fail(409, 'Already saved for this shift'));
    const id = queue();

    await engine.syncNow();

    expect(statusOf(id)).toBe('synced');
  });

  it('does not count any other 409 as sent, so no record is lost silently', async () => {
    fetchFn.mockResolvedValueOnce(fail(409, 'Shift is already closed'));
    const id = queue();

    await engine.syncNow();

    expect(outbox.get(id)).toMatchObject({
      status: 'needs_attention',
      lastError: 'Shift is already closed',
    });
  });
});

describe('SyncEngine after a refused write is retried', () => {
  it('sends it again and it goes through once the cause is fixed', async () => {
    fetchFn
      .mockResolvedValueOnce(fail(409, 'Shift is already closed'))
      .mockResolvedValueOnce(ok());
    engine.start();
    const id = queue();
    await vi.waitFor(() => expect(statusOf(id)).toBe('needs_attention'));

    outbox.requeue(id);

    await vi.waitFor(() => expect(statusOf(id)).toBe('synced'));
    expect(fetchFn).toHaveBeenCalledTimes(2);
    // The same idempotency key both times, so a retry can never duplicate a record.
    const keys = fetchFn.mock.calls.map(
      ([, init]) => (init as RequestInit).headers,
    );
    expect(keys[0]).toMatchObject({ 'Idempotency-Key': id });
    expect(keys[1]).toMatchObject({ 'Idempotency-Key': id });
  });

  it('lets the rest of a shift follow when its refused start is retried', async () => {
    fetchFn
      .mockResolvedValueOnce(fail(400, 'Bad start'))
      .mockResolvedValueOnce(ok({ id: 42 }))
      .mockResolvedValueOnce(ok());
    engine.start();
    const first = start();
    const second = record();
    await vi.waitFor(() => expect(statusOf(first)).toBe('needs_attention'));
    expect(statusOf(second)).toBe('pending');

    outbox.requeue(first);

    await vi.waitFor(() => expect(statusOf(second)).toBe('synced'));
    expect(statusOf(first)).toBe('synced');
  });
});

describe('SyncEngine shifts', () => {
  it('sends a shift in order and addresses the close by the server id of the started shift', async () => {
    fetchFn
      .mockResolvedValueOnce(ok({ id: 42, clientId: SHIFT }))
      .mockResolvedValueOnce(ok())
      .mockResolvedValueOnce(ok());
    const ids = [start(), record(), close()];

    await engine.syncNow();

    expect(fetchFn.mock.calls.map(([url]) => url)).toEqual([
      `${API}/shifts`,
      `${API}/fuel-dips`,
      `${API}/shifts/42/close`,
    ]);
    expect(ids.map(statusOf)).toEqual(['synced', 'synced', 'synced']);
    expect(shiftMap.get(SHIFT)).toBe(42);
  });

  it('holds back a shift’s later writes while an earlier one is waiting to retry', async () => {
    fetchFn.mockResolvedValueOnce(fail(503, 'Try later'));
    const first = start();
    const second = record();

    await engine.syncNow();
    await engine.syncNow();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(statusOf(first)).toBe('pending');
    expect(statusOf(second)).toBe('pending');
  });

  it('does not let another shift wait behind it', async () => {
    fetchFn.mockResolvedValueOnce(fail(503, 'Try later'));
    start();
    const other = queue({
      shiftClientId: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91',
    });

    await engine.syncNow();

    expect(statusOf(other)).toBe('synced');
  });

  it('stops a shift’s other writes when its start is refused', async () => {
    fetchFn.mockResolvedValueOnce(fail(400, 'Bad start'));
    start();
    const second = record();

    await engine.syncNow();

    expect(statusOf(second)).toBe('pending');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('keeps sending a shift’s later writes when an ordinary record is refused', async () => {
    fetchFn
      .mockResolvedValueOnce(ok({ id: 42 }))
      .mockResolvedValueOnce(fail(400, 'Bad record'))
      .mockResolvedValueOnce(ok());
    start();
    const refused = record();
    const closing = close();

    await engine.syncNow();

    expect(statusOf(refused)).toBe('needs_attention');
    expect(statusOf(closing)).toBe('synced');
  });

  it('refuses a close that has no known server shift instead of sending a wrong address', async () => {
    const closing = close();

    await engine.syncNow();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(outbox.get(closing)).toMatchObject({
      status: 'needs_attention',
      lastError: expect.stringContaining('not been synced'),
    });
  });
});

describe('SyncEngine sessions', () => {
  it('renews an expired access token and sends the write again with the new one', async () => {
    fetchFn
      .mockResolvedValueOnce(fail(401, 'Invalid or expired token'))
      .mockResolvedValueOnce(
        ok({ token: 'access-2', refreshToken: 'refresh-2', id: 7 }),
      )
      .mockResolvedValueOnce(ok());
    const id = queue();

    await engine.syncNow();

    expect(statusOf(id)).toBe('synced');
    const [refreshUrl, refreshInit] = fetchFn.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(refreshUrl).toBe(`${API}/auth/refresh`);
    expect(JSON.parse(refreshInit.body as string)).toEqual({
      refreshToken: 'refresh-1',
    });
    expect((fetchFn.mock.calls[2][1] as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer access-2',
    });
    expect(sessions.get(7)).toEqual({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });

  it('asks the user to sign in when the refresh token is refused, keeping the write', async () => {
    fetchFn
      .mockResolvedValueOnce(fail(401, 'Invalid or expired token'))
      .mockResolvedValueOnce(fail(401, 'Invalid or expired refresh token'));
    const id = queue();

    await engine.syncNow();

    expect(outbox.get(id)).toMatchObject({ status: 'pending', attempts: 0 });
    expect(engine.getState().signInRequiredUserIds).toEqual([7]);

    fetchFn.mockClear();
    await engine.syncNow();
    expect(fetchFn).not.toHaveBeenCalled();

    // Signing in again hands the engine fresh tokens, and the write goes out.
    engine.start();
    sessions.set(7, { accessToken: 'access-3', refreshToken: 'refresh-3' });
    await vi.waitFor(() => expect(statusOf(id)).toBe('synced'));
  });

  it('waits for the connection when the refresh cannot reach the server', async () => {
    fetchFn
      .mockResolvedValueOnce(fail(401, 'Invalid or expired token'))
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    const id = queue();

    await engine.syncNow();

    expect(outbox.get(id)).toMatchObject({ status: 'pending', attempts: 0 });
    expect(engine.getState().signInRequiredUserIds).toEqual([]);
    expect(connectivity.reportFailure).toHaveBeenCalled();
  });

  it('drops the session of a signed-out user once their last write is sent', async () => {
    const id = queue();
    sessions.release(7, true);

    await engine.syncNow();

    expect(statusOf(id)).toBe('synced');
    expect(sessions.get(7)).toBeNull();
  });
});

describe('SyncEngine renewAccessToken', () => {
  it('returns a new access token and keeps the new pair', async () => {
    fetchFn.mockResolvedValueOnce(
      ok({ token: 'access-2', refreshToken: 'refresh-2', id: 7 }),
    );

    await expect(engine.renewAccessToken(7)).resolves.toBe('access-2');
    expect(sessions.get(7)).toEqual({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });

  it('returns null and asks for a sign-in when the refresh token is refused', async () => {
    fetchFn.mockResolvedValueOnce(
      fail(401, 'Invalid or expired refresh token'),
    );

    await expect(engine.renewAccessToken(7)).resolves.toBeNull();
    expect(sessions.unavailable(7)).toBe(true);
  });

  it('returns null, without asking for a sign-in, when the server cannot be reached', async () => {
    fetchFn.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(engine.renewAccessToken(7)).resolves.toBeNull();
    expect(sessions.unavailable(7)).toBe(false);
  });

  it('returns null for a user with no session', async () => {
    await expect(engine.renewAccessToken(99)).resolves.toBeNull();
  });
});

describe('SyncEngine state', () => {
  it('reports counts and connectivity and announces changes', async () => {
    const states: SyncState[] = [];
    engine.on('state', (state: SyncState) => states.push(state));
    queue();
    queue({ entity: 'payouts', path: 'payouts' });

    expect(engine.getState()).toMatchObject({
      connectivity: 'online',
      syncing: false,
      counts: { pending: 2, synced: 0 },
    });

    await engine.syncNow();

    expect(engine.getState().counts).toMatchObject({ pending: 0, synced: 2 });
    expect(states.some((s) => s.syncing)).toBe(true);
    expect(states.at(-1)?.syncing).toBe(false);
  });

  it('runs one more pass when asked during a pass, instead of overlapping', async () => {
    const held = deferred();
    fetchFn.mockImplementationOnce(() => held.promise);
    const first = queue();
    const running = engine.syncNow();

    const late = queue({ entity: 'payouts', path: 'payouts' });
    void engine.syncNow();
    held.resolve(ok());
    await running;

    expect(statusOf(first)).toBe('synced');
    expect(statusOf(late)).toBe('synced');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
