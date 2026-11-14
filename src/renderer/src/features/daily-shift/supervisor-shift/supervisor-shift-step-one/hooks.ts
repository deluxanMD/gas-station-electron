import { useEffect, useState, type FormEvent } from 'react';
import { UserRole } from '@/features/auth/constants';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import type { ClosedShift } from '@/features/daily-shift/supervisor-shift/types';
import { fetchShiftsToday } from '@/features/shift/api';
import type {
  ConsolidatedTotals,
  TodayShifts,
  UseReviewShiftsOptions,
  UseReviewShiftsReturn,
  UseTodayShiftsReturn,
} from './types';

export function consolidateShifts(shifts: ClosedShift[]): ConsolidatedTotals {
  const totals: ConsolidatedTotals = {
    creditTerminal: 0,
    creditHost: 0,
    debitTerminal: 0,
    fleet: 0,
    svRedemption: 0,
    fuelSales: 0,
    itemSales: 0,
    gst: 0,
    hst: 0,
    pennyRounding: 0,
    totalSales: 0,
    totalPos: 0,
    totalPayouts: 0,
    lottoWinner: 0,
    giftCertificates: 0,
    redemptions: 0,
    safedrops: 0,
    cashOnHand: 0,
  };
  for (const { creditTotals: c, dailySummary: d, cashClose: k } of shifts) {
    totals.creditTerminal += c.creditTerminalCents;
    totals.creditHost += c.creditHostCents;
    totals.debitTerminal += c.debitTerminalCents;
    totals.fleet += c.fleetCents;
    totals.svRedemption += c.svRedemptionCents;
    totals.fuelSales += d.fuelSalesCents;
    totals.itemSales += d.itemSalesCents;
    totals.gst += d.gstCents;
    totals.hst += d.hstCents;
    totals.pennyRounding += d.pennyRoundingCents;
    totals.totalSales += d.totalSalesCents;
    totals.totalPos += k.totalPosCents;
    totals.totalPayouts += k.payouts.reduce((s, p) => s + p.amountCents, 0);
    totals.lottoWinner += k.lottoWinnerCents;
    totals.giftCertificates += k.giftCertificatesCents;
    totals.redemptions += k.redemptionsCents;
    totals.safedrops += k.safedropsCents;
    totals.cashOnHand += k.cashOnHandCents;
  }
  return totals;
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
  const setSelectedShiftIds = useSupervisorShiftStore(
    (s) => s.setSelectedShiftIds,
  );
  const [checkedIds, setCheckedIds] = useState<string[]>(reviewedIds);
  const [error, setError] = useState<string | null>(null);

  const toggleShift = (id: string): void => {
    setError(null);
    setCheckedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  };

  const review = (): void => {
    setError(null);
    setSelectedShiftIds(checkedIds);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // TEMP: validation disabled so the flow can be walked through. Restore:
    // if (checkedIds.length === 0) {
    //   setError('Select the shifts for the day and click Review before Next.');
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
    error,
    handleSubmit,
  };
}
