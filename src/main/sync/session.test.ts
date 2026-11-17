import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../db/database';
import { SessionStore } from './session';
import type { Encryptor } from './types';

// Stands in for the keychain: reversible, but never the plain text.
const fakeEncryptor = (available = true): Encryptor => ({
  available,
  encrypt: (plain) => Buffer.from(`enc:${plain}`),
  decrypt: (cipher) => cipher.toString().replace(/^enc:/, ''),
});

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  migrate(db);
});

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1' };

describe('SessionStore', () => {
  it('keeps tokens encrypted on disk and restores them after a restart', () => {
    new SessionStore(db, fakeEncryptor()).set(7, tokens);

    const row = db.prepare('SELECT * FROM session WHERE user_id = 7').get() as {
      access_token: Buffer;
    };
    expect(row.access_token.toString()).not.toBe('access-1');
    expect(new SessionStore(db, fakeEncryptor()).get(7)).toEqual(tokens);
  });

  it('never writes tokens in the clear when there is no keychain', () => {
    const store = new SessionStore(db, fakeEncryptor(false));
    store.set(7, tokens);

    expect(store.get(7)).toEqual(tokens);
    expect(db.prepare('SELECT COUNT(*) AS n FROM session').get()).toEqual({
      n: 0,
    });
  });

  it('drops tokens it can no longer decrypt', () => {
    new SessionStore(db, fakeEncryptor()).set(7, tokens);
    const broken: Encryptor = {
      ...fakeEncryptor(),
      decrypt: () => {
        throw new Error('keychain changed');
      },
    };

    expect(new SessionStore(db, broken).get(7)).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS n FROM session').get()).toEqual({
      n: 0,
    });
  });

  it('reports a missing or expired session as unavailable until the user signs in again', () => {
    const store = new SessionStore(db, fakeEncryptor());
    expect(store.unavailable(7)).toBe(true);

    store.set(7, tokens);
    expect(store.unavailable(7)).toBe(false);

    store.markExpired(7);
    expect(store.unavailable(7)).toBe(true);
    expect(store.expiredUserIds()).toEqual([7]);

    store.set(7, { accessToken: 'a2', refreshToken: 'r2' });
    expect(store.unavailable(7)).toBe(false);
  });

  it('drops the session on sign-out when nothing is waiting', () => {
    const store = new SessionStore(db, fakeEncryptor());
    store.set(7, tokens);

    store.release(7, false);

    expect(store.get(7)).toBeNull();
  });

  it('keeps the session after sign-out while writes wait, then drops it once they are sent', () => {
    const store = new SessionStore(db, fakeEncryptor());
    store.set(7, tokens);

    store.release(7, true);
    expect(store.get(7)).toEqual(tokens);

    store.settle(7, true);
    expect(store.get(7)).toEqual(tokens);

    store.settle(7, false);
    expect(store.get(7)).toBeNull();
  });

  it('does not drop the session of a user who signed in again', () => {
    const store = new SessionStore(db, fakeEncryptor());
    store.set(7, tokens);
    store.release(7, true);
    store.set(7, tokens);

    store.settle(7, false);

    expect(store.get(7)).toEqual(tokens);
  });
});
