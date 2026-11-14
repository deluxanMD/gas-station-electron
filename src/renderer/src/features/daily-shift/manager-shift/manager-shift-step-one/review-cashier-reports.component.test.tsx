import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import {
  CONSOLIDATED,
  stubShiftApi,
} from '@/features/daily-shift/supervisor-shift/supervisor-shift-step-one/test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openManagerFlow(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token);
  await render(<DailyShiftScreen onExit={() => {}} />);
}

describe('Review Cashier Reports window (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().signOut();
    useManagerShiftStore.setState({
      selectedShiftIds: [],
      consolidated: null,
    });
    localStorage.clear();
  });

  it("lists today's cashier shifts", async () => {
    stubShiftApi();
    await openManagerFlow();

    await expect
      .element(page.getByLabelText(/cashier1 · Started .* · Ended /))
      .toBeVisible();
    await expect
      .element(page.getByLabelText(/cashier2 · Started .* · In progress/))
      .toBeVisible();
  });

  it('shows the consolidated values from the API after Review', async () => {
    const fetchMock = stubShiftApi();
    await openManagerFlow();

    await page.getByLabelText(/cashier1/).click();
    await page.getByLabelText(/cashier2/).click();
    await page.getByRole('button', { name: 'Review' }).click();

    const summary = page.getByRole('region', { name: 'Daily Summary' });
    await expect.element(summary.getByText('99.98')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts\/consolidated$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ shiftIds: [11, 12] }),
      }),
    );
    expect(useManagerShiftStore.getState().selectedShiftIds).toEqual([
      '11',
      '12',
    ]);
  });

  it('hides the values again when the selection changes', async () => {
    stubShiftApi();
    await openManagerFlow();

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
    await openManagerFlow();

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
    await openManagerFlow();

    await page.getByLabelText(/cashier1/).click();
    await page.getByRole('button', { name: 'Review' }).click();

    await expect.element(page.getByText('Shift not found')).toBeVisible();
  });
});
