import { vi } from 'vitest';
import type { FinishShiftInput, LocalShift } from '@/lib/ipc';

// A shift as the device would report it, closed by the time it is returned from finish.
const shift = (clientId: string): LocalShift => ({
  clientId,
  id: null,
  userId: 4,
  startTime: '2026-11-09T14:00:00.000Z',
  endTime: '2026-11-09T22:00:00.000Z',
});

export interface FakeDevice {
  // Every shift that was finished on the device, in order.
  finished: FinishShiftInput[];
  // The record sent under `path` in the last finished shift.
  body: (path: string) => Record<string, unknown> | undefined;
  // The paths of the last finished shift's records.
  paths: () => string[];
  // Makes the next finish fail, as if the device could not store it.
  failNextFinish: (message: string) => void;
  // Makes the next start fail, as if the device could not store it.
  failNextStart: (message: string) => void;
}

/** Stands in for the preload API: the only thing mocked in component tests is the boundary to the main process. */
export function installFakeDevice(
  openShift: LocalShift | null = null,
): FakeDevice {
  const finished: FinishShiftInput[] = [];
  let failure: string | null = null;
  let startFailure: string | null = null;

  window.api = {
    outbox: {
      list: vi.fn(() => Promise.resolve([])),
      retry: vi.fn(() => Promise.resolve(true)),
      exportEntries: vi.fn(() => Promise.resolve({ saved: false })),
      counts: vi.fn(),
      enqueue: vi.fn(),
    },
    cache: {
      get: vi.fn(() => Promise.resolve(null)),
      put: vi.fn(() => Promise.resolve()),
    },
    credentials: {
      remember: vi.fn(() => Promise.resolve()),
      loginOffline: vi.fn(() => Promise.resolve({ status: 'unavailable' })),
    },
    session: {
      set: vi.fn(() => Promise.resolve()),
      release: vi.fn(() => Promise.resolve()),
      renew: vi.fn(() => Promise.resolve(null)),
    },
    shifts: {
      current: vi.fn(() => Promise.resolve(openShift)),
      start: vi.fn((userId: number) => {
        if (startFailure !== null) {
          const message = startFailure;
          startFailure = null;
          return Promise.reject(new Error(message));
        }
        return Promise.resolve({
          ...shift('11111111-1111-4111-8111-111111111111'),
          userId,
          endTime: null,
        });
      }),
      adopt: vi.fn(),
      today: vi.fn(() => Promise.resolve([])),
      consolidate: vi.fn(() =>
        Promise.resolve({
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
        }),
      ),
      finish: vi.fn((input: FinishShiftInput) => {
        if (failure !== null) {
          const message = failure;
          failure = null;
          return Promise.reject(new Error(message));
        }
        finished.push(input);
        return Promise.resolve(shift(input.clientId));
      }),
    },
  } as unknown as Window['api'];

  const last = (): FinishShiftInput | undefined => finished.at(-1);
  return {
    finished,
    body: (path) => last()?.writes.find((w) => w.path === path)?.payload,
    paths: () => last()?.writes.map((w) => w.path) ?? [],
    failNextFinish: (message) => {
      failure = message;
    },
    failNextStart: (message) => {
      startFailure = message;
    },
  };
}

export function uninstallFakeDevice(): void {
  // @ts-expect-error the preload API is absent outside the desktop app
  delete window.api;
}
