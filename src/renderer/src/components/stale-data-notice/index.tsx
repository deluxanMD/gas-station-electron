import type { JSX } from 'react';
import { useStaleStore } from '@/lib/stale-store';

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// The key a list uses when it could only show what this device holds.
const THIS_DEVICE_ONLY = 'this-device-only';

// Shown while a screen holds what the server last said instead of its current answer, or only what this device knows.
export function StaleDataNotice(): JSX.Element | null {
  const stale = useStaleStore((s) => s.stale);
  const saved = Object.entries(stale)
    .filter(([key]) => key !== THIS_DEVICE_ONLY)
    .map(([, time]) => time)
    .sort();
  const thisDeviceOnly = THIS_DEVICE_ONLY in stale;
  if (saved.length === 0 && !thisDeviceOnly) return null;

  return (
    <p
      role="note"
      className="rounded-md bg-warning px-4 py-2 text-sm text-warning-foreground"
    >
      Unable to reach the server.{' '}
      {saved.length > 0
        ? `Showing what was last saved on this device (from ${formatTime(saved[0])}); it may be out of date.`
        : null}
      {saved.length > 0 && thisDeviceOnly ? ' ' : null}
      {thisDeviceOnly
        ? 'The shift list shows only shifts made on this device; shifts from other devices are missing until it reconnects.'
        : null}
    </p>
  );
}
