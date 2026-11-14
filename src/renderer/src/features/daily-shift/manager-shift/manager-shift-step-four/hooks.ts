import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import type {
  LottoColumn,
  LottoInputRow,
} from '@/features/daily-shift/manager-shift/types';
import {
  formatCentsAsAmount,
  isValidAmount,
  parseAmountToCents,
} from '@/lib/money';
import { fetchLatestLottoDayEnd } from './api';
import {
  EMPTY_LOTTO_REPORTS,
  LOTTO_COLUMNS,
  LOTTO_INPUT_ROWS,
} from './constants';
import { lottoReportsSchema } from './schema';
import type {
  LottoCalculated,
  LottoReportsValues,
  PreviousDayStatus,
  UseLottoReportsFormOptions,
  UseLottoReportsFormReturn,
} from './types';

function toCents(value: string): number {
  const trimmed = value.trim();
  return isValidAmount(trimmed) ? parseAmountToCents(trimmed) : 0;
}

// Subtotal formulas are assumptions: the spec only shows the row names.
export function calculateColumn(
  inputs: Record<LottoInputRow, number>,
): LottoCalculated {
  const netOnline = inputs.onlineNetSales - inputs.onlineCashRedem;
  const netSports =
    inputs.sportsProline +
    inputs.sportsPools -
    inputs.sportsVoids -
    inputs.sportsCashRedem;
  const netGiftCard = inputs.giftSales - inputs.giftVoids - inputs.giftCashOut;
  return {
    ...inputs,
    netOnline,
    netSports,
    netGiftCard,
    totalFreeTickets: inputs.freeOnline + inputs.freeInstant,
    netTerminal: netOnline + netSports + netGiftCard - inputs.instantCashRedem,
  };
}

function columnInputs(
  rows: LottoReportsValues['rows'],
  column: LottoColumn,
): Record<LottoInputRow, number> {
  return Object.fromEntries(
    LOTTO_INPUT_ROWS.map((key) => [key, toCents(rows[key][column])]),
  ) as Record<LottoInputRow, number>;
}

const ZERO_INPUTS = Object.fromEntries(
  LOTTO_INPUT_ROWS.map((key) => [key, 0]),
) as Record<LottoInputRow, number>;

export function useLottoReportsForm({
  onNext,
}: UseLottoReportsFormOptions): UseLottoReportsFormReturn {
  const saved = useManagerShiftStore((s) => s.lottoReports);
  const setLottoReports = useManagerShiftStore((s) => s.setLottoReports);

  const defaultValues: LottoReportsValues = saved
    ? {
        dates: saved.dates,
        reportTimes: saved.reportTimes,
        rows: Object.fromEntries(
          LOTTO_INPUT_ROWS.map((key) => [
            key,
            Object.fromEntries(
              LOTTO_COLUMNS.map(({ id }) => [
                id,
                formatCentsAsAmount(saved.columns[id][key]),
              ]),
            ),
          ]),
        ) as LottoReportsValues['rows'],
      }
    : EMPTY_LOTTO_REPORTS;

  const form = useForm<LottoReportsValues>({
    resolver: zodResolver(lottoReportsSchema),
    defaultValues,
  });

  // Coming back to the step keeps the figures it was saved with; otherwise they
  // are loaded. A failed lookup blocks Next rather than saving a wrong Net.
  const hasSaved = saved !== null;
  const [previousDayStatus, setPreviousDayStatus] = useState<PreviousDayStatus>(
    saved
      ? { status: 'ready', amounts: saved.previousDay }
      : { status: 'loading' },
  );
  const [previousDayError, setPreviousDayError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (hasSaved) return;
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const latest = await fetchLatestLottoDayEnd();
        if (!cancelled) {
          setPreviousDayStatus({
            status: 'ready',
            amounts: latest ? latest.amounts : ZERO_INPUTS,
          });
        }
      } catch (error) {
        if (cancelled) return;
        setPreviousDayStatus({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to load the previous day figures.',
        });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [attempt, hasSaved]);

  const retryPreviousDay = (): void => {
    setPreviousDayError(null);
    setPreviousDayStatus({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  const previousAmounts =
    previousDayStatus.status === 'ready'
      ? previousDayStatus.amounts
      : ZERO_INPUTS;

  const rows = useWatch({ control: form.control, name: 'rows' });

  const calculated = {
    yesterday: calculateColumn(columnInputs(rows, 'yesterday')),
    fullDay: calculateColumn(columnInputs(rows, 'fullDay')),
    dayEnd: calculateColumn(columnInputs(rows, 'dayEnd')),
  };

  const previousDay = calculateColumn(previousAmounts);

  // Net = today's day-end slip less the previous day's.
  const net = Object.fromEntries(
    Object.entries(calculated.dayEnd).map(([key, cents]) => [
      key,
      cents - previousDay[key as keyof LottoCalculated],
    ]),
  ) as LottoCalculated;

  // Nothing is sent to the API here: the values wait in the store until
  // "Post and Close" on the last step saves everything.
  const handleSubmit = form.handleSubmit((values) => {
    if (previousDayStatus.status !== 'ready') {
      setPreviousDayError(
        previousDayStatus.status === 'loading'
          ? 'The previous day figures are still loading.'
          : 'The previous day figures could not be loaded. Retry before continuing.',
      );
      return;
    }
    const columns = {
      yesterday: columnInputs(values.rows, 'yesterday'),
      fullDay: columnInputs(values.rows, 'fullDay'),
      dayEnd: columnInputs(values.rows, 'dayEnd'),
    };
    setPreviousDayError(null);
    setLottoReports({
      dates: values.dates,
      reportTimes: values.reportTimes,
      columns,
      previousDay: previousDayStatus.amounts,
      netTerminalCents: net.netTerminal,
      netOnlineCents: net.netOnline,
      cashRedemCents:
        net.onlineCashRedem + net.sportsCashRedem + net.instantCashRedem,
      activationsCents: net.activations,
    });
    onNext();
  });

  return {
    form,
    handleSubmit,
    calculated,
    previousDay,
    net,
    previousDayStatus,
    retryPreviousDay,
    previousDayError,
  };
}
