import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { SCRATCH_DENOMINATIONS } from '@/features/daily-shift/manager-shift/manager-shift-step-three/constants';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

// Walks steps 1-4: $5 tickets sold 12 ($60, $25 activated) and lotto slips.
async function openReconciliationStep(onExit: () => void): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token);
  await render(<DailyShiftScreen onExit={onExit} />);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByLabelText('Shift #').fill('1');
  for (const denomination of SCRATCH_DENOMINATIONS) {
    await page.getByLabelText(`$${denomination} close`).fill('0');
    await page.getByLabelText(`$${denomination} activations`).fill('0');
  }
  await page.getByLabelText('$5 open').fill('10');
  await page.getByLabelText('$5 activations').fill('5');
  await page.getByLabelText('$5 close').fill('3');
  await page.getByRole('button', { name: 'Next' }).click();

  await page
    .getByLabelText('On-Line Products Net Sales - Day end')
    .fill('1000');
  await page
    .getByLabelText('On-Line Products Cash Redem - Day end')
    .fill('200');
  await page
    .getByLabelText('Instant Products Cash Redem - Day end')
    .fill('120');
  await page.getByLabelText('Activations Activations - Day end').fill('25');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 5 of 5')).toBeVisible();
}

describe('Lotto Reconciliation window (real browser)', () => {
  beforeEach(() => {
    seedOpenShift();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ data: {} }))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
    useAuthStore.getState().signOut();
    useManagerShiftStore.setState({
      scratchTickets: null,
      lottoReports: null,
      lottoReconciliation: null,
    });
    localStorage.clear();
  });

  it('derives the figures from the earlier steps', async () => {
    await openReconciliationStep(() => {});

    // Instant $60 + Online (1000 - 200) = 860; OLG payout 200 + 120 = 320.
    await expect
      .element(page.getByTestId('rec-instant'))
      .toHaveTextContent('60.00');
    await expect
      .element(page.getByTestId('rec-online'))
      .toHaveTextContent('800.00');
    await expect
      .element(page.getByTestId('rec-total'))
      .toHaveTextContent('860.00');
    await expect
      .element(page.getByTestId('rec-olgPayout'))
      .toHaveTextContent('320.00');
    await expect
      .element(page.getByTestId('rec-activationsOlg'))
      .toHaveTextContent('25.00');
    await expect
      .element(page.getByTestId('rec-activationsShift'))
      .toHaveTextContent('25.00');
  });

  it('calculates the nets and total, then posts and closes', async () => {
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    await page.getByLabelText('Bullock').fill('800');
    await page.getByLabelText('Bull-Payouts').fill('100');
    await page.getByLabelText('Bull-LottoWinner').fill('50');

    // Lotto Net 860-800 = 60; Redem Net 320-150 = 170; Activations Net 0.
    await expect
      .element(page.getByTestId('summary-lottoNet'))
      .toHaveTextContent('60.00');
    await expect
      .element(page.getByTestId('summary-redemNet'))
      .toHaveTextContent('170.00');
    await expect
      .element(page.getByTestId('summary-activationsNet'))
      .toHaveTextContent('0.00');
    await expect
      .element(page.getByTestId('summary-total'))
      .toHaveTextContent('230.00');

    await page.getByLabelText('Cash Net').fill('-230');
    await expect
      .element(page.getByTestId('summary-total'))
      .toHaveTextContent('0.00');

    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts\/9\/close$/),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useManagerShiftStore.getState().lottoReconciliation).toEqual({
      bullockCents: 80_000,
      bullPayoutsCents: 10_000,
      bullLottoWinnerCents: 5000,
      cashNetCents: -23_000,
      attribution: '',
      totalCents: 0,
    });
  });

  it('warns, but still allows closing, when over/short is not attributed', async () => {
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    await page.getByLabelText('Bullock').fill('0');
    await page.getByLabelText('Bull-Payouts').fill('0');
    await page.getByLabelText('Bull-LottoWinner').fill('0');

    await expect.element(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));
  });

  it('stays on the step and shows the error when the shift cannot be closed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({ message: 'Database down' }, { status: 500 }),
        ),
      ),
    );
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    await page.getByLabelText('Bullock').fill('0');
    await page.getByLabelText('Bull-Payouts').fill('0');
    await page.getByLabelText('Bull-LottoWinner').fill('0');
    await page.getByRole('button', { name: 'Post and Close' }).click();

    await expect.element(page.getByText('Database down')).toBeVisible();
    expect(exited).toBe(false);
  });

  it('requires the Bullock figures', async () => {
    await openReconciliationStep(() => {});
    await page.getByRole('button', { name: 'Post and Close' }).click();

    await expect.element(page.getByText('Required').first()).toBeVisible();
    expect(useManagerShiftStore.getState().lottoReconciliation).toBeNull();
  });
});
