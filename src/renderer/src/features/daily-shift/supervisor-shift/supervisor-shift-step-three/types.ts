import type { FormEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
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
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

// Body of POST /fuel-deliveries. Volumes are litres, as the API stores.
export interface FuelDeliveryRequest {
  shiftId: number;
  userId: number;
  deliveryDate: string;
  bolNumber: string;
  reg: number;
  prem: number;
  diesel: number;
  total: number;
}
