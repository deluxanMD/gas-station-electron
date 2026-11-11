import type { JSX } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { RowFieldProps } from './types';

// One table-style row: label cell on the left, input cell on the right.
// Stack several inside a bordered container to get a form that reads as a table.
export function RowField<TFieldValues extends FieldValues>({
  name,
  label,
  highlighted = false,
  ...inputProps
}: RowFieldProps<TFieldValues>): JSX.Element {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            'grid grid-cols-[1fr_2fr] gap-0 border-b border-border last:border-b-0',
            highlighted && 'bg-primary/10',
          )}
        >
          <FormLabel
            className={cn(
              'px-4 py-3 text-base font-medium',
              highlighted ? 'bg-primary/15 font-bold' : 'bg-muted',
            )}
          >
            {label}
          </FormLabel>
          <div className="flex flex-col justify-center gap-1 px-3 py-2">
            <FormControl>
              <Input {...inputProps} {...field} />
            </FormControl>
            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
