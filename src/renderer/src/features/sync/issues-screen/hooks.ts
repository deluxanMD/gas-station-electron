import { useEffect, useState } from 'react';
import { useSyncStore } from '@/features/sync/sync-store';
import { describeWaiting } from '@/features/sync/waiting';
import type { WaitingItem } from '@/features/sync/waiting';
import type { SyncIssues, UseSyncIssuesReturn } from './types';

// Asks the sync to run now instead of at its next turn.
function trySendingNow(): void {
  void window.api?.sync.syncNow();
}

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// The changes the server refused, read again whenever the count of them changes.
export function useSyncIssues(): UseSyncIssuesReturn {
  const sync = useSyncStore((s) => s.state);
  const needsAttention = sync?.counts.needs_attention;
  // Anything that moves a change between the lists or changes why it waits: read them again.
  const waitingKey = sync
    ? [
        sync.counts.pending,
        sync.counts.sending,
        sync.counts.failed,
        sync.counts.synced,
        sync.connectivity,
        sync.signInRequiredUserIds.join(','),
      ].join('|')
    : 'none';
  const [waiting, setWaiting] = useState<WaitingItem[] | null>(null);
  const [issues, setIssues] = useState<SyncIssues>({ status: 'loading' });
  const [retrying, setRetrying] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const entries = await (window.api?.outbox.list('needs_attention') ??
          Promise.resolve([]));
        if (!cancelled) setIssues({ status: 'ready', entries });
      } catch (error) {
        if (!cancelled) {
          setIssues({
            status: 'error',
            message: messageOf(error, 'Unable to load the changes.'),
          });
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [needsAttention]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const { state } = useSyncStore.getState();
      if (!state) return;
      try {
        const entries = await (window.api?.outbox.list([
          'pending',
          'sending',
          'failed',
        ]) ?? Promise.resolve([]));
        if (!cancelled) setWaiting(describeWaiting(entries, state, new Date()));
      } catch {
        // The list of what is waiting is a convenience; the pill still counts it.
        if (!cancelled) setWaiting(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [waitingKey]);

  const retry = (id: string): void => {
    setNotice(null);
    setRetrying((ids) => new Set(ids).add(id));
    const run = async (): Promise<void> => {
      try {
        await window.api?.outbox.retry(id);
      } catch (error) {
        setNotice(messageOf(error, 'Unable to send it again.'));
      } finally {
        setRetrying((ids) => {
          const next = new Set(ids);
          next.delete(id);
          return next;
        });
      }
    };
    void run();
  };

  const saveToFile = (): void => {
    setNotice(null);
    const run = async (): Promise<void> => {
      try {
        const result = await window.api?.outbox.exportEntries();
        if (result?.saved) setNotice(`Saved to ${result.path}`);
      } catch (error) {
        setNotice(messageOf(error, 'Unable to save the file.'));
      }
    };
    void run();
  };

  return {
    issues,
    waiting,
    trySendingNow,
    retrying,
    retry,
    saveToFile,
    notice,
  };
}
