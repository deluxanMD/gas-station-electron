import type { ConsolidatedSection } from './types';

export const CONSOLIDATED_SECTIONS: readonly ConsolidatedSection[] = [
  {
    title: 'Credit Totals',
    rows: [
      { key: 'creditTerminal', label: 'Credit Totals - Terminal' },
      { key: 'creditHost', label: 'Credit Totals - Host' },
      { key: 'debitTerminal', label: 'Debit - Terminal' },
      { key: 'fleet', label: 'Fleet' },
      { key: 'svRedemption', label: 'SV Redemption' },
    ],
  },
  {
    title: 'Daily Summary',
    rows: [
      { key: 'fuelSales', label: 'Fuel Sales' },
      { key: 'itemSales', label: 'Item Sales' },
      { key: 'gst', label: 'GST' },
      { key: 'hst', label: 'HST' },
      { key: 'pennyRounding', label: 'Penny Rounding' },
      { key: 'totalSales', label: 'Total Sales' },
    ],
  },
  {
    title: 'Payouts and Cash',
    rows: [
      { key: 'totalPos', label: 'Total POS (Card Sales)' },
      { key: 'totalPayouts', label: 'Total Payouts' },
      { key: 'lottoWinner', label: 'Lotto Winner' },
      { key: 'giftCertificates', label: 'Gift Certificates/Misc.' },
      { key: 'redemptions', label: 'Redemptions' },
      { key: 'safedrops', label: 'Safedrops' },
      { key: 'cashOnHand', label: 'Cash on Hand' },
    ],
  },
];
