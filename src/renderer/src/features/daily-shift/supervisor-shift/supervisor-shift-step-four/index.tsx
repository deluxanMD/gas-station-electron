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
import { DIP_PRODUCTS } from './constants';
import { useFuelDipsForm } from './hooks';
import type { FuelDipsProps, FuelDipsValues } from './types';

const ROW_CLASS =
  'grid grid-cols-[1fr_1.5fr_1.5fr] items-start gap-2 px-2 py-2';

export function FuelDips({ formId, onNext }: FuelDipsProps): JSX.Element {
  const { form, handleSubmit } = useFuelDipsForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-2xl space-y-4"
      >
        <div className="overflow-hidden rounded-md border border-border">
          <RowField<FuelDipsValues>
            name="date"
            label="Date"
            type="date"
            className="border-0 shadow-none"
          />
          <RowField<FuelDipsValues>
            name="time"
            label="Time"
            type="time"
            className="border-0 shadow-none"
          />
        </div>

        <div className="overflow-hidden rounded-md border border-border">
          <div className={`${ROW_CLASS} bg-muted font-medium`}>
            <span className="px-2 py-1">Product</span>
            <span className="px-2 py-1">TC Volume</span>
            <span className="px-2 py-1">90% Ullage</span>
          </div>
          {DIP_PRODUCTS.map((product, index) => (
            <div
              key={product}
              className={`${ROW_CLASS} border-t border-border`}
            >
              <span className="px-2 py-2 font-medium">{product}</span>
              <FormField
                control={form.control}
                name={`products.${index}.tcVolume`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`${product} TC volume`}
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
              <FormField
                control={form.control}
                name={`products.${index}.ullage90`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`${product} 90% ullage`}
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
        </div>
      </form>
    </Form>
  );
}
