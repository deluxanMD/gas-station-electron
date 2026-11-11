import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { fuelDipsSchema } from './schema';

// Numbers stay as the text the user typed; they become fixed-point on submit.
export type FuelDipsValues = z.infer<typeof fuelDipsSchema>;

export interface FuelDipsProps {
  formId: string;
  onNext: () => void;
}

export interface UseFuelDipsFormOptions {
  onNext: () => void;
}

export interface UseFuelDipsFormReturn {
  form: UseFormReturn<FuelDipsValues>;
  handleSubmit: ReturnType<UseFormReturn<FuelDipsValues>['handleSubmit']>;
}
