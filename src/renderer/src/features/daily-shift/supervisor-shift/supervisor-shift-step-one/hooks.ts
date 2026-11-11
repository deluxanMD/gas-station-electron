import { useState, type FormEvent } from 'react';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import type { ClosedShift } from '@/features/daily-shift/supervisor-shift/types';
import type {
  ConsolidatedTotals,
  UseReviewShiftsOptions,
  UseReviewShiftsReturn,
} from './types';

// Until the API stores closed shifts, the only one available is the shift the
// cashier just completed in this session.
export function useClosedShifts(): ClosedShift[] {
  const creditTotals = useCashierShiftStore((s) => s.creditTotals);
  const dailySummary = useCashierShiftStore((s) => s.dailySummary);
  const cashClose = useCashierShiftStore((s) => s.cashClose);

  if (!creditTotals || !dailySummary || !cashClose) return [];
  return [
    {
      id: `${dailySummary.dayEndDate}-${dailySummary.shiftNumber}`,
      shiftNumber: dailySummary.shiftNumber,
      dayEndDate: dailySummary.dayEndDate,
      dayEndTime: dailySummary.dayEndTime,
      creditTotals,
      dailySummary,
      cashClose,
    },
  ];
}

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

function isSameSelection(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function useReviewShifts({
  onNext,
}: UseReviewShiftsOptions): UseReviewShiftsReturn {
  const shifts = useClosedShifts();
  const reviewedIds = useSupervisorShiftStore((s) => s.selectedShiftIds);
  const setSelectedShiftIds = useSupervisorShiftStore(
    (s) => s.setSelectedShiftIds,
  );
  const [checkedIds, setCheckedIds] = useState<string[]>(reviewedIds);
  const [error, setError] = useState<string | null>(null);

  const reviewed =
    reviewedIds.length > 0 && isSameSelection(checkedIds, reviewedIds);
  const reviewedShifts = reviewed
    ? shifts.filter((shift) => reviewedIds.includes(shift.id))
    : [];

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
    // if (!reviewed) {
    //   setError('Select the shifts for the day and click Review before Next.');
    //   return;
    // }
    onNext();
  };

  return {
    shifts,
    checkedIds,
    toggleShift,
    review,
    totals: reviewed ? consolidateShifts(reviewedShifts) : null,
    posMismatchCount: reviewedShifts.filter(
      (shift) => shift.cashClose.posMismatch,
    ).length,
    error,
    handleSubmit,
  };
}
