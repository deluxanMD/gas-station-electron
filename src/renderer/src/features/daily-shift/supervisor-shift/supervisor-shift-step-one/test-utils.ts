import { vi } from 'vitest';
import type { ConsolidatedShifts, ShiftWithUser } from '@/features/shift/types';

export const TODAY_SHIFTS: ShiftWithUser[] = [
  {
    id: 11,
    userId: 3,
    userName: 'cashier1',
    startTime: '2026-11-09T08:00:00.000Z',
    endTime: '2026-11-09T16:00:00.000Z',
  },
  {
    id: 12,
    userId: 4,
    userName: 'cashier2',
    startTime: '2026-11-09T16:00:00.000Z',
    endTime: null,
  },
];

export const CONSOLIDATED: ConsolidatedShifts = {
  shiftIds: [11, 12],
  incompleteShiftIds: [],
  creditTotals: {
    creditTerminalCents: 1000,
    creditTotalCents: 1000,
    debitTerminalCents: 200,
    fleetCents: 0,
    svRedemptionCents: 50,
  },
  dailySummary: {
    fuelSalesCents: 6000,
    itemSalesCents: 3000,
    gstCents: 1000,
    hstCents: 0,
    pennyRoundingCents: -2,
    totalSalesCents: 9998,
  },
  payoutsAndCash: {
    totalPosCents: 1000,
    totalPayoutsCents: 725,
    lottoWinnerCents: 500,
    giftCertificatesCents: 0,
    redemptionsCents: 0,
    safedropsCents: 2000,
    cashOnHandCents: 5773,
  },
};

interface ShiftApiStub {
  shifts?: Response;
  consolidated?: Response;
  fuel?: Response;
  fuelDelivery?: Response;
}

// Answers the shift list, the Review call, the fuel saves and the close; anything else fails the test.
export function stubShiftApi({
  shifts = Response.json({ data: TODAY_SHIFTS }),
  consolidated = Response.json({ data: CONSOLIDATED }),
  fuel = Response.json({ data: { id: 1 } }, { status: 201 }),
  fuelDelivery = Response.json({ data: { id: 1 } }, { status: 201 }),
}: ShiftApiStub = {}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) => {
    if (url.endsWith('/shifts/consolidated')) {
      return Promise.resolve(consolidated.clone());
    }
    if (/\/shifts\/\d+\/close$/.test(url)) {
      return Promise.resolve(Response.json({ data: {} }));
    }
    if (url.endsWith('/fuel-deliveries')) {
      return Promise.resolve(fuelDelivery.clone());
    }
    if (url.endsWith('/fuel')) return Promise.resolve(fuel.clone());
    return /\/shifts\?role=CASHIER$/.test(url)
      ? Promise.resolve(shifts.clone())
      : Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}
