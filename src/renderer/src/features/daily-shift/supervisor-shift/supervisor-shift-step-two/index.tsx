import type { JSX } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FUEL_GRADES } from './constants';
import { useFuelEntryForm } from './hooks';
import type { FuelEntryProps } from './types';

const ROW_CLASS =
  'grid grid-cols-[1fr_1.5fr_1.5fr] items-start gap-2 px-2 py-2';

export function FuelEntry({ formId, onNext }: FuelEntryProps): JSX.Element {
  const { form, handleSubmit } = useFuelEntryForm({ onNext });

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={handleSubmit}
        noValidate
        className="max-w-2xl"
      >
        <p className="mb-3 text-base">Enter Fuel Volume and Sales</p>
        <div className="overflow-hidden rounded-md border border-border">
          <div className={`${ROW_CLASS} bg-muted font-medium`}>
            <span className="px-2 py-1">Fuel Type</span>
            <span className="px-2 py-1">Volume</span>
            <span className="px-2 py-1">Total</span>
          </div>
          {FUEL_GRADES.map((grade, index) => (
            <div key={grade} className={`${ROW_CLASS} border-t border-border`}>
              <span className="px-2 py-2 font-medium">{grade}</span>
              <FormField
                control={form.control}
                name={`grades.${index}.volume`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`${grade} volume`}
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
                name={`grades.${index}.total`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`${grade} total`}
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
          <div className={`${ROW_CLASS} border-t border-border bg-primary/10`}>
            <span className="px-2 py-2 font-bold">Total</span>
            <FormField
              control={form.control}
              name="totalVolume"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormControl>
                    <Input
                      aria-label="Total volume"
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
        </div>
      </form>
    </Form>
  );
}
