import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import {
  buildSubmission,
  saveCashierShift,
  SaveShiftError,
} from '@/features/daily-shift/cashier-shift/api';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { endShift, useOpenShift } from '@/features/shift/hooks';
import {
  formatCentsAsAmount,
  isValidAmount,
  parseAmountToCents,
} from '@/lib/money';
import { EMPTY_CASH_CLOSE } from './constants';
import { cashCloseSchema } from './schema';
import type {
  CashCloseValues,
  UseCashCloseFormOptions,
  UseCashCloseFormReturn,
} from './types';

function toCents(value: string): number {
  const trimmed = value.trim();
  return isValidAmount(trimmed) ? parseAmountToCents(trimmed) : 0;
}

export function useCashCloseForm({
  onNext,
}: UseCashCloseFormOptions): UseCashCloseFormReturn {
  const saved = useCashierShiftStore((s) => s.cashClose);
  const setCashClose = useCashierShiftStore((s) => s.setCashClose);
  const creditTotals = useCashierShiftStore((s) => s.creditTotals);
  const dailySummary = useCashierShiftStore((s) => s.dailySummary);

  const defaultValues: CashCloseValues = saved
    ? {
        totalPos: formatCentsAsAmount(saved.totalPosCents),
        payouts: EMPTY_CASH_CLOSE.payouts.map((empty, index) => {
          const entry = saved.payouts[index];
          return entry
            ? {
                description: entry.description,
                type: entry.type,
                amount: formatCentsAsAmount(entry.amountCents),
              }
            : empty;
        }),
        lottoWinner: formatCentsAsAmount(saved.lottoWinnerCents),
        giftCertificates: formatCentsAsAmount(saved.giftCertificatesCents),
        redemptions: formatCentsAsAmount(saved.redemptionsCents),
        safedrops: formatCentsAsAmount(saved.safedropsCents),
        cashOnHand: formatCentsAsAmount(saved.cashOnHandCents),
      }
    : EMPTY_CASH_CLOSE;

  const shift = useOpenShift();
  const savedTables = useCashierShiftStore((s) => s.savedTables);
  const resetShift = useCashierShiftStore((s) => s.resetShift);
  const setSaving = useCashierShiftStore((s) => s.setSaving);
  const setSavedTables = useCashierShiftStore((s) => s.setSavedTables);

  const form = useForm<CashCloseValues>({
    resolver: zodResolver(cashCloseSchema),
    defaultValues,
  });

  const payouts = useWatch({ control: form.control, name: 'payouts' });
  const totalPos = useWatch({ control: form.control, name: 'totalPos' });

  const totalPayoutsCents = payouts.reduce(
    (sum, row) => sum + toCents(row.amount),
    0,
  );

  const posIsEntered = isValidAmount(totalPos.trim());
  const posMismatch =
    posIsEntered &&
    creditTotals !== null &&
    (toCents(totalPos) !== creditTotals.creditHostCents ||
      toCents(totalPos) !== creditTotals.creditTerminalCents);

  const handleSubmit = form.handleSubmit(async (values) => {
    // A second click while the first save is in flight must not double-post.
    if (useCashierShiftStore.getState().saving) return;
    const totalPosCents = parseAmountToCents(values.totalPos);
    const payoutEntries = values.payouts.flatMap((row) =>
      row.type === ''
        ? []
        : [
            {
              description: row.description,
              type: row.type,
              amountCents: parseAmountToCents(row.amount),
            },
          ],
    );
    const payoutsCents = payoutEntries.reduce((s, p) => s + p.amountCents, 0);
    const lottoWinnerCents = parseAmountToCents(values.lottoWinner);
    const giftCertificatesCents = parseAmountToCents(values.giftCertificates);
    const redemptionsCents = parseAmountToCents(values.redemptions);
    const safedropsCents = parseAmountToCents(values.safedrops);
    const cashOnHandCents = parseAmountToCents(values.cashOnHand);

    // Placeholder formula: the spec leaves "expected amount" to per-site
    // configuration, so cash = sales not paid by card, less cash taken out.
    if (dailySummary) {
      const expectedCents =
        dailySummary.totalSalesCents -
        totalPosCents -
        payoutsCents -
        lottoWinnerCents -
        giftCertificatesCents -
        redemptionsCents -
        safedropsCents;
      if (cashOnHandCents !== expectedCents) {
        form.setError('cashOnHand', {
          message: `Cash on Hand does not match the expected ${formatCentsAsAmount(expectedCents)}. Please check the numbers again.`,
        });
        return;
      }
    }

    const cashClose = {
      totalPosCents,
      posMismatch,
      payouts: payoutEntries,
      lottoWinnerCents,
      giftCertificatesCents,
      redemptionsCents,
      safedropsCents,
      cashOnHandCents,
    };
    setCashClose(cashClose);

    // Nothing reaches the database before this point: the three steps only
    // fill the in-memory store.
    if (shift === null || creditTotals === null || dailySummary === null) {
      form.setError('root', {
        message:
          'Shift data is missing. Please start a shift and complete all steps.',
      });
      return;
    }

    setSaving(true);
    try {
      const saved = await saveCashierShift(
        buildSubmission(
          { shiftId: shift.id, userId: shift.userId },
          { creditTotals, dailySummary, cashClose },
        ),
        savedTables,
      );
      // Remember the tables now saved: if closing fails, the retry only closes.
      setSavedTables(saved);
      // The shift ends only after all three tables are saved.
      await endShift(shift.id);
    } catch (error) {
      setSaving(false);
      if (error instanceof SaveShiftError) setSavedTables(error.saved);
      form.setError('root', {
        message:
          error instanceof Error
            ? error.message
            : 'Saving the shift failed. Please try again.',
      });
      return;
    }
    // Saved and closed: clear the in-memory data so the next shift starts empty.
    resetShift();
    onNext();
  });

  return { form, handleSubmit, totalPayoutsCents, posMismatch };
}
