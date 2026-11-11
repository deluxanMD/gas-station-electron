import type { FormEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { FuelDeliveryEntry } from '@/features/daily-shift/supervisor-shift/types';
import type { fuelDeliverySchema } from './schema';

// Numbers stay as the text the user typed; they become fixed-point on add.
export type FuelDeliveryValues = z.infer<typeof fuelDeliverySchema>;

export type FuelVolumeField = 'reg' | 'prem' | 'diesel';

export interface FuelDeliveryProps {
  formId: string;
  onNext: () => void;
}

export interface UseFuelDeliveryFormOptions {
  onNext: () => void;
}

export interface UseFuelDeliveryFormReturn {
  form: UseFormReturn<FuelDeliveryValues>;
  deliveries: FuelDeliveryEntry[];
  addDelivery: () => void;
  removeDelivery: (id: string) => void;
  // Set when Next is clicked with a half-entered delivery that was not added.
  error: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
