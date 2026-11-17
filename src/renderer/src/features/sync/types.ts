import type { SyncState } from '../../../../shared/ipc';

export type SyncStatusKind =
  'synced' | 'syncing' | 'offline' | 'attention' | 'sign-in';

export interface SyncStatusView {
  kind: SyncStatusKind;
  // Writes saved on this device that the server has not confirmed yet.
  waiting: number;
  needsAttention: number;
}

export interface SyncStoreState {
  state: SyncState | null;
  setState: (state: SyncState) => void;
}
