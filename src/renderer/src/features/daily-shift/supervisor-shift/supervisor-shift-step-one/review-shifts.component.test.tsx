import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

const TODAY_SHIFTS = [
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

function stubShifts(response: Response): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(response)),
  );
}

async function openSupervisorFlow(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u2', role: 'SUPERVISOR' })}.sig`;
  useAuthStore.getState().signIn(token, 2);
  seedOpenShift();
  await render(<DailyShiftScreen onExit={() => {}} />);
}

describe('Review Shifts window (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
    useAuthStore.getState().signOut();
    useSupervisorShiftStore.setState({ selectedShiftIds: [] });
    localStorage.clear();
  });

  it("lists today's cashier shifts, ended and in progress", async () => {
    stubShifts(Response.json({ data: TODAY_SHIFTS }));
    await openSupervisorFlow();

    await expect
      .element(page.getByLabelText(/cashier1 · Started .* · Ended /))
      .toBeVisible();
    await expect
      .element(page.getByLabelText(/cashier2 · Started .* · In progress/))
      .toBeVisible();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts\?role=CASHIER$/),
      expect.anything(),
    );
  });

  it('keeps Review disabled until a shift is selected, then records the selection', async () => {
    stubShifts(Response.json({ data: TODAY_SHIFTS }));
    await openSupervisorFlow();

    const review = page.getByRole('button', { name: 'Review' });
    await expect.element(review).toBeDisabled();

    await page.getByLabelText(/cashier2/).click();
    await expect.element(review).toBeEnabled();
    await review.click();

    expect(useSupervisorShiftStore.getState().selectedShiftIds).toEqual(['12']);
  });

  it('says so when no cashier has a shift today', async () => {
    stubShifts(Response.json({ data: [] }));
    await openSupervisorFlow();

    await expect
      .element(page.getByText('No cashier shifts today yet.'))
      .toBeVisible();
  });

  it('shows the error and retries the load', async () => {
    stubShifts(Response.json({ message: 'Database down' }, { status: 500 }));
    await openSupervisorFlow();

    await expect.element(page.getByText('Database down')).toBeVisible();

    stubShifts(Response.json({ data: TODAY_SHIFTS }));
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect.element(page.getByLabelText(/cashier1/)).toBeVisible();
  });
});
