import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import type {
  OfflineLoginInput,
  OfflineLoginResult,
  RememberCredentialsInput,
} from '../../shared/ipc';

// The answer before the device's token is added to a success.
export type OfflineVerdict =
  | { status: 'ok'; dbUserId: number; role: string | null }
  | Exclude<OfflineLoginResult, { status: 'ok' }>;
import type { Encryptor } from '../sync/types';
import {
  KEY_LENGTH,
  LOCK_MS,
  MAX_FAILED_ATTEMPTS,
  MAX_OFFLINE_DAYS,
  SALT_LENGTH,
  SCRYPT_COST,
} from './constants';

interface CredentialRow {
  user_id: string;
  db_user_id: number;
  role: string | null;
  verifier: Buffer;
  last_online_at: string;
  failed_attempts: number;
  locked_until: string | null;
}

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_COST, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

/**
 * Lets someone who signed in on this device sign in again with no server. The password is checked against a salted
 * scrypt hash sealed with the OS keychain, so it cannot be tried offline on a copy of the database. Attempts are
 * limited, and it stops working after the offline window (the same time a refresh token lasts), so a long-gone user
 * has to sign in online.
 */
export class Credentials {
  constructor(
    private readonly db: Database.Database,
    private readonly encryptor: Encryptor,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** True when this user can sign in offline; sessions of such users are kept after sign-out. */
  has(dbUserId: number): boolean {
    return (
      this.db
        .prepare('SELECT 1 FROM credential WHERE db_user_id = ?')
        .get(dbUserId) !== undefined
    );
  }

  async remember(input: RememberCredentialsInput): Promise<void> {
    // Without a keychain nothing is stored: a hash on disk in the clear could be attacked offline.
    if (!this.encryptor.available) return;
    const salt = randomBytes(SALT_LENGTH);
    const hash = await derive(input.password, salt);
    const verifier = this.encryptor.encrypt(
      JSON.stringify({
        salt: salt.toString('base64'),
        hash: hash.toString('base64'),
      }),
    );
    this.db
      .prepare(
        `INSERT INTO credential (user_id, db_user_id, role, verifier, last_online_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET db_user_id = excluded.db_user_id, role = excluded.role,
           verifier = excluded.verifier, last_online_at = excluded.last_online_at,
           failed_attempts = 0, locked_until = NULL`,
      )
      .run(
        input.userId,
        input.dbUserId,
        input.role,
        verifier,
        this.now().toISOString(),
      );
  }

  async verify(input: OfflineLoginInput): Promise<OfflineVerdict> {
    if (!this.encryptor.available) return { status: 'unavailable' };
    const row = this.db
      .prepare('SELECT * FROM credential WHERE user_id = ?')
      .get(input.userId) as CredentialRow | undefined;
    // An unknown user costs the same time as a wrong password, so the two cannot be told apart.
    if (!row) {
      await derive(input.password, randomBytes(SALT_LENGTH));
      return { status: 'unavailable' };
    }

    const now = this.now();
    if (row.locked_until && new Date(row.locked_until) > now) {
      return { status: 'locked', until: row.locked_until };
    }
    const ageMs = now.getTime() - new Date(row.last_online_at).getTime();
    if (ageMs > MAX_OFFLINE_DAYS * 86_400_000) return { status: 'unavailable' };

    let stored: { salt: string; hash: string };
    try {
      stored = JSON.parse(
        this.encryptor.decrypt(row.verifier),
      ) as typeof stored;
    } catch {
      // Sealed by another keychain: only an online sign-in can renew it.
      return { status: 'unavailable' };
    }
    const hash = await derive(
      input.password,
      Buffer.from(stored.salt, 'base64'),
    );
    const expected = Buffer.from(stored.hash, 'base64');
    if (hash.length === expected.length && timingSafeEqual(hash, expected)) {
      this.db
        .prepare(
          'UPDATE credential SET failed_attempts = 0, locked_until = NULL WHERE user_id = ?',
        )
        .run(row.user_id);
      return { status: 'ok', dbUserId: row.db_user_id, role: row.role };
    }

    const failed = row.failed_attempts + 1;
    const lockedUntil =
      failed >= MAX_FAILED_ATTEMPTS
        ? new Date(now.getTime() + LOCK_MS).toISOString()
        : null;
    this.db
      .prepare(
        'UPDATE credential SET failed_attempts = ?, locked_until = ? WHERE user_id = ?',
      )
      .run(lockedUntil ? 0 : failed, lockedUntil, row.user_id);
    return lockedUntil
      ? { status: 'locked', until: lockedUntil }
      : { status: 'invalid' };
  }
}
