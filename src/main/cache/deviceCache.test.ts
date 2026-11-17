import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../db/database';
import { DeviceCache } from './deviceCache';

let cache: DeviceCache;
let clock: Date;

beforeEach(() => {
  const db = new Database(':memory:');
  migrate(db);
  clock = new Date('2026-01-01T08:00:00.000Z');
  cache = new DeviceCache(db, () => clock);
});

describe('DeviceCache', () => {
  it('returns nothing for a read it has not seen', () => {
    expect(cache.get('1:shifts')).toBeNull();
  });

  it('keeps the last answer and when it was given', () => {
    cache.put('1:shifts', [{ id: 5 }]);

    expect(cache.get('1:shifts')).toEqual({
      value: [{ id: 5 }],
      fetchedAt: '2026-01-01T08:00:00.000Z',
    });
  });

  it('replaces an older answer', () => {
    cache.put('1:shifts', [1]);
    clock = new Date('2026-01-01T09:00:00.000Z');
    cache.put('1:shifts', [2]);

    expect(cache.get('1:shifts')).toEqual({
      value: [2],
      fetchedAt: '2026-01-01T09:00:00.000Z',
    });
  });

  it('keeps null as an answer (nothing saved yet) apart from no answer', () => {
    cache.put('1:latest', null);

    expect(cache.get('1:latest')).toEqual({
      value: null,
      fetchedAt: '2026-01-01T08:00:00.000Z',
    });
  });
});
