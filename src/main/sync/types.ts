import type { ConnectivityState } from '../../shared/ipc';

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface Encryptor {
  available: boolean;
  encrypt: (plain: string) => Buffer;
  decrypt: (cipher: Buffer) => string;
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export interface SessionRow {
  user_id: number;
  access_token: Buffer;
  refresh_token: Buffer;
}

export interface ConnectivityOptions {
  // Full URL of the API's liveness endpoint.
  probeUrl: string;
  fetch: FetchFn;
  onlineIntervalMs?: number;
  offlineIntervalsMs?: readonly number[];
}

export interface ConnectivityEvents {
  change: [state: ConnectivityState];
}

/** The server's answer to a queued write, reduced to what the engine decides on. */
export interface ServerReply {
  status: number;
  message: string | null;
  data: unknown;
}

export type SendResult = 'done' | 'network-down';

export interface SyncConfig {
  // Includes the API version, e.g. http://localhost:3000/api/v1
  apiBaseUrl: string;
  probeOnlineIntervalMs?: number;
  // Replaces the slowing schedule used while offline (tests only).
  probeOfflineIntervalsMs?: readonly number[];
  tickMs?: number;
}
