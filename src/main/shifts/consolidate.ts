import type { LocalConsolidation, OutboxEntry } from '../../shared/ipc';

const CREDIT_TOTALS = 'credit-totals';
const DAILY_SUMMARY = 'daily-summary';
const PAYOUTS = 'payouts';

// Amounts are saved as dollars, like the API takes them; each is rounded to whole cents before summing, as the server
// does, so a total never drifts by a cent.
function cents(
  payload: Record<string, unknown> | undefined,
  field: string,
): number {
  const value = payload?.[field];
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value * 100)
    : 0;
}

function asRecord(payload: unknown): Record<string, unknown> {
  return typeof payload === 'object' && payload !== null
    ? (payload as Record<string, unknown>)
    : {};
}

/**
 * Sums what the cashiers entered for the given shifts from the records saved on this device, for when the server cannot
 * be asked (or does not have them yet). A shift that lacks any of its three records counts as zero for the missing
 * one and is reported as incomplete, like the server does.
 */
export function consolidate(
  entries: readonly OutboxEntry[],
  clientIds: readonly string[],
): LocalConsolidation {
  // The latest record of each kind per shift; there is only ever one on the server.
  const records = new Map<string, Map<string, Record<string, unknown>>>();
  for (const entry of entries) {
    if (!entry.shiftClientId) continue;
    const forShift =
      records.get(entry.shiftClientId) ??
      new Map<string, Record<string, unknown>>();
    forShift.set(entry.entity, asRecord(entry.payload));
    records.set(entry.shiftClientId, forShift);
  }

  const result: LocalConsolidation = {
    creditTotals: {
      creditTerminalCents: 0,
      creditTotalCents: 0,
      debitTerminalCents: 0,
      fleetCents: 0,
      svRedemptionCents: 0,
    },
    dailySummary: {
      fuelSalesCents: 0,
      itemSalesCents: 0,
      gstCents: 0,
      hstCents: 0,
      pennyRoundingCents: 0,
      totalSalesCents: 0,
    },
    payoutsAndCash: {
      totalPosCents: 0,
      totalPayoutsCents: 0,
      lottoWinnerCents: 0,
      giftCertificatesCents: 0,
      redemptionsCents: 0,
      safedropsCents: 0,
      cashOnHandCents: 0,
    },
    incompleteClientIds: [],
  };

  for (const clientId of new Set(clientIds)) {
    const forShift = records.get(clientId);
    const credit = forShift?.get(CREDIT_TOTALS);
    const summary = forShift?.get(DAILY_SUMMARY);
    const payouts = forShift?.get(PAYOUTS);
    if (!credit || !summary || !payouts)
      result.incompleteClientIds.push(clientId);

    const c = result.creditTotals;
    c.creditTerminalCents += cents(credit, 'creditTerminal');
    c.creditTotalCents += cents(credit, 'creditTotal');
    c.debitTerminalCents += cents(credit, 'debitTerminal');
    c.fleetCents += cents(credit, 'fleet');
    c.svRedemptionCents += cents(credit, 'svRedemption');

    const d = result.dailySummary;
    d.fuelSalesCents += cents(summary, 'fuelSales');
    d.itemSalesCents += cents(summary, 'itemSales');
    d.gstCents += cents(summary, 'gst');
    d.hstCents += cents(summary, 'hst');
    d.pennyRoundingCents += cents(summary, 'pennyRounding');
    d.totalSalesCents += cents(summary, 'totalSales');

    const p = result.payoutsAndCash;
    p.totalPosCents += cents(payouts, 'totalPos');
    p.totalPayoutsCents +=
      cents(payouts, 'lottoPayout') +
      cents(payouts, 'vendorPayout') +
      cents(payouts, 'ownerPayout') +
      cents(payouts, 'miscPayout');
    p.lottoWinnerCents += cents(payouts, 'lottoWinner');
    p.giftCertificatesCents += cents(payouts, 'giftCertificates');
    p.redemptionsCents += cents(payouts, 'redemptions');
    p.safedropsCents += cents(payouts, 'safedrops');
    p.cashOnHandCents += cents(payouts, 'cashOnHand');
  }
  return result;
}
