import type {
  CashierShiftSubmission,
  CashCloseData,
  CreditTotalsCents,
  DailySummaryData,
  PayoutType,
} from './types';

const API_VERSION = 'v1';

const ENDPOINTS = {
  shifts: 'shifts',
  creditTotals: 'credit-totals',
  dailySummary: 'daily-summary-reports',
  payouts: 'payouts',
} as const;

const toDollars = (cents: number): number => cents / 100;

function url(path: string): string {
  return `${import.meta.env.RENDERER_VITE_API_BASE_URL}/${API_VERSION}/${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url(path), {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    throw new Error('Unable to reach the server. Please try again.');
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(body.message ?? 'Saving the shift failed.');
  }
  return (await response.json()) as T;
}

// The API keys rows by its numeric user id, which the token does not carry;
// the shift row does.
export async function fetchShiftOwnerId(shiftId: number): Promise<number> {
  const body = await request<{ data: { userId: number } }>(
    `${ENDPOINTS.shifts}/${shiftId}`,
  );
  return body.data.userId;
}

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
  ids: { shiftId: number; userId: number },
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

type Table = keyof CashierShiftSubmission;

// Carries the tables that did save, so the caller can retry only the rest.
export class SaveShiftError extends Error {
  constructor(
    message: string,
    readonly saved: ReadonlySet<Table>,
  ) {
    super(message);
  }
}

const TABLE_ENDPOINT: Record<Table, string> = {
  creditTotals: ENDPOINTS.creditTotals,
  dailySummary: ENDPOINTS.dailySummary,
  payouts: ENDPOINTS.payouts,
};

const post = (table: Table, body: unknown): Promise<unknown> =>
  request(TABLE_ENDPOINT[table], {
    method: 'POST',
    body: JSON.stringify(body),
  });

// Posts the three tables in parallel. `alreadySaved` lets a retry skip the
// tables that went through the first time, so nothing is inserted twice.
// Resolves with every table now saved; throws if any is still missing.
export async function saveCashierShift(
  submission: CashierShiftSubmission,
  alreadySaved: ReadonlySet<Table> = new Set(),
): Promise<Set<Table>> {
  const saved = new Set(alreadySaved);
  const pending = (Object.keys(TABLE_ENDPOINT) as Table[]).filter(
    (table) => !saved.has(table),
  );

  const results = await Promise.allSettled(
    pending.map((table) => post(table, submission[table])),
  );

  let failure: unknown = null;
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') saved.add(pending[i]);
    else failure ??= result.reason;
  }

  if (failure) {
    throw new SaveShiftError(
      failure instanceof Error ? failure.message : 'Saving the shift failed.',
      saved,
    );
  }
  return saved;
}
