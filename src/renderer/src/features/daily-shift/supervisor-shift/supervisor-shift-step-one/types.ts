import type { FormEvent } from 'react';
import type { ShiftWithUser } from '@/features/shift/types';

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

export type TodayShifts =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; shifts: ShiftWithUser[] };

export interface UseTodayShiftsReturn {
  today: TodayShifts;
  retry: () => void;
}

export interface UseReviewShiftsReturn extends UseTodayShiftsReturn {
  checkedIds: string[];
  toggleShift: (id: string) => void;
  review: () => void;
  error: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
