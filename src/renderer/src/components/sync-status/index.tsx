import type { JSX } from 'react';
import { useNavigate } from 'react-router';
import { describeSync } from '@/features/sync/status';
import { useSyncStore } from '@/features/sync/sync-store';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/router/constants';
import { SYNC_STATUS_STYLES } from './constants';

// Shows whether what was entered on this device has reached the server. Hidden outside the desktop app.
export function SyncStatus(): JSX.Element | null {
  const state = useSyncStore((s) => s.state);
  const navigate = useNavigate();
  if (!state) return null;

  const view = describeSync(state);
  const { icon: Icon, className, label } = SYNC_STATUS_STYLES[view.kind];
  return (
    <div
      role="status"
      className={cn(
        'ml-auto flex items-center gap-2 rounded-full px-3 py-1 text-sm',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn('size-4', view.kind === 'syncing' && 'animate-spin')}
      />
      {label(view.waiting, view.needsAttention)}
      {view.kind === 'attention' ? (
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => void navigate(ROUTES.syncIssues)}
        >
          Review
        </button>
      ) : null}
    </div>
  );
}
