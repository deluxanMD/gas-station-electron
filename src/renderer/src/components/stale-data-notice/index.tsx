import type { JSX } from 'react';
import { useStaleStore } from '@/lib/stale-store';

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Shown while a screen holds what the server last said instead of its current answer.
export function StaleDataNotice(): JSX.Element | null {
  const stale = useStaleStore((s) => s.stale);
  const times = Object.values(stale).sort();
  if (times.length === 0) return null;

  return (
    <p
      role="note"
      className="rounded-md bg-warning px-4 py-2 text-sm text-warning-foreground"
    >
      Unable to reach the server. Showing what was last saved on this device
      (from {formatTime(times[0])}); it may be out of date.
    </p>
  );
}
