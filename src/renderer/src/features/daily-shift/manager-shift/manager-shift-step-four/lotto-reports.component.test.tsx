import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { SCRATCH_DENOMINATIONS } from '@/features/daily-shift/manager-shift/manager-shift-step-three/constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openLottoStep(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token);
  await render(<DailyShiftScreen onExit={() => {}} />);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabelText('Shift #').fill('1');
  for (const denomination of SCRATCH_DENOMINATIONS) {
    await page.getByLabelText(`$${denomination} close`).fill('0');
    await page.getByLabelText(`$${denomination} activations`).fill('0');
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
}

describe('Lotto Reports window (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    useManagerShiftStore.setState({ scratchTickets: null, lottoReports: null });
    localStorage.clear();
  });

  it('lets the manager continue with no slips entered', async () => {
    await openLottoStep();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().lottoReports?.netTerminalCents).toBe(
      0,
    );
  });

  it('saves a time of report for each slip column', async () => {
    await openLottoStep();
    await page
      .getByLabelText('Time of Report - Yesterday report')
      .fill('06:30');
    await page.getByLabelText('Time of Report - Full day report').fill('07:45');
    await page.getByLabelText('Time of Report - Day end').fill('23:15');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().lottoReports?.reportTimes).toEqual({
      yesterday: '06:30',
      fullDay: '07:45',
      dayEnd: '23:15',
    });
  });

  it('rejects a malformed amount', async () => {
    await openLottoStep();
    await page.getByLabelText('Sports Proline - Day end').fill('12.345');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText(/Enter an amount like/)).toBeVisible();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
  });

  it('calculates the subtotals and the Net Terminal', async () => {
    await openLottoStep();
    await page
      .getByLabelText('On-Line Products Net Sales - Day end')
      .fill('1000');
    await page
      .getByLabelText('On-Line Products Cash Redem - Day end')
      .fill('200');
    await page.getByLabelText('Sports Proline - Day end').fill('300');
    await page.getByLabelText('Sports Voids - Day end').fill('50');
    await page.getByLabelText('Gift Card Sales Sales - Day end').fill('100');
    await page
      .getByLabelText('Instant Products Cash Redem - Day end')
      .fill('120');

    // Online 800 + Sports 250 + Gift Card 100 - Instant redemptions 120.
    await expect
      .element(page.getByTestId('lotto-dayEnd-netOnline'))
      .toHaveTextContent('800.00');
    await expect
      .element(page.getByTestId('lotto-dayEnd-netSports'))
      .toHaveTextContent('250.00');
    await expect
      .element(page.getByTestId('lotto-net-netTerminal'))
      .toHaveTextContent('1030.00');

    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().lottoReports?.netTerminalCents).toBe(
      103_000,
    );
  });
});
