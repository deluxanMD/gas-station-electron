import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../db/database';
import { Outbox } from '../outbox/outbox';
import { ShiftMap } from '../sync/shiftMap';
import { LocalShifts } from './localShifts';

const ID_1 = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';
const ID_2 = '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91';

let db: Database.Database;
let outbox: Outbox;
let shifts: LocalShifts;
let clock: Date;
let ids: string[];

beforeEach(() => {
  db = new Database(':memory:');
  migrate(db);
  clock = new Date('2026-01-01T08:00:00.000Z');
  outbox = new Outbox(db, () => clock);
  ids = [ID_1, ID_2];
  shifts = new LocalShifts(
    db,
    outbox,
    () => clock,
    () => ids.shift() as string,
  );
});

describe('LocalShifts.start', () => {
  it('opens a shift with a device-made id and queues its start', () => {
    const shift = shifts.start(7);

    expect(shift).toEqual({
      clientId: ID_1,
      id: null,
      userId: 7,
      startTime: '2026-01-01T08:00:00.000Z',
      endTime: null,
    });
    expect(outbox.list()).toHaveLength(1);
    expect(outbox.list()[0]).toMatchObject({
      entity: 'shift-start',
      path: 'shifts',
      shiftClientId: ID_1,
      payload: {
        userId: 7,
        clientId: ID_1,
        startTime: '2026-01-01T08:00:00.000Z',
      },
    });
  });

  it('returns the shift already open instead of starting a second one', () => {
    shifts.start(7);

    expect(shifts.start(7).clientId).toBe(ID_1);
    expect(outbox.list()).toHaveLength(1);
  });

  it('keeps users apart', () => {
    shifts.start(7);

    expect(shifts.start(8).clientId).toBe(ID_2);
    expect(shifts.current(7)?.clientId).toBe(ID_1);
  });

  it('reports the server id once the start was confirmed', () => {
    shifts.start(7);
    new ShiftMap(db).set(ID_1, 42);

    expect(shifts.current(7)?.id).toBe(42);
  });
});

describe('LocalShifts.finish', () => {
  const writes = [
    {
      entity: 'payouts',
      path: 'payouts',
      payload: { userId: 7, totalPos: 10.5 },
    },
    { entity: 'fuel-dip', path: 'fuel-dips', payload: { userId: 7 } },
  ];

  it('queues the records and then the close, in order, and ends the shift', () => {
    shifts.start(7);
    clock = new Date('2026-01-01T16:00:00.000Z');

    const shift = shifts.finish({ clientId: ID_1, writes });

    expect(shift.endTime).toBe('2026-01-01T16:00:00.000Z');
    expect(shifts.current(7)).toBeNull();
    expect(outbox.list().map((e) => e.entity)).toEqual([
      'shift-start',
      'payouts',
      'fuel-dip',
      'shift-close',
    ]);
  });

  it('stamps every record with the shift and the time it ended, and addresses the close by server id', () => {
    shifts.start(7);
    clock = new Date('2026-01-01T16:00:00.000Z');

    shifts.finish({ clientId: ID_1, writes });

    const [, payouts, , close] = outbox.list();
    expect(payouts.payload).toEqual({
      userId: 7,
      totalPos: 10.5,
      shiftClientId: ID_1,
      recordedAt: '2026-01-01T16:00:00.000Z',
    });
    expect(payouts.shiftClientId).toBe(ID_1);
    expect(close).toMatchObject({
      path: 'shifts/{shiftId}/close',
      payload: { endTime: '2026-01-01T16:00:00.000Z' },
    });
  });

  it('does nothing when the shift is already finished', () => {
    shifts.start(7);
    shifts.finish({ clientId: ID_1, writes });
    const queued = outbox.list().length;

    shifts.finish({ clientId: ID_1, writes });

    expect(outbox.list()).toHaveLength(queued);
  });

  it('saves nothing at all when one of the writes cannot be stored', () => {
    shifts.start(7);
    const before = outbox.list().length;

    expect(() =>
      shifts.finish({
        clientId: ID_1,
        writes: [
          writes[0],
          // A circular payload cannot be turned into JSON.
          {
            entity: 'bad',
            path: 'x',
            payload: (() => {
              const o: Record<string, unknown> = {};
              o.self = o;
              return o;
            })(),
          },
        ],
      }),
    ).toThrow();

    expect(outbox.list()).toHaveLength(before);
    expect(shifts.current(7)).not.toBeNull();
  });

  it('refuses an unknown shift', () => {
    expect(() => shifts.finish({ clientId: ID_2, writes: [] })).toThrow(
      'Shift not found',
    );
  });
});

describe('LocalShifts.adopt', () => {
  it('takes over a server shift that already carries a client id without queuing anything', () => {
    const shift = shifts.adopt({
      userId: 7,
      id: 42,
      clientId: ID_2,
      startTime: '2026-01-01T07:00:00.000Z',
    });

    expect(shift).toMatchObject({
      clientId: ID_2,
      id: 42,
      startTime: '2026-01-01T07:00:00.000Z',
    });
    expect(outbox.list()).toHaveLength(0);
  });

  it('gives a shift started before client ids a new one and queues a start so the server records it', () => {
    const shift = shifts.adopt({
      userId: 7,
      id: 42,
      clientId: null,
      startTime: '2026-01-01T07:00:00.000Z',
    });

    expect(shift).toMatchObject({ clientId: ID_1, id: 42 });
    expect(outbox.list()[0]).toMatchObject({
      entity: 'shift-start',
      payload: {
        userId: 7,
        clientId: ID_1,
        startTime: '2026-01-01T07:00:00.000Z',
      },
    });
  });

  it('keeps the shift this device already has open', () => {
    shifts.start(7);

    const shift = shifts.adopt({
      userId: 7,
      id: 42,
      clientId: ID_2,
      startTime: '2026-01-01T07:00:00.000Z',
    });

    expect(shift.clientId).toBe(ID_1);
  });
});
