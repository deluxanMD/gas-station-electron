import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { createDailySummarySchema } from './schema';

// Amounts stay as the text the cashier typed; they become cents on submit.
export type DailySummaryValues = z.infer<
  ReturnType<typeof createDailySummarySchema>
>;

export type DailySummaryAmountField =
  'fuelSales' | 'itemSales' | 'gst' | 'hst' | 'pennyRounding' | 'totalSales';

export interface DailySummaryProps {
  formId: string;
  onNext: () => void;
}

export interface UseDailySummaryFormOptions {
  onNext: () => void;
}

export interface UseDailySummaryFormReturn {
  form: UseFormReturn<DailySummaryValues>;
  handleSubmit: ReturnType<UseFormReturn<DailySummaryValues>['handleSubmit']>;
  // True once the shift number differs from the prepopulated one.
  needsChangeReason: boolean;
}
