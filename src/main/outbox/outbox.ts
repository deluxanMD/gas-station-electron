import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type Database from 'better-sqlite3';
import type {
  EnqueueOutboxInput,
  OutboxCounts,
  OutboxEntry,
  OutboxMethod,
  OutboxStatus,
} from '../../shared/ipc';

interface OutboxRow {
  id: string;
  user_id: number;
  shift_client_id: string | null;
  entity: string;
  method: OutboxMethod;
  path: string;
  payload: string;
  status: OutboxStatus;
  attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

const STATUSES: readonly OutboxStatus[] = [
  'pending',
  'sending',
  'synced',
  'failed',
  'needs_attention',
];

function toEntry(row: OutboxRow): OutboxEntry {
  return {
    id: row.id,
    userId: row.user_id,
    shiftClientId: row.shift_client_id,
    entity: row.entity,
    method: row.method,
    path: row.path,
    payload: JSON.parse(row.payload) as unknown,
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The queue of writes made on this device that the server has not confirmed yet. */
export class Outbox extends EventEmitter {
  constructor(
    private readonly db: Database.Database,
    // Injectable so tests control time.
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  enqueue(input: EnqueueOutboxInput): OutboxEntry {
    const id = randomUUID();
    const now = this.now().toISOString();
    this.db
      .prepare(
        `INSERT INTO outbox
           (id, user_id, shift_client_id, entity, method, path, payload, next_attempt_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.userId,
        input.shiftClientId ?? null,
        input.entity,
        input.method,
        input.path,
        JSON.stringify(input.payload),
        now,
        now,
        now,
      );
    this.emit('changed');
    this.emit('enqueued');
    return this.get(id);
  }

  get(id: string): OutboxEntry {
    const row = this.db.prepare('SELECT * FROM outbox WHERE id = ?').get(id) as
      OutboxRow | undefined;
    if (!row) throw new Error(`Outbox entry ${id} not found`);
    return toEntry(row);
  }

  /** Oldest first, so a shift's writes keep the order they were made in. */
  list(status?: OutboxStatus): OutboxEntry[] {
    const rows = (
      status
        ? this.db
            .prepare(
              'SELECT * FROM outbox WHERE status = ? ORDER BY created_at, rowid',
            )
            .all(status)
        : this.db
            .prepare('SELECT * FROM outbox ORDER BY created_at, rowid')
            .all()
    ) as OutboxRow[];
    return rows.map(toEntry);
  }

  counts(): OutboxCounts {
    const counts = Object.fromEntries(
      STATUSES.map((s) => [s, 0]),
    ) as OutboxCounts;
    const rows = this.db
      .prepare('SELECT status, COUNT(*) AS n FROM outbox GROUP BY status')
      .all() as { status: OutboxStatus; n: number }[];
    for (const { status, n } of rows) counts[status] = n;
    return counts;
  }

  /** A write that was in flight when the app stopped is retried: the API's idempotency key makes that safe. */
  recoverInterrupted(): void {
    this.db
      .prepare("UPDATE outbox SET status = 'pending' WHERE status = 'sending'")
      .run();
    this.emit('changed');
  }

  /**
   * The oldest write that can be sent now. A shift's writes go in the order they were made, so one waits for every
   * earlier write of its shift; an earlier write that needs attention only holds the rest back when it is the shift start.
   */
  nextDue(
    now: Date,
    excludeUserIds: readonly number[] = [],
  ): OutboxEntry | null {
    const excluded = excludeUserIds.map(() => '?').join(', ');
    const row = this.db
      .prepare(
        `SELECT o.* FROM outbox o
         WHERE o.status = 'pending' AND o.next_attempt_at <= ?
           ${excluded ? `AND o.user_id NOT IN (${excluded})` : ''}
           AND NOT EXISTS (
             SELECT 1 FROM outbox e
             WHERE o.shift_client_id IS NOT NULL
               AND e.shift_client_id = o.shift_client_id
               AND (e.created_at < o.created_at OR (e.created_at = o.created_at AND e.rowid < o.rowid))
               AND (e.status IN ('pending', 'sending', 'failed')
                    OR (e.status = 'needs_attention' AND e.entity = 'shift-start'))
           )
         ORDER BY o.created_at, o.rowid
         LIMIT 1`,
      )
      .get(now.toISOString(), ...excludeUserIds) as OutboxRow | undefined;
    return row ? toEntry(row) : null;
  }

  markSending(id: string): void {
    this.update(id, "status = 'sending'");
  }

  markSynced(id: string): void {
    this.update(id, "status = 'synced', last_error = NULL");
  }

  /** Back in the queue without counting an attempt: the write never reached the server. */
  release(id: string): void {
    this.update(id, "status = 'pending'");
  }

  /** The server answered with an error worth trying again: wait until `nextAttemptAt`. */
  scheduleRetry(id: string, error: string, nextAttemptAt: Date): void {
    this.update(
      id,
      "status = 'pending', attempts = attempts + 1, last_error = ?, next_attempt_at = ?",
      error,
      nextAttemptAt.toISOString(),
    );
  }

  /** The server refused the write for good; a person has to look at it. */
  markNeedsAttention(id: string, error: string): void {
    this.update(
      id,
      "status = 'needs_attention', attempts = attempts + 1, last_error = ?",
      error,
    );
  }

  /** Users who still have writes that are not confirmed. */
  userIdsWithUnsynced(): number[] {
    const rows = this.db
      .prepare(
        "SELECT DISTINCT user_id FROM outbox WHERE status IN ('pending', 'sending', 'failed')",
      )
      .all() as { user_id: number }[];
    return rows.map((r) => r.user_id);
  }

  private update(id: string, assignments: string, ...params: string[]): void {
    this.db
      .prepare(`UPDATE outbox SET ${assignments}, updated_at = ? WHERE id = ?`)
      .run(...params, this.now().toISOString(), id);
    this.emit('changed');
  }
}
