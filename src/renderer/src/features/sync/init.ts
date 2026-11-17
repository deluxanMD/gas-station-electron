import { useSyncStore } from './sync-store';

/** Starts mirroring the main process's sync state into the store. A no-op outside the desktop app. */
export function startSyncStatus(): void {
  const sync = window.api?.sync;
  if (!sync) return;
  const { setState } = useSyncStore.getState();
  sync.onState(setState);
  void sync.getState().then(setState);
}
