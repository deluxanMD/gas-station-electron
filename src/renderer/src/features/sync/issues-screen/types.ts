import type { OutboxEntry } from '@/lib/ipc';
import type { WaitingItem } from '@/features/sync/waiting';

export interface SyncIssuesScreenProps {
  onExit: () => void;
}

export type SyncIssues =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: OutboxEntry[] };

export interface UseSyncIssuesReturn {
  issues: SyncIssues;
  // The changes still to be sent and why; null until first read.
  waiting: WaitingItem[] | null;
  // Asks the sync to run now instead of at its next turn.
  trySendingNow: () => void;
  // Ids being sent again right now.
  retrying: ReadonlySet<string>;
  retry: (id: string) => void;
  saveToFile: () => void;
  // What happened to the last request to save, or why it failed.
  notice: string | null;
}
