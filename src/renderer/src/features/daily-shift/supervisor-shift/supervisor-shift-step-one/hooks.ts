import { useEffect, useState, type FormEvent } from 'react';
import { UserRole } from '@/features/auth/constants';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import {
  fetchConsolidatedShifts,
  fetchShiftsToday,
} from '@/features/shift/api';
import type {
  ReviewStatus,
  TodayShifts,
  UseReviewShiftsOptions,
  UseReviewShiftsReturn,
  UseTodayShiftsReturn,
} from './types';

function isSameSelection(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

// Loads today's cashier shifts; `retry` reloads after a failure.
export function useTodayShifts(): UseTodayShiftsReturn {
  const [today, setToday] = useState<TodayShifts>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const shifts = await fetchShiftsToday(UserRole.Cashier);
        if (!cancelled) setToday({ status: 'ready', shifts });
      } catch (error) {
        if (cancelled) return;
        setToday({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to load the shifts.',
        });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = (): void => {
    setToday({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  return { today, retry };
}

export function useReviewShifts({
  onNext,
}: UseReviewShiftsOptions): UseReviewShiftsReturn {
  const { today, retry } = useTodayShifts();
  const reviewedIds = useSupervisorShiftStore((s) => s.selectedShiftIds);
  const stored = useSupervisorShiftStore((s) => s.consolidated);
  const setSelectedShiftIds = useSupervisorShiftStore(
    (s) => s.setSelectedShiftIds,
  );
  const setConsolidated = useSupervisorShiftStore((s) => s.setConsolidated);
  const [checkedIds, setCheckedIds] = useState<string[]>(reviewedIds);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>({
    status: 'idle',
  });

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
        const result = await fetchConsolidatedShifts(checkedIds.map(Number));
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
    // TEMP: validation disabled so the flow can be walked through. Restore:
    // if (!consolidated) {
    //   setReviewStatus({
    //     status: 'error',
    //     message: 'Select the shifts for the day and click Review before Next.',
    //   });
    //   return;
    // }
    onNext();
  };

  return {
    today,
    retry,
    checkedIds,
    toggleShift,
    review,
    reviewStatus,
    consolidated,
    handleSubmit,
  };
}
