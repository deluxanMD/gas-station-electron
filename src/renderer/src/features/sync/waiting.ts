import type { OutboxEntry, SyncState } from '@/lib/ipc';

// Why a change saved on this device has not reached the server yet.
export type WaitingReason =
  | { kind: 'sending' }
  // The person who made it has to sign in again before it can be sent as them.
  | { kind: 'sign-in' }
  | { kind: 'offline' }
  // An earlier change of the same shift goes first.
  | { kind: 'earlier-change' }
  // The server had a problem; it will be tried again at `at`.
  | { kind: 'retry'; at: string; message: string }
  | { kind: 'queued' };

export interface WaitingItem {
  entry: OutboxEntry;
  reason: WaitingReason;
}

/**
 * The changes still to be sent, each with the reason it has not gone yet. `entries` is oldest first, as the device lists
 * them, which is also the order a shift's changes are sent in.
 */
export function describeWaiting(
  entries: readonly OutboxEntry[],
  state: Pick<SyncState, 'connectivity' | 'signInRequiredUserIds'>,
  now: Date,
): WaitingItem[] {
  const seenShifts = new Set<string>();
  return entries.map((entry) => {
    const earlierInShift =
      entry.shiftClientId !== null && seenShifts.has(entry.shiftClientId);
    if (entry.shiftClientId !== null) seenShifts.add(entry.shiftClientId);
    return { entry, reason: reasonFor(entry, state, earlierInShift, now) };
  });
}

function reasonFor(
  entry: OutboxEntry,
  state: Pick<SyncState, 'connectivity' | 'signInRequiredUserIds'>,
  earlierInShift: boolean,
  now: Date,
): WaitingReason {
  if (entry.status === 'sending') return { kind: 'sending' };
  if (state.signInRequiredUserIds.includes(entry.userId)) {
    return { kind: 'sign-in' };
  }
  if (state.connectivity === 'offline') return { kind: 'offline' };
  if (earlierInShift) return { kind: 'earlier-change' };
  return entry.lastError !== null &&
    new Date(entry.nextAttemptAt).getTime() > now.getTime()
    ? { kind: 'retry', at: entry.nextAttemptAt, message: entry.lastError }
    : { kind: 'queued' };
}
