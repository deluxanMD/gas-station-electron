import type { JSX } from 'react';
import { RowField } from '@/components/row-field';
import { Form } from '@/components/ui/form';
import { DAILY_SUMMARY_AMOUNT_FIELDS } from './constants';
import { useDailySummaryForm } from './hooks';
import type { DailySummaryProps, DailySummaryValues } from './types';

export function DailySummary({
  formId,
  onNext,
}: DailySummaryProps): JSX.Element {
  const { form, handleSubmit, needsChangeReason } = useDailySummaryForm({
    onNext,
  });

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl overflow-hidden rounded-md border border-border">
          <RowField<DailySummaryValues>
            name="dayEndDate"
            label="Day End Date"
            type="date"
            className="border-0 shadow-none"
          />
          <RowField<DailySummaryValues>
            name="dayEndTime"
            label="Day End Time (AM/PM)"
            type="time"
            className="border-0 shadow-none"
          />
          <RowField<DailySummaryValues>
            name="shiftNumber"
            label="Shift Number"
            inputMode="numeric"
            autoComplete="off"
            className="border-0 shadow-none"
          />
          {needsChangeReason ? (
            <RowField<DailySummaryValues>
              name="shiftChangeReason"
              label="Reason for Change"
              autoComplete="off"
              className="border-0 shadow-none"
            />
          ) : null}
          {DAILY_SUMMARY_AMOUNT_FIELDS.map(({ name, label }) => (
            <RowField<DailySummaryValues>
              key={name}
              name={name}
              label={label}
              highlighted={name === 'totalSales'}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              className="border-0 shadow-none"
            />
          ))}
        </div>
      </form>
    </Form>
  );
}
