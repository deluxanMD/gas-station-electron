import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  AdoptShiftInput,
  FinishShiftInput,
  LocalConsolidation,
  LocalShift,
  LocalShiftWithUser,
  ShiftOwner,
  TodayShiftsQuery,
} from '../../shared/ipc';
import type { Outbox } from '../outbox/outbox';
import { SHIFT_START_ENTITY } from '../sync/constants';
import { consolidate } from './consolidate';

const SHIFT_CLOSE_ENTITY = 'shift-close';
const SHIFT_CLOSE_PATH = 'shifts/{shiftId}/close';

interface LocalShiftRow {
  client_id: string;
  user_id: number;
  start_time: string;
  end_time: string | null;
  server_id: number | null;
  user_name: string | null;
  role: string | null;
}

const SELECT_SHIFT = `
  SELECT s.client_id, s.user_id, s.start_time, s.end_time, m.server_id,
         COALESCE(s.user_name, c.user_id) AS user_name,
         COALESCE(s.role, c.role) AS role
  FROM local_shift s
  LEFT JOIN credential c ON c.db_user_id = s.user_id
  LEFT JOIN shift_map m ON m.client_id = s.client_id`;

// The same, narrowed by the review lists to the day and the role.
const TODAY_FILTER = ` WHERE s.start_time >= ? AND s.start_time < ?`;

function toShift(row: LocalShiftRow): LocalShift {
  return {
    clientId: row.client_id,
    id: row.server_id,
    userId: row.user_id,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

/**
 * Shifts on this device. Starting and finishing one writes the shift and what must be sent about it in one database
 * transaction, so a shift is never half saved, and neither needs the server: the sync engine sends it later.
 */
export class LocalShifts {
  constructor(
    private readonly db: Database.Database,
    private readonly outbox: Outbox,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  current(userId: number): LocalShift | null {
    const row = this.db
      .prepare(`${SELECT_SHIFT} WHERE s.user_id = ? AND s.end_time IS NULL`)
      .get(userId) as LocalShiftRow | undefined;
    return row ? toShift(row) : null;
  }

  get(clientId: string): LocalShift {
    const row = this.db
      .prepare(`${SELECT_SHIFT} WHERE s.client_id = ?`)
      .get(clientId) as LocalShiftRow | undefined;
    if (!row) throw new Error('Shift not found');
    return toShift(row);
  }

  start(userId: number, who?: ShiftOwner): LocalShift {
    return this.db.transaction((): LocalShift => {
      const open = this.current(userId);
      if (open) return open;

      const clientId = this.newId();
      const startTime = this.now().toISOString();
      this.insert(clientId, userId, startTime, who);
      this.outbox.enqueue({
        userId,
        shiftClientId: clientId,
        entity: SHIFT_START_ENTITY,
        method: 'POST',
        path: 'shifts',
        payload: { userId, clientId, startTime },
      });
      return this.get(clientId);
    })();
  }

  /**
   * Takes over an open shift the server already has. When it began without a client id (before devices could start
   * shifts), a start is queued so the server records the id this device will use.
   */
  adopt(input: AdoptShiftInput): LocalShift {
    return this.db.transaction((): LocalShift => {
      const open = this.current(input.userId);
      if (open) return open;

      const clientId = input.clientId ?? this.newId();
      this.insert(clientId, input.userId, input.startTime, {
        userName: input.userName ?? null,
        role: input.role ?? null,
      });
      this.db
        .prepare(
          `INSERT INTO shift_map (client_id, server_id) VALUES (?, ?)
           ON CONFLICT (client_id) DO UPDATE SET server_id = excluded.server_id`,
        )
        .run(clientId, input.id);
      if (input.clientId === null) {
        this.outbox.enqueue({
          userId: input.userId,
          shiftClientId: clientId,
          entity: SHIFT_START_ENTITY,
          method: 'POST',
          path: 'shifts',
          payload: {
            userId: input.userId,
            clientId,
            startTime: input.startTime,
          },
        });
      }
      return this.get(clientId);
    })();
  }

  /** Queues the shift's records and its close, and ends it here. Finishing a finished shift changes nothing. */
  finish({ clientId, writes }: FinishShiftInput): LocalShift {
    return this.db.transaction((): LocalShift => {
      const shift = this.get(clientId);
      if (shift.endTime) return shift;

      const endTime = this.now().toISOString();
      for (const write of writes) {
        this.outbox.enqueue({
          userId: shift.userId,
          shiftClientId: clientId,
          entity: write.entity,
          method: 'POST',
          path: write.path,
          // `recordedAt` lets the server accept a record that arrives after the shift was closed.
          payload: {
            ...write.payload,
            shiftClientId: clientId,
            recordedAt: endTime,
          },
        });
      }
      this.outbox.enqueue({
        userId: shift.userId,
        shiftClientId: clientId,
        entity: SHIFT_CLOSE_ENTITY,
        method: 'POST',
        path: SHIFT_CLOSE_PATH,
        payload: { endTime },
      });
      this.db
        .prepare('UPDATE local_shift SET end_time = ? WHERE client_id = ?')
        .run(endTime, clientId);
      return this.get(clientId);
    })();
  }

  /** The shifts this device holds that started in the range, for the review lists. */
  today(query: TodayShiftsQuery): LocalShiftWithUser[] {
    const rows = this.db
      .prepare(`${SELECT_SHIFT}${TODAY_FILTER} ORDER BY s.start_time`)
      .all(query.from, query.to) as LocalShiftRow[];
    return rows
      .filter((row) => query.role === undefined || row.role === query.role)
      .map((row) => ({
        ...toShift(row),
        userName: row.user_name ?? `User ${row.user_id}`,
      }));
  }

  /** What the cashiers entered for these shifts, summed from the records saved on this device. */
  consolidate(clientIds: readonly string[]): LocalConsolidation {
    return consolidate(this.outbox.entriesForShifts(clientIds), clientIds);
  }

  private insert(
    clientId: string,
    userId: number,
    startTime: string,
    who?: { userName: string | null; role: string | null },
  ): void {
    this.db
      .prepare(
        `INSERT INTO local_shift (client_id, user_id, start_time, created_at, user_name, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        clientId,
        userId,
        startTime,
        this.now().toISOString(),
        who?.userName ?? null,
        who?.role ?? null,
      );
  }
}
