import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@/features/auth/constants';
import { useAuthStore } from '@/features/auth/auth-store';
import type { LocalConsolidation, LocalShiftWithUser } from '@/lib/ipc';
import { useStaleStore } from '@/lib/stale-store';
import { fetchConsolidatedShifts, fetchShiftsToday } from './api';
import type { ReviewShift } from './types';

const A = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';
const B = '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

const server = (over: Record<string, unknown>): Record<string, unknown> => ({
  id: 11,
  clientId: null,
  userId: 3,
  userName: 'cash1',
  startTime: '2026-11-09T08:00:00.000Z',
  endTime: null,
  ...over,
});

const mine = (over: Partial<LocalShiftWithUser>): LocalShiftWithUser => ({
  clientId: A,
  id: null,
  userId: 3,
  userName: 'cash1',
  startTime: '2026-11-09T08:00:00.000Z',
  endTime: null,
  ...over,
});

const zeroSections = {
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
};

const localTotals = (
  over: Partial<LocalConsolidation> = {},
): LocalConsolidation => ({
  ...zeroSections,
  incompleteClientIds: [],
  ...over,
});

let today: ReturnType<typeof vi.fn>;
let consolidate: ReturnType<typeof vi.fn>;

function serverAnswers(data: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(() => Promise.resolve(Response.json({ data })));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function serverUnreachable(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
  );
}

beforeEach(() => {
  today = vi.fn(() => Promise.resolve([]));
  consolidate = vi.fn(() => Promise.resolve(localTotals()));
  window.api = {
    shifts: { today, consolidate },
    cache: {
      get: vi.fn(() => Promise.resolve(null)),
      put: vi.fn(() => Promise.resolve()),
    },
  } as unknown as Window['api'];
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token, 4);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'api');
  useAuthStore.getState().signOut();
  useStaleStore.setState({ stale: {} });
  localStorage.clear();
});

describe('fetchShiftsToday', () => {
  it('adds a shift only this device knows, keyed by the device’s own id', async () => {
    serverAnswers([server({ id: 11, userName: 'cash0' })]);
    today.mockResolvedValue([mine({ startTime: '2026-11-09T16:00:00.000Z' })]);

    const shifts = await fetchShiftsToday(UserRole.Cashier);

    expect(shifts.map((s) => [s.key, s.userName, s.onDevice])).toEqual([
      ['11', 'cash0', false],
      [A, 'cash1', true],
    ]);
    expect(shifts[1]).toMatchObject({ id: null, clientId: A });
  });

  it('asks this device for the same day and role', async () => {
    serverAnswers([]);

    await fetchShiftsToday(UserRole.Cashier);

    expect(today).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'CASHIER',
        from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      }),
    );
  });

  it('shows a shift once when the server already has it, and marks that this device holds it', async () => {
    serverAnswers([server({ id: 11, clientId: A })]);
    today.mockResolvedValue([mine({ id: 11 })]);

    const shifts = await fetchShiftsToday(UserRole.Cashier);

    expect(shifts).toHaveLength(1);
    expect(shifts[0]).toMatchObject({
      key: '11',
      id: 11,
      clientId: A,
      onDevice: true,
    });
  });

  it('shows the end this device recorded when the server still has the shift open', async () => {
    serverAnswers([server({ id: 11, clientId: A, endTime: null })]);
    today.mockResolvedValue([
      mine({ id: 11, endTime: '2026-11-09T16:00:00.000Z' }),
    ]);

    const [shift] = await fetchShiftsToday(UserRole.Cashier);

    expect(shift.endTime).toBe('2026-11-09T16:00:00.000Z');
  });

  it('keeps a synced shift of this device that the saved server list does not have, by its server id', async () => {
    serverAnswers([]);
    today.mockResolvedValue([mine({ id: 42 })]);

    const [shift] = await fetchShiftsToday(UserRole.Cashier);

    expect(shift).toMatchObject({ key: '42', id: 42, onDevice: true });
  });

  it('lists the oldest first', async () => {
    serverAnswers([server({ id: 12, startTime: '2026-11-09T20:00:00.000Z' })]);
    today.mockResolvedValue([mine({ startTime: '2026-11-09T08:00:00.000Z' })]);

    const shifts = await fetchShiftsToday(UserRole.Cashier);

    expect(shifts.map((s) => s.key)).toEqual([A, '12']);
  });

  it('shows this device’s shifts alone, and says so, when the server cannot be reached', async () => {
    serverUnreachable();
    today.mockResolvedValue([mine({})]);

    const shifts = await fetchShiftsToday(UserRole.Cashier);

    expect(shifts.map((s) => s.key)).toEqual([A]);
    expect(Object.keys(useStaleStore.getState().stale)).toEqual([
      'this-device-only',
    ]);
  });

  it('fails as before when the server cannot be reached and this device has nothing either', async () => {
    serverUnreachable();

    await expect(fetchShiftsToday(UserRole.Cashier)).rejects.toThrow(
      /Unable to reach the server/,
    );
  });

  it('never hides a server error behind this device’s shifts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({ message: 'Database down' }, { status: 500 }),
        ),
      ),
    );
    today.mockResolvedValue([mine({})]);

    await expect(fetchShiftsToday(UserRole.Cashier)).rejects.toThrow(
      'Database down',
    );
  });

  it('works outside the desktop app, where only the server knows shifts', async () => {
    Reflect.deleteProperty(window, 'api');
    serverAnswers([server({ id: 11 })]);

    const shifts = await fetchShiftsToday(UserRole.Cashier);

    expect(shifts.map((s) => [s.key, s.onDevice])).toEqual([['11', false]]);
  });
});

const review = (over: Partial<ReviewShift>): ReviewShift => ({
  key: '11',
  id: 11,
  clientId: null,
  userId: 3,
  userName: 'cash1',
  startTime: '2026-11-09T08:00:00.000Z',
  endTime: null,
  onDevice: false,
  ...over,
});

describe('fetchConsolidatedShifts', () => {
  const serverTotals = {
    shiftIds: [11],
    incompleteShiftIds: [],
    ...zeroSections,
    creditTotals: { ...zeroSections.creditTotals, creditTerminalCents: 1000 },
  };

  it('asks only the server for shifts this device does not hold', async () => {
    const fetchMock = serverAnswers(serverTotals);

    const result = await fetchConsolidatedShifts([review({})]);

    expect(consolidate).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        String(
          (fetchMock.mock.calls[0] as unknown[])[1] &&
            ((fetchMock.mock.calls[0] as unknown[])[1] as { body: string })
              .body,
        ),
      ),
    ).toEqual({
      shiftIds: [11],
    });
    expect(result.creditTotals.creditTerminalCents).toBe(1000);
    expect(result.shiftIds).toEqual(['11']);
  });

  it('sums a shift this device holds from its own records, without the server', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    consolidate.mockResolvedValue(
      localTotals({
        creditTotals: {
          ...zeroSections.creditTotals,
          creditTerminalCents: 2500,
        },
        incompleteClientIds: [],
      }),
    );

    const result = await fetchConsolidatedShifts([
      review({ key: A, id: null, clientId: A, onDevice: true }),
    ]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consolidate).toHaveBeenCalledWith([A]);
    expect(result.creditTotals.creditTerminalCents).toBe(2500);
    expect(result.shiftIds).toEqual([A]);
  });

  it('prefers this device’s records for a shift it holds even when the server knows it', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await fetchConsolidatedShifts([
      review({ key: '11', id: 11, clientId: A, onDevice: true }),
    ]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(consolidate).toHaveBeenCalledWith([A]);
  });

  it('adds the server’s figures and this device’s together', async () => {
    serverAnswers(serverTotals);
    consolidate.mockResolvedValue(
      localTotals({
        creditTotals: {
          ...zeroSections.creditTotals,
          creditTerminalCents: 2500,
        },
      }),
    );

    const result = await fetchConsolidatedShifts([
      review({}),
      review({ key: A, id: null, clientId: A, onDevice: true }),
    ]);

    expect(result.creditTotals.creditTerminalCents).toBe(3500);
    expect(result.shiftIds.sort()).toEqual(['11', A].sort());
  });

  it('reports incomplete shifts by the same key the list uses', async () => {
    serverAnswers({ ...serverTotals, incompleteShiftIds: [11] });
    consolidate.mockResolvedValue(localTotals({ incompleteClientIds: [B] }));

    const result = await fetchConsolidatedShifts([
      review({}),
      review({ key: B, id: null, clientId: B, onDevice: true }),
    ]);

    expect(result.incompleteShiftIds.sort()).toEqual(['11', B].sort());
  });

  it('still needs the server for shifts only it knows', async () => {
    serverUnreachable();

    await expect(fetchConsolidatedShifts([review({})])).rejects.toThrow(
      /Unable to reach the server/,
    );
  });
});
