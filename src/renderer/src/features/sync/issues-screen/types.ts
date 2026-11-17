import type { OutboxEntry } from '@/lib/ipc';

export interface SyncIssuesScreenProps {
  onExit: () => void;
}

export type SyncIssues =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: OutboxEntry[] };

export interface UseSyncIssuesReturn {
  issues: SyncIssues;
  // Ids being sent again right now.
  retrying: ReadonlySet<string>;
  retry: (id: string) => void;
  saveToFile: () => void;
  // What happened to the last request to save, or why it failed.
  notice: string | null;
}
