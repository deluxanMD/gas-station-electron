import type { FormEvent } from 'react';
import type { ConsolidatedShifts, ShiftWithUser } from '@/features/shift/types';

export interface ReviewShiftsProps {
  formId: string;
  onNext: () => void;
}

// Today's cashier shifts as the API reports them.
export type TodayShifts =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; shifts: ShiftWithUser[] };

export type ReviewStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

export interface UseReviewShiftsOptions {
  onNext: () => void;
}

export interface UseTodayShiftsReturn {
  today: TodayShifts;
  retry: () => void;
}

export interface UseReviewShiftsReturn extends UseTodayShiftsReturn {
  checkedIds: string[];
  toggleShift: (id: string) => void;
  review: () => void;
  reviewStatus: ReviewStatus;
  consolidated: ConsolidatedShifts | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
