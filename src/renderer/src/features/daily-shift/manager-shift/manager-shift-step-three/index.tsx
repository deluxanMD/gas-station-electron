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
import { SCRATCH_DENOMINATIONS } from './constants';
import { useScratchTicketsForm } from './hooks';
import type { InstantScratchTicketsProps, ScratchTicketsValues } from './types';

const ROW_CLASS =
  'grid grid-cols-[0.8fr_1fr_1fr_1fr_0.8fr_1fr] items-start gap-2 px-2 py-2';

export function InstantScratchTickets({
  formId,
  onNext,
}: InstantScratchTicketsProps): JSX.Element {
  const { form, handleSubmit, calculations, totalAmountCents } =
    useScratchTicketsForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-3xl space-y-4"
      >
        <div className="overflow-hidden rounded-md border border-border">
          <RowField<ScratchTicketsValues>
            name="shiftNumber"
            label="Shift #"
            inputMode="numeric"
            autoComplete="off"
            className="border-0 shadow-none"
          />
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <p className="bg-muted px-4 py-2 text-center font-bold">
            From Shift Sheet
          </p>
          <div className={`${ROW_CLASS} border-t border-border font-medium`}>
            <span />
            <span className="px-2 py-1">Open</span>
            <span className="px-2 py-1">Close</span>
            <span className="px-2 py-1">Activations</span>
            <span className="px-2 py-1">Sold</span>
            <span className="px-2 py-1">Amount</span>
          </div>
          {SCRATCH_DENOMINATIONS.map((denomination, index) => (
            <div
              key={denomination}
              className={`${ROW_CLASS} border-t border-border`}
            >
              <span className="px-2 py-2 text-right font-medium">
                ${denomination}
              </span>
              {(['open', 'close', 'activations'] as const).map((column) => (
                <FormField
                  key={column}
                  control={form.control}
                  name={`rows.${index}.${column}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          aria-label={`$${denomination} ${column}`}
                          inputMode="numeric"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <span className="px-2 py-2" data-testid={`sold-${denomination}`}>
                {calculations[index].soldCount}
              </span>
              <span
                className="px-2 py-2"
                data-testid={`amount-${denomination}`}
              >
                {formatCentsAsAmount(calculations[index].amountCents)}
              </span>
            </div>
          ))}
          <div
            className={`${ROW_CLASS} border-t border-border bg-primary/10 font-bold`}
          >
            <span className="col-span-4" />
            <span className="px-2 py-2">Total</span>
            <span className="px-2 py-2" data-testid="total-amount">
              {formatCentsAsAmount(totalAmountCents)}
            </span>
          </div>
        </div>
      </form>
    </Form>
  );
}
