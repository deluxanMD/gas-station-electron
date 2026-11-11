import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { fuelSchema } from './schema';

// Numbers stay as the text the user typed; they become fixed-point on submit.
export type FuelValues = z.infer<typeof fuelSchema>;

export interface FuelEntryProps {
  formId: string;
  onNext: () => void;
}

export interface UseFuelEntryFormOptions {
  onNext: () => void;
}

export interface UseFuelEntryFormReturn {
  form: UseFormReturn<FuelValues>;
  handleSubmit: ReturnType<UseFormReturn<FuelValues>['handleSubmit']>;
}
