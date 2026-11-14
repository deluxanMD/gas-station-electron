import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { useReviewShifts } from './hooks';
import type { ReviewShiftsProps } from './types';

export function ReviewShifts({
  formId,
  onNext,
}: ReviewShiftsProps): JSX.Element {
  const { today, retry, checkedIds, toggleShift, review, error, handleSubmit } =
    useReviewShifts({ onNext });

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
      <fieldset className="max-w-2xl space-y-2">
        <legend className="mb-2 text-base font-medium">
          Select the shifts that are part of the day
        </legend>
        {today.status === 'loading' ? (
          <p className="text-muted-foreground">Loading today&apos;s shifts…</p>
        ) : null}
        {today.status === 'error' ? (
          <div className="flex items-center gap-3">
            <p role="alert" className="text-sm text-destructive">
              {today.message}
            </p>
            <Button type="button" variant="outline" onClick={retry}>
              Retry
            </Button>
          </div>
        ) : null}
        {today.status === 'ready' && today.shifts.length === 0 ? (
          <p className="text-muted-foreground">No cashier shifts today yet.</p>
        ) : null}
        {today.status === 'ready'
          ? today.shifts.map((shift) => (
              <label
                key={shift.id}
                className="flex items-center gap-3 rounded-md border border-border px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={checkedIds.includes(String(shift.id))}
                  onChange={() => toggleShift(String(shift.id))}
                />
                <span>
                  {shift.userName} · Started {formatDateTime(shift.startTime)} ·{' '}
                  {shift.endTime
                    ? `Ended ${formatDateTime(shift.endTime)}`
                    : 'In progress'}
                </span>
              </label>
            ))
          : null}
        <Button
          type="button"
          variant="secondary"
          disabled={checkedIds.length === 0}
          onClick={review}
        >
          Review
        </Button>
      </fieldset>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
