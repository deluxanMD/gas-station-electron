import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  EMPTY_LOTTO_REPORTS,
  LOTTO_COLUMNS,
  LOTTO_INPUT_ROWS,
} from './constants';
import { lottoReportsSchema } from './schema';
import type {
  LottoCalculated,
  LottoReportsValues,
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

  const rows = useWatch({ control: form.control, name: 'rows' });

  const calculated = {
    yesterday: calculateColumn(columnInputs(rows, 'yesterday')),
    fullDay: calculateColumn(columnInputs(rows, 'fullDay')),
    dayEnd: calculateColumn(columnInputs(rows, 'dayEnd')),
  };

  // Until the previous day's slip is stored, it counts as nothing sold.
  const previousDay = calculateColumn(ZERO_INPUTS);

  // Net = today's day-end slip less the previous day's.
  const net = Object.fromEntries(
    Object.entries(calculated.dayEnd).map(([key, cents]) => [
      key,
      cents - previousDay[key as keyof LottoCalculated],
    ]),
  ) as LottoCalculated;

  const handleSubmit = form.handleSubmit((values) => {
    const columns = {
      yesterday: columnInputs(values.rows, 'yesterday'),
      fullDay: columnInputs(values.rows, 'fullDay'),
      dayEnd: columnInputs(values.rows, 'dayEnd'),
    };
    setLottoReports({
      dates: values.dates,
      reportTimes: values.reportTimes,
      columns,
      netTerminalCents: net.netTerminal,
      netOnlineCents: net.netOnline,
      cashRedemCents:
        net.onlineCashRedem + net.sportsCashRedem + net.instantCashRedem,
      activationsCents: net.activations,
    });
    onNext();
  });

  return { form, handleSubmit, calculated, previousDay, net };
}
