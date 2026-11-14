import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useSupervisorShiftStore } from '@/features/daily-shift/supervisor-shift/supervisor-shift-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { CONSOLIDATED, stubShiftApi } from './test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
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
    useSupervisorShiftStore.setState({
      selectedShiftIds: [],
      consolidated: null,
    });
    localStorage.clear();
  });

  it("lists today's cashier shifts, ended and in progress", async () => {
    stubShiftApi();
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
    stubShiftApi();
    await openSupervisorFlow();

    const review = page.getByRole('button', { name: 'Review' });
    await expect.element(review).toBeDisabled();

    await page.getByLabelText(/cashier2/).click();
    await expect.element(review).toBeEnabled();
    await review.click();

    await vi.waitFor(() =>
      expect(useSupervisorShiftStore.getState().selectedShiftIds).toEqual([
        '12',
      ]),
    );
  });

  it('says so when no cashier has a shift today', async () => {
    stubShiftApi({ shifts: Response.json({ data: [] }) });
    await openSupervisorFlow();

    await expect
      .element(page.getByText('No cashier shifts today yet.'))
      .toBeVisible();
  });

  it('shows the error and retries the load', async () => {
    stubShiftApi({
      shifts: Response.json({ message: 'Database down' }, { status: 500 }),
    });
    await openSupervisorFlow();

    await expect.element(page.getByText('Database down')).toBeVisible();

    stubShiftApi();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect.element(page.getByLabelText(/cashier1/)).toBeVisible();
  });

  it('shows the consolidated values from the API after Review', async () => {
    const fetchMock = stubShiftApi();
    await openSupervisorFlow();

    await page.getByLabelText(/cashier1/).click();
    await page.getByLabelText(/cashier2/).click();
    await page.getByRole('button', { name: 'Review' }).click();

    const summary = page.getByRole('region', { name: 'Daily Summary' });
    await expect.element(summary.getByText('99.98')).toBeVisible();
    await expect.element(summary.getByText('-0.02')).toBeVisible();
    const cash = page.getByRole('region', { name: 'Payouts and Cash' });
    await expect.element(cash.getByText('57.73')).toBeVisible();
    await expect.element(cash.getByText('7.25')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts\/consolidated$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ shiftIds: [11, 12] }),
      }),
    );
    expect(useSupervisorShiftStore.getState().selectedShiftIds).toEqual([
      '11',
      '12',
    ]);
  });

  it('hides the values again when the selection changes', async () => {
    stubShiftApi();
    await openSupervisorFlow();

    await page.getByLabelText(/cashier1/).click();
    await page.getByRole('button', { name: 'Review' }).click();
    await expect
      .element(page.getByRole('region', { name: 'Daily Summary' }))
      .toBeVisible();

    await page.getByLabelText(/cashier2/).click();
    await expect
      .element(page.getByRole('region', { name: 'Daily Summary' }))
      .not.toBeInTheDocument();
  });

  it('warns about shifts missing cashier records', async () => {
    stubShiftApi({
      consolidated: Response.json({
        data: { ...CONSOLIDATED, incompleteShiftIds: [12] },
      }),
    });
    await openSupervisorFlow();

    await page.getByLabelText(/cashier2/).click();
    await page.getByRole('button', { name: 'Review' }).click();

    await expect
      .element(page.getByText(/1 selected shift\(s\) are missing/))
      .toBeVisible();
  });

  it('shows the error when the values cannot be loaded', async () => {
    stubShiftApi({
      consolidated: Response.json(
        { message: 'Shift not found' },
        { status: 404 },
      ),
    });
    await openSupervisorFlow();

    await page.getByLabelText(/cashier1/).click();
    await page.getByRole('button', { name: 'Review' }).click();

    await expect.element(page.getByText('Shift not found')).toBeVisible();
    await expect
      .element(page.getByRole('region', { name: 'Daily Summary' }))
      .not.toBeInTheDocument();
  });
});
