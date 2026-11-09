import type { JSX } from 'react';
import { RowField } from '@/components/row-field';
import { Form } from '@/components/ui/form';
import { CREDIT_TOTALS_FIELDS } from './constants';
import { useCreditTotalsForm } from './hooks';
import type { CreditTotalsProps, CreditTotalsValues } from './types';

export function CreditTotals({
  formId,
  onNext,
}: CreditTotalsProps): JSX.Element {
  const { form, handleSubmit } = useCreditTotalsForm({ onNext });

  return (
    <Form {...form}>
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <div className="max-w-2xl overflow-hidden rounded-md border border-border">
          {CREDIT_TOTALS_FIELDS.map(({ name, label }) => (
            <RowField<CreditTotalsValues>
              key={name}
              name={name}
              label={label}
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
