import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { ConsolidatedValues } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/consolidated-values';
import { ShiftOption } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/shift-option';
import { useTodayShifts } from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/hooks';
import { useReviewCashierReports } from './hooks';
import type { ReviewCashierReportsProps } from './types';

export function ReviewCashierReports({
  formId,
  onNext,
}: ReviewCashierReportsProps): JSX.Element {
  const { today, retry } = useTodayShifts();
  const {
    checkedIds,
    toggleShift,
    review,
    reviewStatus,
    consolidated,
    handleSubmit,
  } = useReviewCashierReports({
    onNext,
    shifts: today.status === 'ready' ? today.shifts : [],
  });

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
      <fieldset className="max-w-2xl space-y-2">
        <legend className="mb-2 text-base font-medium">
          Select the cashier shifts to review
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
                key={shift.key}
                shift={shift}
                checked={checkedIds.includes(shift.key)}
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
