import type { SyncState } from '../../../../shared/ipc';
import type { SyncStatusView } from './types';

// What the person should see, most urgent first: a write the server refused, then a session that has to be renewed,
// then the connection, then whether sending is under way.
export function describeSync(state: SyncState): SyncStatusView {
  const { counts } = state;
  const waiting = counts.pending + counts.sending + counts.failed;
  const needsAttention = counts.needs_attention;
  const base = { waiting, needsAttention };

  if (needsAttention > 0) return { ...base, kind: 'attention' };
  if (state.signInRequiredUserIds.length > 0)
    return { ...base, kind: 'sign-in' };
  if (state.connectivity === 'offline') return { ...base, kind: 'offline' };
  return state.syncing || waiting > 0
    ? { ...base, kind: 'syncing' }
    : { ...base, kind: 'synced' };
}
