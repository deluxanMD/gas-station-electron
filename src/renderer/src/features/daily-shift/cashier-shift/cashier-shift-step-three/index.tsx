import type { JSX } from 'react';
import { RowField } from '@/components/row-field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { formatCentsAsAmount } from '@/lib/money';
import {
  CASH_CLOSE_AMOUNT_FIELDS,
  PAYOUT_SELECT_CLASS,
  PAYOUT_TYPES,
} from './constants';
import { useCashCloseForm } from './hooks';
import type { CashCloseProps, CashCloseValues } from './types';

export function CashClose({ formId, onNext }: CashCloseProps): JSX.Element {
  const { form, handleSubmit, totalPayoutsCents, posMismatch } =
    useCashCloseForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-2xl space-y-6"
      >
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-border">
            <RowField<CashCloseValues>
              name="totalPos"
              label="Total POS (Card Sales)"
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              className="border-0 shadow-none"
            />
          </div>
          {posMismatch ? (
            <p role="alert" className="text-sm text-destructive">
              Total POS does not match the Credit Totals entered in step 1. The
              Manager will be alerted.
            </p>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[2fr_1.5fr_1fr] bg-muted text-base font-medium">
            <span className="px-4 py-3">Payout</span>
            <span className="px-4 py-3">Type</span>
            <span className="px-4 py-3">Amount</span>
          </div>
          {form.getValues('payouts').map((_, index) => (
            <div
              // Fixed-length list of blank rows, so the index is the identity.
              key={index}
              className="grid grid-cols-[2fr_1.5fr_1fr] items-start gap-2 border-t border-border px-2 py-2"
            >
              <FormField
                control={form.control}
                name={`payouts.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`Payout ${index + 1}`}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`payouts.${index}.type`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <select
                        aria-label={`Payout ${index + 1} type`}
                        className={PAYOUT_SELECT_CLASS}
                        {...field}
                      >
                        <option value="">Select…</option>
                        {PAYOUT_TYPES.map(({ value, label }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`payouts.${index}.amount`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`Payout ${index + 1} amount`}
                        inputMode="decimal"
                        placeholder="0.00"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
          <div className="grid grid-cols-[2fr_1.5fr_1fr] border-t border-border bg-muted/50 font-medium">
            <span className="px-4 py-3">Total Payouts</span>
            <span />
            <span className="px-4 py-3" data-testid="total-payouts">
              {formatCentsAsAmount(totalPayoutsCents)}
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          {CASH_CLOSE_AMOUNT_FIELDS.map(({ name, label }) => (
            <RowField<CashCloseValues>
              key={name}
              name={name}
              label={label}
              highlighted={name === 'cashOnHand'}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
              className="border-0 shadow-none"
            />
          ))}
        </div>
        {form.formState.errors.root ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        ) : null}
      </form>
    </Form>
  );
}
