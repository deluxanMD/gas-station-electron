import { useState, type FormEvent } from 'react';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { fetchConsolidatedShifts } from '@/features/shift/api';
import type {
  ReviewStatus,
  UseReviewCashierReportsOptions,
  UseReviewCashierReportsReturn,
} from './types';

function isSameSelection(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function useReviewCashierReports({
  onNext,
  shifts,
}: UseReviewCashierReportsOptions): UseReviewCashierReportsReturn {
  const reviewedIds = useManagerShiftStore((s) => s.selectedShiftIds);
  const stored = useManagerShiftStore((s) => s.consolidated);
  const setSelectedShiftIds = useManagerShiftStore(
    (s) => s.setSelectedShiftIds,
  );
  const setConsolidated = useManagerShiftStore((s) => s.setConsolidated);
  const [checkedIds, setCheckedIds] = useState<string[]>(reviewedIds);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>({
    status: 'idle',
  });

  // Values for a different selection than the one reviewed are stale.
  const consolidated =
    stored && isSameSelection(checkedIds, reviewedIds) ? stored : null;

  const toggleShift = (id: string): void => {
    setReviewStatus({ status: 'idle' });
    setCheckedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const review = (): void => {
    if (reviewStatus.status === 'loading') return;
    setReviewStatus({ status: 'loading' });
    const load = async (): Promise<void> => {
      try {
        const result = await fetchConsolidatedShifts(
          shifts.filter((shift) => checkedIds.includes(shift.key)),
        );
        setSelectedShiftIds(checkedIds);
        setConsolidated(result);
        setReviewStatus({ status: 'idle' });
      } catch (error) {
        setReviewStatus({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to load the consolidated values.',
        });
      }
    };
    void load();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // Like the supervisor's Review Shifts, Review is not required before Next
    // so the flow can be walked through.
    onNext();
  };

  return {
    checkedIds,
    toggleShift,
    review,
    reviewStatus,
    consolidated,
    handleSubmit,
  };
}
