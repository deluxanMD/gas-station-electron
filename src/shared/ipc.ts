// Channel names and payload types shared by main, preload and renderer, so they cannot drift.
export const IpcChannel = {
  OutboxEnqueue: 'outbox:enqueue',
  OutboxList: 'outbox:list',
  OutboxCounts: 'outbox:counts',
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
