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
  ShiftsCurrent: 'shifts:current',
  ShiftsStart: 'shifts:start',
  ShiftsAdopt: 'shifts:adopt',
  ShiftsFinish: 'shifts:finish',
  CredentialsRemember: 'credentials:remember',
  CredentialsLoginOffline: 'credentials:login-offline',
  SessionRenew: 'session:renew',
  CacheGet: 'cache:get',
  CachePut: 'cache:put',
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
  // A new access token for the user, or null when the server refuses (they must sign in again) or cannot be reached.
  renew: (userId: number) => Promise<string | null>;
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

// A shift as this device knows it: it exists here the moment it is started, with or without the server.
export interface LocalShift {
  // Made on this device; what every write about the shift refers to.
  clientId: string;
  // Known once the server has confirmed the start (or the shift began there).
  id: number | null;
  // `users.id` of the shift's owner.
  userId: number;
  startTime: string;
  endTime: string | null;
}

// An open shift the server already has, e.g. one started on another device.
export interface AdoptShiftInput {
  userId: number;
  id: number;
  clientId: string | null;
  startTime: string;
}

// One record to send when the shift ends, as the API takes it. The shift's client id, the owner and the time the
// shift ended are added by the main process.
export interface ShiftWriteInput {
  entity: string;
  path: string;
  payload: Record<string, unknown>;
}

export interface FinishShiftInput {
  clientId: string;
  writes: ShiftWriteInput[];
}

export interface ShiftsApi {
  // The user's open shift on this device, or null.
  current: (userId: number) => Promise<LocalShift | null>;
  // Starts a shift now, or returns the one already open. Works offline.
  start: (userId: number) => Promise<LocalShift>;
  adopt: (input: AdoptShiftInput) => Promise<LocalShift>;
  // Saves the shift's records and ends it, all together or not at all. Works offline.
  finish: (input: FinishShiftInput) => Promise<LocalShift>;
}

// Remembered after a successful online sign-in so the same person can sign in again without a server.
export interface RememberCredentialsInput {
  // The login name.
  userId: string;
  dbUserId: number;
  role: string | null;
  password: string;
}

export interface OfflineLoginInput {
  userId: string;
  password: string;
}

export type OfflineLoginResult =
  | {
      status: 'ok';
      dbUserId: number;
      role: string | null;
      // The device's last access token for the user; it may have expired.
      token: string;
    }
  // Wrong password or unknown user (not told apart).
  | { status: 'invalid' }
  // Never signed in on this device, signed in too long ago, or the keychain is unavailable.
  | { status: 'unavailable' }
  | { status: 'locked'; until: string };

export interface CredentialsApi {
  remember: (input: RememberCredentialsInput) => Promise<void>;
  loginOffline: (input: OfflineLoginInput) => Promise<OfflineLoginResult>;
}

export interface CachedValue {
  value: unknown;
  // When the server gave this answer.
  fetchedAt: string;
}

export interface CacheApi {
  get: (key: string) => Promise<CachedValue | null>;
  put: (key: string, value: unknown) => Promise<void>;
}
