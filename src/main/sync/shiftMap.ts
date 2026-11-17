import type Database from 'better-sqlite3';

/** Which server shift a device-made shift id became, once its start was confirmed. */
export class ShiftMap {
  constructor(private readonly db: Database.Database) {}

  set(clientId: string, serverId: number): void {
    this.db
      .prepare(
        `INSERT INTO shift_map (client_id, server_id) VALUES (?, ?)
         ON CONFLICT (client_id) DO UPDATE SET server_id = excluded.server_id`,
      )
      .run(clientId, serverId);
  }

  get(clientId: string): number | null {
    const row = this.db
      .prepare('SELECT server_id FROM shift_map WHERE client_id = ?')
      .get(clientId) as { server_id: number } | undefined;
    return row?.server_id ?? null;
  }
}
