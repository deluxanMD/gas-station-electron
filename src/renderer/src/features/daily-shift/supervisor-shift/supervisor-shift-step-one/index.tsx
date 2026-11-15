import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { ConsolidatedValues } from './consolidated-values';
import { useReviewShifts } from './hooks';
import { ShiftOption } from './shift-option';
import type { ReviewShiftsProps } from './types';

export function ReviewShifts({
  formId,
  onNext,
}: ReviewShiftsProps): JSX.Element {
  const {
    today,
    retry,
    checkedIds,
    toggleShift,
    review,
    reviewStatus,
    consolidated,
    handleSubmit,
  } = useReviewShifts({ onNext });

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
              <ShiftOption
                key={shift.id}
                shift={shift}
                checked={checkedIds.includes(String(shift.id))}
                onToggle={toggleShift}
              />
            ))
          : null}
        <Button
          type="button"
          variant="secondary"
          disabled={
            checkedIds.length === 0 || reviewStatus.status === 'loading'
          }
          onClick={review}
        >
          {reviewStatus.status === 'loading' ? 'Reviewing…' : 'Review'}
        </Button>
      </fieldset>

      {reviewStatus.status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {reviewStatus.message}
        </p>
      ) : null}
      {consolidated ? <ConsolidatedValues consolidated={consolidated} /> : null}
    </form>
  );
}
