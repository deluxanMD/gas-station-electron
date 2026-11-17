import type { ShiftWriteInput } from '@/lib/ipc';
import type {
  CashierShiftSubmission,
  CashCloseData,
  CreditTotalsCents,
  DailySummaryData,
  PayoutType,
} from './types';

const toDollars = (cents: number): number => cents / 100;

const PAYOUT_FIELD: Record<
  PayoutType,
  'lottoPayout' | 'vendorPayout' | 'ownerPayout' | 'miscPayout'
> = {
  'lotto-payout': 'lottoPayout',
  vendor: 'vendorPayout',
  owner: 'ownerPayout',
  misc: 'miscPayout',
};

// Day end date and time are entered in local time; send an absolute instant.
function toEndDate(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

export function buildSubmission(
  ids: { shiftClientId: string; userId: number },
  data: {
    creditTotals: CreditTotalsCents;
    dailySummary: DailySummaryData;
    cashClose: CashCloseData;
  },
): CashierShiftSubmission {
  const { creditTotals: c, dailySummary: d, cashClose: p } = data;

  const payoutTotals = {
    lottoPayout: 0,
    vendorPayout: 0,
    ownerPayout: 0,
    miscPayout: 0,
  };
  for (const entry of p.payouts) {
    payoutTotals[PAYOUT_FIELD[entry.type]] += entry.amountCents;
  }

  return {
    creditTotals: {
      ...ids,
      creditTerminal: toDollars(c.creditTerminalCents),
      creditTotal: toDollars(c.creditHostCents),
      debitTerminal: toDollars(c.debitTerminalCents),
      fleet: toDollars(c.fleetCents),
      svRedemption: toDollars(c.svRedemptionCents),
    },
    dailySummary: {
      ...ids,
      endDate: toEndDate(d.dayEndDate, d.dayEndTime),
      fuelSales: toDollars(d.fuelSalesCents),
      itemSales: toDollars(d.itemSalesCents),
      gst: toDollars(d.gstCents),
      hst: toDollars(d.hstCents),
      pennyRounding: toDollars(d.pennyRoundingCents),
      totalSales: toDollars(d.totalSalesCents),
    },
    payouts: {
      ...ids,
      totalPos: toDollars(p.totalPosCents),
      lottoPayout: toDollars(payoutTotals.lottoPayout),
      vendorPayout: toDollars(payoutTotals.vendorPayout),
      ownerPayout: toDollars(payoutTotals.ownerPayout),
      miscPayout: toDollars(payoutTotals.miscPayout),
      lottoWinner: toDollars(p.lottoWinnerCents),
      giftCertificates: toDollars(p.giftCertificatesCents),
      redemptions: toDollars(p.redemptionsCents),
      safedrops: toDollars(p.safedropsCents),
      cashOnHand: toDollars(p.cashOnHandCents),
    },
  };
}

// The three tables written when the shift is saved, as records for the sync engine to send.
export function buildWrites(
  submission: CashierShiftSubmission,
): ShiftWriteInput[] {
  return [
    {
      entity: 'credit-totals',
      path: 'credit-totals',
      payload: { ...submission.creditTotals },
    },
    {
      entity: 'daily-summary',
      path: 'daily-summary-reports',
      payload: { ...submission.dailySummary },
    },
    { entity: 'payouts', path: 'payouts', payload: { ...submission.payouts } },
  ];
}
