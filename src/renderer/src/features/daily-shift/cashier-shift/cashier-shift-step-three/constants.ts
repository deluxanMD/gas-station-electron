import type {
  CashCloseAmountField,
  CashCloseValues,
  PayoutRowValues,
} from './types';

export const PAYOUT_TYPES = [
  { value: 'lotto-payout', label: 'Lotto Payout' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'owner', label: 'Owner' },
  { value: 'misc', label: 'Misc.' },
] as const;

export const PAYOUT_TYPE_VALUES = [
  'lotto-payout',
  'vendor',
  'owner',
  'misc',
] as const;

export const PAYOUT_ROW_COUNT = 5;

export const CASH_CLOSE_AMOUNT_FIELDS: readonly {
  name: CashCloseAmountField;
  label: string;
}[] = [
  { name: 'lottoWinner', label: 'Lotto Winner' },
  { name: 'giftCertificates', label: 'Gift Certificates/Misc.' },
  { name: 'redemptions', label: 'Redemptions' },
  { name: 'safedrops', label: 'Safedrops' },
  { name: 'cashOnHand', label: 'Cash on Hand' },
];

export const PAYOUT_SELECT_CLASS =
  'h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

const EMPTY_PAYOUT_ROW: PayoutRowValues = {
  description: '',
  type: '',
  amount: '',
};

export const EMPTY_CASH_CLOSE: CashCloseValues = {
  totalPos: '',
  payouts: Array.from({ length: PAYOUT_ROW_COUNT }, () => EMPTY_PAYOUT_ROW),
  lottoWinner: '',
  giftCertificates: '',
  redemptions: '',
  safedrops: '',
  cashOnHand: '',
};
