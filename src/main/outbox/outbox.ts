import { randomUUID } from 'node:crypto';
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
export class Outbox {
  constructor(private readonly db: Database.Database) {}

  enqueue(input: EnqueueOutboxInput): OutboxEntry {
    const id = randomUUID();
    const now = new Date().toISOString();
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
}
