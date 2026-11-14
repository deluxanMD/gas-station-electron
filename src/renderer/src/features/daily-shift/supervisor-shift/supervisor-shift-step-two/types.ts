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

export type FuelRequestGrade =
  'biodiesel' | 'reg87' | 'extra89' | 'supr91' | 'plus93';

// Body of POST /fuel. Volumes are litres and totals dollars, as the API stores.
export interface FuelRequest {
  shiftId: number;
  userId: number;
  biodieselVolume: number;
  biodieselTotal: number;
  reg87Volume: number;
  reg87Total: number;
  extra89Volume: number;
  extra89Total: number;
  supr91Volume: number;
  supr91Total: number;
  plus93Volume: number;
  plus93Total: number;
  totalVolume: number;
}
