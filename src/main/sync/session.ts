import { EventEmitter } from 'node:events';
import type Database from 'better-sqlite3';
import type { Encryptor, SessionRow, StoredSession } from './types';

/**
 * The tokens the sync engine uses to send a user's queued writes. They are kept encrypted on disk (OS keychain) so the
 * queue can be sent after a restart, and are dropped on sign-out unless that user still has writes waiting.
 */
export class SessionStore extends EventEmitter {
  private readonly sessions = new Map<number, StoredSession>();
  private readonly expired = new Set<number>();
  private readonly signedOut = new Set<number>();

  constructor(
    private readonly db: Database.Database,
    private readonly encryptor: Encryptor,
  ) {
    super();
    this.load();
  }

  get(userId: number): StoredSession | null {
    return this.sessions.get(userId) ?? null;
  }

  /** True when the user has no usable session: signed out, or a refresh was refused. */
  unavailable(userId: number): boolean {
    return !this.sessions.has(userId) || this.expired.has(userId);
  }

  set(userId: number, session: StoredSession): void {
    this.sessions.set(userId, session);
    this.expired.delete(userId);
    this.signedOut.delete(userId);
    this.persist(userId, session);
    this.emit('changed');
  }

  /** The refresh token was refused: nothing for this user can be sent until they sign in again. */
  markExpired(userId: number): void {
    this.expired.add(userId);
    this.emit('changed');
  }

  expiredUserIds(): number[] {
    return [...this.expired];
  }

  /** Sign-out: the session is kept only while the user still has unsent writes, then dropped by `settle`. */
  release(userId: number, hasUnsynced: boolean): void {
    this.signedOut.add(userId);
    if (!hasUnsynced) this.drop(userId);
  }

  /** Called after a write was confirmed: a signed-out user with nothing left to send loses the session. */
  settle(userId: number, hasUnsynced: boolean): void {
    if (this.signedOut.has(userId) && !hasUnsynced) this.drop(userId);
  }

  private drop(userId: number): void {
    this.sessions.delete(userId);
    this.expired.delete(userId);
    this.signedOut.delete(userId);
    this.db.prepare('DELETE FROM session WHERE user_id = ?').run(userId);
    this.emit('changed');
  }

  private persist(userId: number, session: StoredSession): void {
    // Without a keychain the tokens stay in memory only: never write them to disk in the clear.
    if (!this.encryptor.available) return;
    this.db
      .prepare(
        `INSERT INTO session (user_id, access_token, refresh_token, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET access_token = excluded.access_token,
           refresh_token = excluded.refresh_token, updated_at = excluded.updated_at`,
      )
      .run(
        userId,
        this.encryptor.encrypt(session.accessToken),
        this.encryptor.encrypt(session.refreshToken),
        new Date().toISOString(),
      );
  }

  private load(): void {
    if (!this.encryptor.available) return;
    const rows = this.db.prepare('SELECT * FROM session').all() as SessionRow[];
    for (const row of rows) {
      try {
        this.sessions.set(row.user_id, {
          accessToken: this.encryptor.decrypt(row.access_token),
          refreshToken: this.encryptor.decrypt(row.refresh_token),
        });
      } catch {
        // Unreadable (keychain changed): the user signs in again.
        this.db
          .prepare('DELETE FROM session WHERE user_id = ?')
          .run(row.user_id);
      }
    }
  }
}
