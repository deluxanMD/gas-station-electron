import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type {
  LottoColumn,
  LottoInputRow,
} from '@/features/daily-shift/manager-shift/types';
import type { lottoReportsSchema } from './schema';

// Amounts stay as the text the manager typed; they become cents on submit.
export type LottoReportsValues = z.infer<typeof lottoReportsSchema>;

export interface LottoReportsProps {
  formId: string;
  onNext: () => void;
}

export interface LottoColumnConfig {
  id: LottoColumn;
  heading: string;
  // Used in input labels, e.g. "Sports Cash Redem - Day end".
  shortName: string;
}

export type LottoSubtotalRow =
  | 'netOnline'
  | 'netSports'
  | 'netGiftCard'
  | 'totalFreeTickets'
  | 'netTerminal';

export type LottoSectionRow =
  | { kind: 'input'; key: LottoInputRow; label: string; bold?: boolean }
  | { kind: 'subtotal'; key: LottoSubtotalRow; label: string };

export interface LottoSection {
  title: string;
  rows: readonly LottoSectionRow[];
}

// Cents for every row of one slip column, typed rows and subtotals alike.
export type LottoCalculated = Record<LottoInputRow | LottoSubtotalRow, number>;

export interface LottoSlipRequest {
  slipType: string;
  // YYYY-MM-DD, null when the slip was not entered.
  reportDate: string | null;
  // HH:mm, null when the slip was not entered.
  reportTime: string | null;
  amounts: Record<LottoInputRow, number>;
}

export interface LottoReportRequest {
  shiftClientId: string;
  userId: number;
  slips: LottoSlipRequest[];
}

export interface LottoDayEndSlip {
  amounts: Record<LottoInputRow, number>;
}

export interface LatestLottoDayEndResponse {
  data: LottoDayEndSlip | null;
}

// The previous day's figures come from the API and cannot be typed.
export type PreviousDayStatus =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; amounts: Record<LottoInputRow, number> };

export interface UseLottoReportsFormOptions {
  onNext: () => void;
}

export interface UseLottoReportsFormReturn {
  form: UseFormReturn<LottoReportsValues>;
  handleSubmit: ReturnType<UseFormReturn<LottoReportsValues>['handleSubmit']>;
  calculated: Record<LottoColumn, LottoCalculated>;
  previousDay: LottoCalculated;
  net: LottoCalculated;
  previousDayStatus: PreviousDayStatus;
  retryPreviousDay: () => void;
  previousDayError: string | null;
}
