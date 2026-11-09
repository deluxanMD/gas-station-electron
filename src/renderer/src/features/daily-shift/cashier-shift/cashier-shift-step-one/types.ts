import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { creditTotalsSchema } from './schema';

// Amounts stay as the text the cashier typed; they become cents on submit.
export type CreditTotalsValues = z.infer<typeof creditTotalsSchema>;

export interface CreditTotalsProps {
  formId: string;
  onNext: () => void;
}

export interface UseCreditTotalsFormOptions {
  onNext: () => void;
}

export interface UseCreditTotalsFormReturn {
  form: UseFormReturn<CreditTotalsValues>;
  handleSubmit: ReturnType<UseFormReturn<CreditTotalsValues>['handleSubmit']>;
}
