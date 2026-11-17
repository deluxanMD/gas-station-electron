import Database from 'better-sqlite3';
import { MIGRATIONS } from './migrations';

/** Opens (creating if needed) the on-device database and brings it up to date. */
export function openDatabase(file: string): Database.Database {
  const db = new Database(file);
  // WAL survives a crash mid-write; FULL syncs every commit, which matters for cash and stock records.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function migrate(db: Database.Database): void {
  const applied = db.pragma('user_version', { simple: true }) as number;
  for (let version = applied; version < MIGRATIONS.length; version += 1) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}
