import type {
  LossAttributionOption,
  LottoReconciliationValues,
  ReconciliationRow,
} from './types';

// Rows in sketch order. `value` rows are calculated; `input` rows are typed.
export const RECONCILIATION_ROWS: readonly ReconciliationRow[] = [
  { kind: 'value', key: 'instant', label: 'Instant' },
  { kind: 'value', key: 'online', label: 'Online' },
  { kind: 'value', key: 'total', label: 'Total' },
  { kind: 'input', key: 'bullock', label: 'Bullock' },
  { kind: 'value', key: 'olgPayout', label: 'OLG Payout', gapBefore: true },
  { kind: 'input', key: 'bullPayouts', label: 'Bull-Payouts' },
  { kind: 'input', key: 'bullLottoWinner', label: 'Bull-LottoWinner' },
  { kind: 'value', key: 'lottoNet', label: 'Lotto Net', gapBefore: true },
  { kind: 'value', key: 'redemNet', label: 'Redem Net' },
  { kind: 'value', key: 'net', label: 'Net' },
  { kind: 'value', key: 'activationsOlg', label: 'Activations OLG' },
  { kind: 'value', key: 'activationsShift', label: 'Activations Shift' },
  { kind: 'value', key: 'bottomNet', label: 'Net', gapBefore: true },
];

export const LOSS_ATTRIBUTION_OPTIONS: readonly LossAttributionOption[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'previous-day', label: 'Previous Day' },
  { value: 'next-day', label: 'Next Day' },
];

export const ATTRIBUTION_SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export const EMPTY_LOTTO_RECONCILIATION: LottoReconciliationValues = {
  bullock: '',
  bullPayouts: '',
  bullLottoWinner: '',
  cashNet: '0.00',
  attribution: '',
};
