import { useEffect, useState } from 'react';
import { useSyncStore } from '@/features/sync/sync-store';
import type { SyncIssues, UseSyncIssuesReturn } from './types';

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// The changes the server refused, read again whenever the count of them changes.
export function useSyncIssues(): UseSyncIssuesReturn {
  const needsAttention = useSyncStore((s) => s.state?.counts.needs_attention);
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

  return { issues, retrying, retry, saveToFile, notice };
}
