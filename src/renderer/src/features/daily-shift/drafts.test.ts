import { afterEach, describe, expect, it } from 'vitest';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { activateDrafts, deactivateDrafts, discardDrafts } from './drafts';

const SHIFT_A = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';
const SHIFT_B = '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91';

const TOTALS = {
  creditTerminalCents: 1000,
  creditHostCents: 1000,
  debitTerminalCents: 0,
  fleetCents: 0,
  svRedemptionCents: 0,
};

const draftKeys = (): string[] =>
  Object.keys(localStorage).filter((key) => key.startsWith('draft-'));

afterEach(() => {
  deactivateDrafts();
  localStorage.clear();
});

describe('drafts', () => {
  it('brings back what was entered before the app was closed', async () => {
    await activateDrafts(4, SHIFT_A);
    useCashierShiftStore.getState().setCreditTotals(TOTALS);

    // The app restarts: memory is empty, the same user and shift come back.
    deactivateDrafts();
    expect(useCashierShiftStore.getState().creditTotals).toBeNull();
    await activateDrafts(4, SHIFT_A);

    expect(useCashierShiftStore.getState().creditTotals).toEqual(TOTALS);
  });

  it('keeps each role’s entries in its own draft', async () => {
    await activateDrafts(4, SHIFT_A);
    useSupervisorShiftStore.getState().setFuelDips({
      date: '2026-11-09',
      time: '22:15',
      products: [],
    });
    useManagerShiftStore.setState({ scratchTickets: null });

    deactivateDrafts();
    await activateDrafts(4, SHIFT_A);

    expect(useSupervisorShiftStore.getState().fuelDips).toMatchObject({
      time: '22:15',
    });
    expect(useCashierShiftStore.getState().creditTotals).toBeNull();
  });

  it('shows nothing of one user’s draft to another user or another shift', async () => {
    await activateDrafts(4, SHIFT_A);
    useCashierShiftStore.getState().setCreditTotals(TOTALS);

    await activateDrafts(5, SHIFT_A);
    expect(useCashierShiftStore.getState().creditTotals).toBeNull();

    await activateDrafts(4, SHIFT_B);
    expect(useCashierShiftStore.getState().creditTotals).toBeNull();

    // And the first draft is still there for its owner.
    await activateDrafts(4, SHIFT_A);
    expect(useCashierShiftStore.getState().creditTotals).toEqual(TOTALS);
  });

  it('clears the previous user’s figures from memory when another takes over', async () => {
    await activateDrafts(4, SHIFT_A);
    useCashierShiftStore.getState().setCreditTotals(TOTALS);

    await activateDrafts(5, SHIFT_B);

    expect(useCashierShiftStore.getState().creditTotals).toBeNull();
    // The new scope's own saved draft was not overwritten by that reset.
    expect(localStorage.getItem(`draft-cashier-shift|4:${SHIFT_A}`)).toContain(
      'creditTerminalCents',
    );
  });

  it('saves nothing while no shift is active', () => {
    useCashierShiftStore.getState().setCreditTotals(TOTALS);

    expect(draftKeys()).toEqual([]);
  });

  it('does not save the cashier shifts being reviewed, which come from the server', async () => {
    await activateDrafts(4, SHIFT_A);
    useSupervisorShiftStore.getState().setSelectedShiftIds(['11', '12']);

    expect(
      localStorage.getItem(`draft-supervisor-shift|4:${SHIFT_A}`),
    ).not.toContain('selectedShiftIds');
  });

  it('forgets the draft once the shift is saved', async () => {
    await activateDrafts(4, SHIFT_A);
    useCashierShiftStore.getState().setCreditTotals(TOTALS);

    discardDrafts();
    useCashierShiftStore.getState().resetShift();

    expect(draftKeys()).toEqual([]);
    await activateDrafts(4, SHIFT_A);
    expect(useCashierShiftStore.getState().creditTotals).toBeNull();
  });

  it('keeps entering data when storage fails', async () => {
    await activateDrafts(4, SHIFT_A);
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = (): void => {
      throw new Error('quota exceeded');
    };
    try {
      expect(() =>
        useCashierShiftStore.getState().setCreditTotals(TOTALS),
      ).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
    expect(useCashierShiftStore.getState().creditTotals).toEqual(TOTALS);
  });
});
