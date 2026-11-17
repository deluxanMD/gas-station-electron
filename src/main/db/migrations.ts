// Append only: a migration that has shipped is never edited. The database's `user_version` is the number applied.
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE outbox (
    id              TEXT    PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    shift_client_id TEXT,
    entity          TEXT    NOT NULL,
    method          TEXT    NOT NULL CHECK (method IN ('POST', 'PUT', 'PATCH', 'DELETE')),
    path            TEXT    NOT NULL,
    payload         TEXT    NOT NULL,
    status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sending', 'synced', 'failed', 'needs_attention')),
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT    NOT NULL,
    last_error      TEXT,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL
  ) STRICT;

  CREATE INDEX outbox_due ON outbox (status, next_attempt_at);
  CREATE INDEX outbox_shift ON outbox (shift_client_id, created_at);
  `,
  `
  -- Encrypted with the OS keychain (safeStorage) before it is written.
  CREATE TABLE session (
    user_id       INTEGER PRIMARY KEY,
    access_token  BLOB    NOT NULL,
    refresh_token BLOB    NOT NULL,
    updated_at    TEXT    NOT NULL
  ) STRICT;

  -- The server id a shift got once its start was synced, for writes that address the shift by id.
  CREATE TABLE shift_map (
    client_id TEXT    PRIMARY KEY,
    server_id INTEGER NOT NULL
  ) STRICT;
  `,
];
