import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import type { ShiftStatusProps } from './types';

const timeFormat = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

export function ShiftStatus({
  current,
  onStart,
  starting,
  startError,
  onRetry,
}: ShiftStatusProps): JSX.Element {
  switch (current.status) {
    case 'loading':
      return (
        <span className="text-sm text-sidebar-foreground/80">
          Checking your shift…
        </span>
      );
    case 'error':
      return (
        <div className="flex items-center gap-3">
          <span role="alert" className="text-sm text-sidebar-foreground/80">
            {current.message}
          </span>
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      );
    case 'none':
      return (
        <div className="flex items-center gap-3">
          {startError ? (
            <span role="alert" className="text-sm text-sidebar-foreground/80">
              {startError}
            </span>
          ) : null}
          <Button onClick={onStart} disabled={starting}>
            Start shift
          </Button>
        </div>
      );
    case 'open':
      return (
        <span className="text-sm text-sidebar-foreground/80">
          Shift started at{' '}
          {timeFormat.format(new Date(current.shift.startTime))}
        </span>
      );
  }
}
