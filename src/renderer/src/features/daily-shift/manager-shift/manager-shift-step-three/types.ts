import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { scratchTicketsSchema } from './schema';

// Counts stay as the text the manager typed; they become numbers on submit.
export type ScratchTicketsValues = z.infer<typeof scratchTicketsSchema>;

export interface InstantScratchTicketsProps {
  formId: string;
  onNext: () => void;
}

export interface UseScratchTicketsFormOptions {
  onNext: () => void;
}

// Calculated columns for one denomination.
export interface ScratchTicketCalculation {
  soldCount: number;
  amountCents: number;
}

export interface UseScratchTicketsFormReturn {
  form: UseFormReturn<ScratchTicketsValues>;
  handleSubmit: ReturnType<UseFormReturn<ScratchTicketsValues>['handleSubmit']>;
  calculations: ScratchTicketCalculation[];
  totalAmountCents: number;
}
