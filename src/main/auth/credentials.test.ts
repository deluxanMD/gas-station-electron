import Database from 'better-sqlite3';
import { beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../db/database';
import type { Encryptor } from '../sync/types';
import { Credentials } from './credentials';

// Stands in for the keychain: reversible, but never the plain text.
const fakeEncryptor = (available = true): Encryptor => ({
  available,
  encrypt: (plain) => Buffer.from(`enc:${plain}`),
  decrypt: (cipher) => cipher.toString().replace(/^enc:/, ''),
});

let db: Database.Database;
let clock: Date;
let credentials: Credentials;

const remember = (password = 'secret123'): Promise<void> =>
  credentials.remember({
    userId: 'cash1',
    dbUserId: 7,
    role: 'CASHIER',
    password,
  });

beforeEach(() => {
  db = new Database(':memory:');
  migrate(db);
  clock = new Date('2026-01-01T08:00:00.000Z');
  credentials = new Credentials(db, fakeEncryptor(), () => clock);
});

describe('Credentials', () => {
  it('accepts the password that was used to sign in online', async () => {
    await remember();

    await expect(
      credentials.verify({ userId: 'cash1', password: 'secret123' }),
    ).resolves.toEqual({
      status: 'ok',
      dbUserId: 7,
      role: 'CASHIER',
    });
  });

  it('never stores the password or a hash that could be read without the keychain', async () => {
    await remember();

    const row = db.prepare('SELECT verifier FROM credential').get() as {
      verifier: Buffer;
    };
    const text = row.verifier.toString();
    expect(text.startsWith('enc:')).toBe(true);
    expect(text).not.toContain('secret123');
  });

  it('rejects a wrong password', async () => {
    await remember();

    await expect(
      credentials.verify({ userId: 'cash1', password: 'nope' }),
    ).resolves.toEqual({
      status: 'invalid',
    });
  });

  it('reports a user it has never seen as unavailable', async () => {
    await expect(
      credentials.verify({ userId: 'ghost', password: 'x' }),
    ).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('locks after five wrong passwords, even for the right one, and unlocks later', async () => {
    await remember();
    for (let i = 0; i < 4; i += 1) {
      await expect(
        credentials.verify({ userId: 'cash1', password: 'bad' }),
      ).resolves.toEqual({
        status: 'invalid',
      });
    }

    const fifth = await credentials.verify({
      userId: 'cash1',
      password: 'bad',
    });
    expect(fifth).toEqual({
      status: 'locked',
      until: '2026-01-01T08:15:00.000Z',
    });
    await expect(
      credentials.verify({ userId: 'cash1', password: 'secret123' }),
    ).resolves.toEqual({
      status: 'locked',
      until: '2026-01-01T08:15:00.000Z',
    });

    clock = new Date('2026-01-01T08:16:00.000Z');
    await expect(
      credentials.verify({ userId: 'cash1', password: 'secret123' }),
    ).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('forgives earlier mistakes after a correct password', async () => {
    await remember();
    await credentials.verify({ userId: 'cash1', password: 'bad' });
    await credentials.verify({ userId: 'cash1', password: 'secret123' });

    for (let i = 0; i < 4; i += 1)
      await credentials.verify({ userId: 'cash1', password: 'bad' });

    await expect(
      credentials.verify({ userId: 'cash1', password: 'bad' }),
    ).resolves.toMatchObject({
      status: 'locked',
    });
  });

  it('stops working after the offline window', async () => {
    await remember();
    clock = new Date('2026-02-01T08:00:00.000Z');

    await expect(
      credentials.verify({ userId: 'cash1', password: 'secret123' }),
    ).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('is renewed by a new online sign-in, with a changed password and role', async () => {
    await remember('old-password');
    clock = new Date('2026-02-01T08:00:00.000Z');
    await credentials.remember({
      userId: 'cash1',
      dbUserId: 7,
      role: 'MANAGER',
      password: 'new-password',
    });

    await expect(
      credentials.verify({ userId: 'cash1', password: 'old-password' }),
    ).resolves.toEqual({
      status: 'invalid',
    });
    await expect(
      credentials.verify({ userId: 'cash1', password: 'new-password' }),
    ).resolves.toEqual({
      status: 'ok',
      dbUserId: 7,
      role: 'MANAGER',
    });
  });

  it('stores nothing and allows nothing without a keychain', async () => {
    const bare = new Credentials(db, fakeEncryptor(false), () => clock);

    await bare.remember({
      userId: 'cash1',
      dbUserId: 7,
      role: null,
      password: 'secret123',
    });

    expect(db.prepare('SELECT COUNT(*) AS n FROM credential').get()).toEqual({
      n: 0,
    });
    await expect(
      bare.verify({ userId: 'cash1', password: 'secret123' }),
    ).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('knows who can sign in offline', async () => {
    expect(credentials.has(7)).toBe(false);

    await remember();

    expect(credentials.has(7)).toBe(true);
  });

  it('reports unavailable when the verifier was sealed by another keychain', async () => {
    await remember();
    const other: Encryptor = {
      ...fakeEncryptor(),
      decrypt: () => {
        throw new Error('different keychain');
      },
    };

    await expect(
      new Credentials(db, other, () => clock).verify({
        userId: 'cash1',
        password: 'secret123',
      }),
    ).resolves.toEqual({ status: 'unavailable' });
  });
});
