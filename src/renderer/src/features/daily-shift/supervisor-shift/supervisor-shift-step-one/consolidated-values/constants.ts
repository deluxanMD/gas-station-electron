import type { ConsolidatedSectionDefinition } from './types';

export const CONSOLIDATED_SECTIONS: readonly ConsolidatedSectionDefinition[] = [
  {
    title: 'Credit Totals',
    rows: [
      {
        label: 'Credit Totals - Terminal',
        cents: (c) => c.creditTotals.creditTerminalCents,
      },
      {
        label: 'Credit Totals - Host',
        cents: (c) => c.creditTotals.creditTotalCents,
      },
      {
        label: 'Debit - Terminal',
        cents: (c) => c.creditTotals.debitTerminalCents,
      },
      { label: 'Fleet', cents: (c) => c.creditTotals.fleetCents },
      {
        label: 'SV Redemption',
        cents: (c) => c.creditTotals.svRedemptionCents,
      },
    ],
  },
  {
    title: 'Daily Summary',
    rows: [
      { label: 'Fuel Sales', cents: (c) => c.dailySummary.fuelSalesCents },
      { label: 'Item Sales', cents: (c) => c.dailySummary.itemSalesCents },
      { label: 'GST', cents: (c) => c.dailySummary.gstCents },
      { label: 'HST', cents: (c) => c.dailySummary.hstCents },
      {
        label: 'Penny Rounding',
        cents: (c) => c.dailySummary.pennyRoundingCents,
      },
      { label: 'Total Sales', cents: (c) => c.dailySummary.totalSalesCents },
    ],
  },
  {
    title: 'Payouts and Cash',
    rows: [
      {
        label: 'Total POS (Card Sales)',
        cents: (c) => c.payoutsAndCash.totalPosCents,
      },
      {
        label: 'Total Payouts',
        cents: (c) => c.payoutsAndCash.totalPayoutsCents,
      },
      {
        label: 'Lotto Winner',
        cents: (c) => c.payoutsAndCash.lottoWinnerCents,
      },
      {
        label: 'Gift Certificates/Misc.',
        cents: (c) => c.payoutsAndCash.giftCertificatesCents,
      },
      {
        label: 'Redemptions',
        cents: (c) => c.payoutsAndCash.redemptionsCents,
      },
      { label: 'Safedrops', cents: (c) => c.payoutsAndCash.safedropsCents },
      {
        label: 'Cash on Hand',
        cents: (c) => c.payoutsAndCash.cashOnHandCents,
      },
    ],
  },
];
