import type { CreditTotalsValues } from './types';

export const CREDIT_TOTALS_FIELDS: readonly {
  name: keyof CreditTotalsValues;
  label: string;
}[] = [
  { name: 'creditTerminal', label: 'Credit Totals - Terminal' },
  { name: 'creditHost', label: 'Credit Totals - Host' },
  { name: 'debitTerminal', label: 'Debit - Terminal' },
  { name: 'fleet', label: 'Fleet' },
  { name: 'svRedemption', label: 'SV Redemption' },
];

export const EMPTY_CREDIT_TOTALS: CreditTotalsValues = {
  creditTerminal: '',
  creditHost: '',
  debitTerminal: '',
  fleet: '',
  svRedemption: '',
};
