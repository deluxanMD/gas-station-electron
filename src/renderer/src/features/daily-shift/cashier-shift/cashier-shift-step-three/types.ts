import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { cashCloseSchema } from './schema';

// Amounts stay as the text the cashier typed; they become cents on submit.
export type CashCloseValues = z.infer<typeof cashCloseSchema>;
export type PayoutRowValues = CashCloseValues['payouts'][number];

export type CashCloseAmountField =
  | 'lottoWinner'
  | 'giftCertificates'
  | 'redemptions'
  | 'safedrops'
  | 'cashOnHand';

export interface CashCloseProps {
  formId: string;
  onNext: () => void;
}

export interface UseCashCloseFormOptions {
  onNext: () => void;
}

export interface UseCashCloseFormReturn {
  form: UseFormReturn<CashCloseValues>;
  handleSubmit: ReturnType<UseFormReturn<CashCloseValues>['handleSubmit']>;
  totalPayoutsCents: number;
  // Card sales differ from the Credit Totals entered in step 1: alert Manager.
  posMismatch: boolean;
}
