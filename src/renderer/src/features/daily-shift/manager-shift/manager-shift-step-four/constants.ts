import type {
  LottoColumn,
  LottoInputRow,
} from '@/features/daily-shift/manager-shift/types';
import type {
  LottoColumnConfig,
  LottoReportsValues,
  LottoSection,
} from './types';

export const LOTTO_COLUMNS: readonly LottoColumnConfig[] = [
  {
    id: 'yesterday',
    heading: 'Daily Sales Report (yesterday)',
    shortName: 'Yesterday report',
  },
  {
    id: 'fullDay',
    heading: 'Daily Sales Report for Any Full Day',
    shortName: 'Full day report',
  },
  {
    id: 'dayEnd',
    heading: 'Today Daily Sales (day of day end)',
    shortName: 'Day end',
  },
];

// Rows in sketch order. `input` rows are typed from the slips; `subtotal` rows
// are calculated (see calculateColumn in hooks.ts).
export const LOTTO_SECTIONS: readonly LottoSection[] = [
  {
    title: 'On-Line Products',
    rows: [
      { kind: 'input', key: 'onlineNetSales', label: 'Net Sales' },
      { kind: 'input', key: 'onlineCashRedem', label: 'Cash Redem' },
      { kind: 'subtotal', key: 'netOnline', label: 'Net On-Line' },
    ],
  },
  {
    title: 'Sports',
    rows: [
      { kind: 'input', key: 'sportsProline', label: 'Proline' },
      { kind: 'input', key: 'sportsPools', label: 'Pools' },
      { kind: 'input', key: 'sportsVoids', label: 'Voids' },
      { kind: 'input', key: 'sportsCashRedem', label: 'Cash Redem' },
      { kind: 'subtotal', key: 'netSports', label: 'Net Sports' },
    ],
  },
  {
    title: 'Instant Products',
    rows: [{ kind: 'input', key: 'instantCashRedem', label: 'Cash Redem' }],
  },
  {
    title: 'Gift Card Sales',
    rows: [
      { kind: 'input', key: 'giftSales', label: 'Sales' },
      { kind: 'input', key: 'giftVoids', label: 'Voids' },
      { kind: 'input', key: 'giftCashOut', label: 'CashOut' },
      { kind: 'subtotal', key: 'netGiftCard', label: 'Net Gift Card' },
    ],
  },
  {
    title: 'Promotions',
    rows: [
      { kind: 'input', key: 'decliningBalance', label: 'Declining Balance' },
      { kind: 'input', key: 'declinedOffer', label: 'Declined Offer' },
      {
        kind: 'input',
        key: 'netPromotion',
        label: 'Net Promotion',
        bold: true,
      },
    ],
  },
  {
    title: 'Free Tickets',
    rows: [
      { kind: 'input', key: 'freeOnline', label: 'On-Line' },
      { kind: 'input', key: 'freeInstant', label: 'Instant' },
      {
        kind: 'subtotal',
        key: 'totalFreeTickets',
        label: 'Total Free Tickets',
      },
    ],
  },
  {
    title: 'Terminal',
    rows: [{ kind: 'subtotal', key: 'netTerminal', label: 'Net Terminal' }],
  },
  {
    title: 'Activations',
    rows: [{ kind: 'input', key: 'activations', label: 'Activations' }],
  },
];

export const LOTTO_INPUT_ROWS: readonly LottoInputRow[] =
  LOTTO_SECTIONS.flatMap(({ rows }) =>
    rows.flatMap((row) => (row.kind === 'input' ? [row.key] : [])),
  );

const EMPTY_COLUMN: Record<LottoColumn, string> = {
  yesterday: '',
  fullDay: '',
  dayEnd: '',
};

export const EMPTY_LOTTO_REPORTS: LottoReportsValues = {
  dates: EMPTY_COLUMN,
  reportTimes: EMPTY_COLUMN,
  rows: {
    onlineNetSales: EMPTY_COLUMN,
    onlineCashRedem: EMPTY_COLUMN,
    sportsProline: EMPTY_COLUMN,
    sportsPools: EMPTY_COLUMN,
    sportsVoids: EMPTY_COLUMN,
    sportsCashRedem: EMPTY_COLUMN,
    instantCashRedem: EMPTY_COLUMN,
    giftSales: EMPTY_COLUMN,
    giftVoids: EMPTY_COLUMN,
    giftCashOut: EMPTY_COLUMN,
    decliningBalance: EMPTY_COLUMN,
    declinedOffer: EMPTY_COLUMN,
    netPromotion: EMPTY_COLUMN,
    freeOnline: EMPTY_COLUMN,
    freeInstant: EMPTY_COLUMN,
    activations: EMPTY_COLUMN,
  },
};
