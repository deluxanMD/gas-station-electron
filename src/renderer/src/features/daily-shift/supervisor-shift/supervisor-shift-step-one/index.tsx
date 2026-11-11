import type { JSX } from 'react';
import { Button } from '@/components/ui/button';
import { formatCentsAsAmount } from '@/lib/money';
import { CONSOLIDATED_SECTIONS } from './constants';
import { useReviewShifts } from './hooks';
import type { ReviewShiftsProps } from './types';

export function ReviewShifts({
  formId,
  onNext,
}: ReviewShiftsProps): JSX.Element {
  const {
    shifts,
    checkedIds,
    toggleShift,
    review,
    totals,
    posMismatchCount,
    error,
    handleSubmit,
  } = useReviewShifts({ onNext });

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-6">
      <fieldset className="max-w-2xl space-y-2">
        <legend className="mb-2 text-base font-medium">
          Select the shifts that are part of the day
        </legend>
        {shifts.length === 0 ? (
          <p className="text-muted-foreground">
            No closed shifts are available yet.
          </p>
        ) : (
          shifts.map((shift) => (
            <label
              key={shift.id}
              className="flex items-center gap-3 rounded-md border border-border px-4 py-3"
            >
              <input
                type="checkbox"
                checked={checkedIds.includes(shift.id)}
                onChange={() => toggleShift(shift.id)}
              />
              <span>
                Shift {shift.shiftNumber} · {shift.dayEndDate}{' '}
                {shift.dayEndTime}
              </span>
            </label>
          ))
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={checkedIds.length === 0}
          onClick={review}
        >
          Review
        </Button>
      </fieldset>

      {totals ? (
        <section
          aria-label="Consolidated values"
          className="max-w-2xl space-y-4"
        >
          {posMismatchCount > 0 ? (
            <p role="alert" className="text-sm text-destructive">
              {posMismatchCount} selected shift(s) have a Total POS that differs
              from the Credit Totals. Flag this to the Manager.
            </p>
          ) : null}
          {CONSOLIDATED_SECTIONS.map(({ title, rows }) => (
            <div
              key={title}
              className="overflow-hidden rounded-md border border-border"
            >
              <h3 className="bg-muted px-4 py-2 font-medium">{title}</h3>
              {rows.map(({ key, label }) => (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_2fr] border-t border-border px-4 py-2"
                >
                  <span>{label}</span>
                  <span data-testid={`consolidated-${key}`}>
                    {formatCentsAsAmount(totals[key])}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
