import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../db/database';
import { MIGRATIONS } from '../db/migrations';
import { Outbox } from './outbox';

const SHIFT = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';

let db: Database.Database;
let outbox: Outbox;

beforeEach(() => {
  db = new Database(':memory:');
  migrate(db);
  outbox = new Outbox(db);
});

const dip = { dipAt: '2026-01-01T10:00:00.000Z', regularTcVolume: 1200.5 };

describe('migrate', () => {
  it('applies every migration once and records the version', () => {
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);

    migrate(db);

    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
  });
});

// A write the server refused.
const refused = (): string => {
  const entry = outbox.enqueue({
    userId: 7,
    entity: 'payouts',
    method: 'POST',
    path: 'payouts',
    payload: {},
  });
  outbox.markNeedsAttention(entry.id, 'Shift is already closed');
  return entry.id;
};

describe('Outbox', () => {
  it('stores a write as pending with its payload intact', () => {
    const entry = outbox.enqueue({
      userId: 7,
      shiftClientId: SHIFT,
      entity: 'fuel-dip',
      method: 'POST',
      path: 'fuel-dips',
      payload: dip,
    });

    expect(entry).toMatchObject({
      userId: 7,
      shiftClientId: SHIFT,
      status: 'pending',
      attempts: 0,
      lastError: null,
      payload: dip,
    });
    expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('lists oldest first and filters by status', () => {
    const first = outbox.enqueue({
      userId: 7,
      entity: 'a',
      method: 'POST',
      path: 'a',
      payload: 1,
    });
    const second = outbox.enqueue({
      userId: 7,
      entity: 'b',
      method: 'POST',
      path: 'b',
      payload: 2,
    });
    db.prepare("UPDATE outbox SET status = 'synced' WHERE id = ?").run(
      first.id,
    );

    expect(outbox.list().map((e) => e.id)).toEqual([first.id, second.id]);
    expect(outbox.list('pending').map((e) => e.id)).toEqual([second.id]);
  });

  it('counts every status, including empty ones', () => {
    outbox.enqueue({
      userId: 7,
      entity: 'a',
      method: 'POST',
      path: 'a',
      payload: {},
    });

    expect(outbox.counts()).toEqual({
      pending: 1,
      sending: 0,
      synced: 0,
      failed: 0,
      needs_attention: 0,
    });
  });

  it('rejects a method the API does not use', () => {
    expect(() =>
      outbox.enqueue({
        userId: 7,
        entity: 'a',
        // @ts-expect-error exercising the database CHECK with an invalid method
        method: 'GET',
        path: 'a',
        payload: {},
      }),
    ).toThrow();
  });

  describe('requeue', () => {
    it('puts a refused write back in the queue as new, ready to send now', () => {
      const id = refused();

      expect(outbox.requeue(id)).toBe(true);

      expect(outbox.get(id)).toMatchObject({
        status: 'pending',
        attempts: 0,
        lastError: null,
      });
      expect(outbox.nextDue(new Date(), [])?.id).toBe(id);
    });

    it('asks the engine to send it', () => {
      const id = refused();
      let announced = 0;
      outbox.on('enqueued', () => (announced += 1));

      outbox.requeue(id);

      expect(announced).toBe(1);
    });

    it('leaves a write that is not waiting for attention alone', () => {
      const pending = outbox.enqueue({
        userId: 7,
        entity: 'a',
        method: 'POST',
        path: 'a',
        payload: {},
      });
      const synced = outbox.enqueue({
        userId: 7,
        entity: 'b',
        method: 'POST',
        path: 'b',
        payload: {},
      });
      outbox.markSynced(synced.id);

      expect(outbox.requeue(pending.id)).toBe(false);
      expect(outbox.requeue(synced.id)).toBe(false);
      expect(outbox.requeue('00000000-0000-4000-8000-000000000000')).toBe(
        false,
      );
      expect(outbox.get(synced.id).status).toBe('synced');
    });
  });
});
