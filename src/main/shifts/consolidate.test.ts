import { describe, expect, it } from 'vitest';
import type { OutboxEntry } from '../../shared/ipc';
import { consolidate } from './consolidate';

const A = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';
const B = '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91';

const entry = (
  shiftClientId: string,
  entity: string,
  payload: Record<string, unknown>,
): OutboxEntry => ({
  id: `${shiftClientId}-${entity}`,
  userId: 7,
  shiftClientId,
  entity,
  method: 'POST',
  path: entity,
  payload,
  status: 'pending',
  attempts: 0,
  nextAttemptAt: '2026-01-01T08:00:00.000Z',
  lastError: null,
  createdAt: '2026-01-01T08:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
});

const fullShift = (clientId: string, scale = 1): OutboxEntry[] => [
  entry(clientId, 'credit-totals', {
    creditTerminal: 10.05 * scale,
    creditTotal: 10.05 * scale,
    debitTerminal: 45.25 * scale,
    fleet: 0,
    svRedemption: 5 * scale,
  }),
  entry(clientId, 'daily-summary', {
    fuelSales: 6000 * scale,
    itemSales: 3000 * scale,
    gst: 450 * scale,
    hst: 0,
    pennyRounding: -0.02,
    totalSales: 9449.98 * scale,
  }),
  entry(clientId, 'payouts', {
    totalPos: 1000 * scale,
    lottoPayout: 10 * scale,
    vendorPayout: 72.5 * scale,
    ownerPayout: 20 * scale,
    miscPayout: 20 * scale,
    lottoWinner: 25 * scale,
    giftCertificates: 0,
    redemptions: 0,
    safedrops: 200 * scale,
    cashOnHand: 577.3 * scale,
  }),
];

describe('consolidate', () => {
  it('turns the dollars saved on the device into cents, grouped like the server’s answer', () => {
    const result = consolidate(fullShift(A), [A]);

    expect(result.creditTotals).toEqual({
      creditTerminalCents: 1005,
      creditTotalCents: 1005,
      debitTerminalCents: 4525,
      fleetCents: 0,
      svRedemptionCents: 500,
    });
    expect(result.dailySummary).toMatchObject({
      fuelSalesCents: 600_000,
      pennyRoundingCents: -2,
      totalSalesCents: 944_998,
    });
    expect(result.payoutsAndCash).toEqual({
      totalPosCents: 100_000,
      // Lotto, vendor, owner and misc payouts together.
      totalPayoutsCents: 12_250,
      lottoWinnerCents: 2500,
      giftCertificatesCents: 0,
      redemptionsCents: 0,
      safedropsCents: 20_000,
      cashOnHandCents: 57_730,
    });
    expect(result.incompleteClientIds).toEqual([]);
  });

  it('sums shifts and rounds each amount to cents first so a total never drifts', () => {
    const entries = [
      ...fullShift(A),
      ...fullShift(B),
      // 0.1 + 0.2 is not 0.3 in floating point; in cents it is.
      entry(A, 'credit-totals', { creditTerminal: 0.1 }),
    ];
    const lone = consolidate(
      [
        entry(A, 'credit-totals', { fleet: 0.1 }),
        entry(B, 'credit-totals', { fleet: 0.2 }),
      ],
      [A, B],
    );

    expect(lone.creditTotals.fleetCents).toBe(30);
    expect(consolidate(entries, [A, B]).payoutsAndCash.cashOnHandCents).toBe(
      115_460,
    );
  });

  it('reports a shift that lacks a record as incomplete and counts it as zero', () => {
    const entries = [
      ...fullShift(A),
      entry(B, 'credit-totals', { creditTerminal: 10 }),
    ];

    const result = consolidate(entries, [A, B]);

    expect(result.incompleteClientIds).toEqual([B]);
    expect(result.creditTotals.creditTerminalCents).toBe(1005 + 1000);
    expect(result.payoutsAndCash.cashOnHandCents).toBe(57_730);
  });

  it('reports a shift with nothing saved as incomplete', () => {
    expect(consolidate([], [A])).toMatchObject({ incompleteClientIds: [A] });
  });

  it('counts the latest record of a kind only, and each requested shift once', () => {
    const entries = [
      entry(A, 'credit-totals', { creditTerminal: 1 }),
      entry(A, 'credit-totals', { creditTerminal: 2 }),
    ];

    expect(consolidate(entries, [A, A]).creditTotals.creditTerminalCents).toBe(
      200,
    );
  });

  it('ignores shifts that were not asked for and values that are not numbers', () => {
    const entries = [
      ...fullShift(B),
      entry(A, 'credit-totals', {
        creditTerminal: 'ten',
        creditTotal: Number.NaN,
      }),
    ];

    const result = consolidate(entries, [A]);

    expect(result.creditTotals.creditTerminalCents).toBe(0);
    expect(result.dailySummary.fuelSalesCents).toBe(0);
  });
});
