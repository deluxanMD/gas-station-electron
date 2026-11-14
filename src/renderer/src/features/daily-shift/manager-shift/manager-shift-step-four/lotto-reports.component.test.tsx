import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { useAuthStore } from '@/features/auth/auth-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { LOTTO_INPUT_ROWS } from '@/features/daily-shift/manager-shift/manager-shift-step-four/constants';
import { SCRATCH_DENOMINATIONS } from '@/features/daily-shift/manager-shift/manager-shift-step-three/constants';
import { stubManagerShiftApi } from '@/features/daily-shift/manager-shift/test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openLottoStep(
  stub: Parameters<typeof stubManagerShiftApi>[0] = {},
): Promise<ReturnType<typeof stubManagerShiftApi>> {
  const fetchMock = stubManagerShiftApi(stub);
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token, 3);
  seedOpenShift();
  await render(<DailyShiftScreen onExit={() => {}} />);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  for (const denomination of SCRATCH_DENOMINATIONS) {
    await page.getByLabelText(`$${denomination} close`).fill('0');
    await page.getByLabelText(`$${denomination} activations`).fill('0');
  }
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
  return fetchMock;
}

describe('Lotto Reports window (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
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

  it('shows the previous day figures from the API and nets against them', async () => {
    const amounts = Object.fromEntries(
      LOTTO_INPUT_ROWS.map((key) => [key, 0]),
    ) as Record<string, number>;
    amounts.onlineNetSales = 50_000;
    await openLottoStep({
      lottoLatest: Response.json({ data: { amounts } }),
    });

    await page
      .getByLabelText('On-Line Products Net Sales - Day end')
      .fill('1000');
    // Day end 1000.00 less the previous day's 500.00.
    await expect
      .element(page.getByTestId('lotto-net-netOnline'))
      .toHaveTextContent('500.00');
  });

  it('saves the four slips in cents and moves on', async () => {
    const fetchMock = await openLottoStep();
    await page.getByLabelText('Date - Day end').fill('2026-11-08');
    await page.getByLabelText('Time of Report - Day end').fill('23:15');
    await page
      .getByLabelText('On-Line Products Net Sales - Day end')
      .fill('1000.50');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();

    const post = fetchMock.mock.calls.find(
      ([url, init]) =>
        String(url).endsWith('/lotto-reports') && init?.method === 'POST',
    );
    const body = JSON.parse(post?.[1].body as string) as {
      shiftId: number;
      userId: number;
      slips: {
        slipType: string;
        reportDate: string | null;
        reportTime: string | null;
        amounts: Record<string, number>;
      }[];
    };
    expect(body.shiftId).toBe(9);
    expect(body.userId).toBe(3);
    expect(body.slips.map((slip) => slip.slipType)).toEqual([
      'PREVIOUS_DAY',
      'YESTERDAY',
      'FULL_DAY',
      'DAY_END',
    ]);
    const dayEnd = body.slips[3];
    expect(dayEnd.reportDate).toBe('2026-11-08');
    expect(dayEnd.reportTime).toBe('23:15');
    expect(dayEnd.amounts.onlineNetSales).toBe(100_050);
    expect(body.slips[1].reportDate).toBeNull();
  });

  it('stays on the step and shows the error when saving fails', async () => {
    await openLottoStep({
      lottoSave: Response.json(
        { message: 'Already saved for this shift' },
        { status: 409 },
      ),
    });
    await page.getByRole('button', { name: 'Next' }).click();

    await expect
      .element(page.getByText('Already saved for this shift'))
      .toBeVisible();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();
    expect(useManagerShiftStore.getState().lottoReports).toBeNull();
  });

  it('does not save again when returning with unchanged values', async () => {
    const fetchMock = await openLottoStep();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();

    const posts = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url).endsWith('/lotto-reports') && init?.method === 'POST',
    );
    expect(posts).toHaveLength(1);
  });

  it('blocks Next until the previous day figures load, and retries', async () => {
    await openLottoStep({
      lottoLatest: Response.json({ message: 'Database down' }, { status: 500 }),
    });
    await expect.element(page.getByText('Database down')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText(/could not be loaded/)).toBeVisible();
    await expect.element(page.getByText('Step 4 of 5')).toBeVisible();

    stubManagerShiftApi();
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect
      .element(page.getByText('Database down'))
      .not.toBeInTheDocument();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 5 of 5')).toBeVisible();
  });
});
