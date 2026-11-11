import type { JSX } from 'react';
import { RowField } from '@/components/row-field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { formatCentsAsAmount } from '@/lib/money';
import {
  ATTRIBUTION_SELECT_CLASS,
  LOSS_ATTRIBUTION_OPTIONS,
  RECONCILIATION_ROWS,
} from './constants';
import { useLottoReconciliationForm } from './hooks';
import type {
  LottoReconciliationProps,
  LottoReconciliationValues,
} from './types';

const VALUE_ROW =
  'grid grid-cols-[1fr_2fr] border-b border-border px-4 py-3 last:border-b-0';

export function LottoReconciliation({
  formId,
  onNext,
}: LottoReconciliationProps): JSX.Element {
  const { form, handleSubmit, figures, needsAttribution } =
    useLottoReconciliationForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-2xl space-y-6"
      >
        <div className="overflow-hidden rounded-md border border-border">
          {RECONCILIATION_ROWS.map((row) =>
            row.kind === 'input' ? (
              <RowField<LottoReconciliationValues>
                key={row.key}
                name={row.key}
                label={row.label}
                inputMode="decimal"
                placeholder="0.00"
                autoComplete="off"
                className="border-0 shadow-none"
              />
            ) : (
              <div
                key={`${row.key}-${row.label}`}
                className={`${VALUE_ROW} ${row.gapBefore ? 'border-t-4' : ''}`}
              >
                <span>{row.label}</span>
                <span className="tabular-nums" data-testid={`rec-${row.key}`}>
                  {formatCentsAsAmount(figures.values[row.key])}
                </span>
              </div>
            ),
          )}
        </div>

        <div className="space-y-2">
          <FormField
            control={form.control}
            name="attribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Attribute Losses to Employee/Previous Day/Next Day
                </FormLabel>
                <FormControl>
                  <select className={ATTRIBUTION_SELECT_CLASS} {...field}>
                    <option value="">Not attributed yet</option>
                    {LOSS_ATTRIBUTION_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormControl>
              </FormItem>
            )}
          />
          {needsAttribution ? (
            <p role="alert" className="text-sm text-destructive">
              Over/Short is not attributed. You can continue, but it will be
              flagged on the dashboard and must be attributed within 3 days.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <p className="bg-muted px-4 py-2 font-medium">Summary</p>
          <div className={VALUE_ROW}>
            <span>Lotto Net</span>
            <span className="tabular-nums" data-testid="summary-lottoNet">
              {formatCentsAsAmount(figures.values.lottoNet)}
            </span>
          </div>
          <div className={VALUE_ROW}>
            <span>Redeem Net</span>
            <span className="tabular-nums" data-testid="summary-redemNet">
              {formatCentsAsAmount(figures.values.redemNet)}
            </span>
          </div>
          <div className={VALUE_ROW}>
            <span>Activations Net</span>
            <span className="tabular-nums" data-testid="summary-activationsNet">
              {formatCentsAsAmount(figures.activationsNet)}
            </span>
          </div>
          <RowField<LottoReconciliationValues>
            name="cashNet"
            label="Cash Net"
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            className="border-0 shadow-none"
          />
          <div className={`${VALUE_ROW} bg-primary/10 font-bold`}>
            <span>Total</span>
            <span className="tabular-nums" data-testid="summary-total">
              {formatCentsAsAmount(figures.summaryTotal)}
            </span>
          </div>
        </div>
      </form>
    </Form>
  );
}
