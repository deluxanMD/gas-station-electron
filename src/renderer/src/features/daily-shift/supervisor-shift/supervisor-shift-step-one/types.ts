import type { FormEvent } from 'react';
import type { ClosedShift } from '@/features/daily-shift/supervisor-shift/types';

export interface ReviewShiftsProps {
  formId: string;
  onNext: () => void;
}

export type ConsolidatedKey =
  | 'creditTerminal'
  | 'creditHost'
  | 'debitTerminal'
  | 'fleet'
  | 'svRedemption'
  | 'fuelSales'
  | 'itemSales'
  | 'gst'
  | 'hst'
  | 'pennyRounding'
  | 'totalSales'
  | 'totalPos'
  | 'totalPayouts'
  | 'lottoWinner'
  | 'giftCertificates'
  | 'redemptions'
  | 'safedrops'
  | 'cashOnHand';

// Cents summed across the selected shifts.
export type ConsolidatedTotals = Record<ConsolidatedKey, number>;

export interface ConsolidatedSection {
  title: string;
  rows: readonly { key: ConsolidatedKey; label: string }[];
}

export interface UseReviewShiftsOptions {
  onNext: () => void;
}

export interface UseReviewShiftsReturn {
  shifts: ClosedShift[];
  checkedIds: string[];
  toggleShift: (id: string) => void;
  review: () => void;
  // The consolidated values, once Review has been clicked for this selection.
  totals: ConsolidatedTotals | null;
  // Shifts whose Total POS differs from their step 1 Credit Totals.
  posMismatchCount: number;
  error: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
