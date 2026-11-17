import { useAuthStore } from '@/features/auth/auth-store';
import { OfflineError } from '@/lib/api';
import { useStaleStore } from './stale-store';

/**
 * Reads from the server and keeps the answer on this device. When the server cannot be reached, the last answer for
 * the same read is returned instead and the screen is told it is a saved copy; with none saved, the original error
 * is thrown. Any answer from the server, even an error, is never replaced by a saved copy.
 */
export async function cachedRead<T>(
  name: string,
  load: () => Promise<T>,
): Promise<T> {
  // Per user, so a shared device never shows one person's saved reads to another.
  const key = `${useAuthStore.getState().dbUserId ?? 'anon'}|${name}`;
  try {
    const data = await load();
    useStaleStore.getState().markFresh(key);
    // Failing to remember it must not fail the read.
    void window.api?.cache.put(key, data).catch(() => {});
    return data;
  } catch (error) {
    if (!(error instanceof OfflineError)) throw error;
    const hit = await (
      window.api?.cache.get(key) ?? Promise.resolve(null)
    ).catch(() => null);
    if (!hit) throw error;
    useStaleStore.getState().markStale(key, hit.fetchedAt);
    return hit.value as T;
  }
}
