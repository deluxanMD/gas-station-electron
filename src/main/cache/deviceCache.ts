import type Database from 'better-sqlite3';
import type { CachedValue } from '../../shared/ipc';

/** The last server answer per read, kept so a screen can still show it with no server. */
export class DeviceCache {
  constructor(
    private readonly db: Database.Database,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get(key: string): CachedValue | null {
    const row = this.db
      .prepare('SELECT value, fetched_at FROM cache WHERE key = ?')
      .get(key) as { value: string; fetched_at: string } | undefined;
    return row
      ? { value: JSON.parse(row.value) as unknown, fetchedAt: row.fetched_at }
      : null;
  }

  put(key: string, value: unknown): void {
    this.db
      .prepare(
        `INSERT INTO cache (key, value, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at`,
      )
      .run(key, JSON.stringify(value), this.now().toISOString());
  }
}
