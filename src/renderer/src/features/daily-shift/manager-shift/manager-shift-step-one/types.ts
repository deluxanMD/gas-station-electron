import type { FormEvent } from 'react';
import type { ConsolidatedShifts } from '@/features/shift/types';

export interface ReviewCashierReportsProps {
  formId: string;
  onNext: () => void;
}

export type ReviewStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

export interface UseReviewCashierReportsOptions {
  onNext: () => void;
}

export interface UseReviewCashierReportsReturn {
  checkedIds: string[];
  toggleShift: (id: string) => void;
  review: () => void;
  reviewStatus: ReviewStatus;
  consolidated: ConsolidatedShifts | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
