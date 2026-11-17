// Channel names and payload types shared by main, preload and renderer, so they cannot drift.
export const IpcChannel = {
  OutboxEnqueue: 'outbox:enqueue',
  OutboxList: 'outbox:list',
  OutboxCounts: 'outbox:counts',
  SessionSet: 'session:set',
  SessionRelease: 'session:release',
  SyncGetState: 'sync:get-state',
  SyncNow: 'sync:now',
  // Sent from main to every window whenever the sync state changes.
  SyncState: 'sync:state',
} as const;

export type OutboxStatus =
  'pending' | 'sending' | 'synced' | 'failed' | 'needs_attention';

export type OutboxMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface EnqueueOutboxInput {
  // Authoring user (`users.id`); the entry is replayed under this user's session.
  userId: number;
  // Groups the writes of one shift so they sync in order: start, records, close.
  shiftClientId?: string;
  entity: string;
  method: OutboxMethod;
  path: string;
  payload: unknown;
}

export interface OutboxEntry {
  // Doubles as the Idempotency-Key sent to the API.
  id: string;
  userId: number;
  shiftClientId: string | null;
  entity: string;
  method: OutboxMethod;
  path: string;
  payload: unknown;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OutboxCounts = Record<OutboxStatus, number>;

export interface OutboxApi {
  enqueue: (input: EnqueueOutboxInput) => Promise<OutboxEntry>;
  list: (status?: OutboxStatus) => Promise<OutboxEntry[]>;
  counts: () => Promise<OutboxCounts>;
}

// What the sync engine needs to act for a user while the renderer may be closed or signed out.
export interface SessionInput {
  // `users.id`, the same id outbox entries are authored under.
  userId: number;
  accessToken: string;
  refreshToken: string;
}

export interface SessionApi {
  set: (input: SessionInput) => Promise<void>;
  // On sign-out: the tokens are dropped unless the user still has writes waiting to sync.
  release: (userId: number) => Promise<void>;
}

export type ConnectivityState = 'online' | 'offline';

export interface SyncState {
  connectivity: ConnectivityState;
  syncing: boolean;
  counts: OutboxCounts;
  // Users with waiting writes whose session can no longer be refreshed: they must sign in again.
  signInRequiredUserIds: number[];
  lastSyncedAt: string | null;
}

export interface SyncApi {
  getState: () => Promise<SyncState>;
  syncNow: () => Promise<void>;
  // Returns the function that stops listening.
  onState: (listener: (state: SyncState) => void) => () => void;
}
