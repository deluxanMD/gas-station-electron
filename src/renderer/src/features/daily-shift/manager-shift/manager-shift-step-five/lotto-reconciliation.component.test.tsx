import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { SCRATCH_DENOMINATIONS } from '@/features/daily-shift/manager-shift/manager-shift-step-three/constants';
import { stubManagerShiftApi } from '@/features/daily-shift/manager-shift/test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

// Walks steps 1-4: $5 tickets sold 12 ($60, $25 activated) and lotto slips.
async function openReconciliationStep(
  onExit: () => void,
  stub: Parameters<typeof stubManagerShiftApi>[0] = {},
): Promise<void> {
  stubManagerShiftApi(stub);
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u3', role: 'MANAGER' })}.sig`;
  useAuthStore.getState().signIn(token, 3);
  await render(<DailyShiftScreen onExit={onExit} />);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

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

const API_PREFIX = /^.*\/v1/;

// The paths the app POSTed to, in order.
function postedPaths(): string[] {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([, init]) => init?.method === 'POST')
    .map(([url]) => String(url).replace(API_PREFIX, ''));
}

function postedBody(path: string): unknown {
  const call = vi
    .mocked(fetch)
    .mock.calls.find(
      ([url, init]) =>
        String(url).replace(API_PREFIX, '') === path && init?.method === 'POST',
    );
  return JSON.parse(call?.[1]?.body as string);
}

async function fillBullFigures(): Promise<void> {
  await page.getByLabelText('Bullock').fill('0');
  await page.getByLabelText('Bull-Payouts').fill('0');
  await page.getByLabelText('Bull-LottoWinner').fill('0');
}

describe('Lotto Reconciliation window (real browser)', () => {
  beforeEach(() => {
    seedOpenShift();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
    useAuthStore.getState().signOut();
    useManagerShiftStore.getState().reset();
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
    // Managers work inside a tracked shift, so Post and Close ends it.
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts\/9\/close$/),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(postedBody('/lotto-reconciliations')).toMatchObject({
      bullock: 80_000,
      bullPayouts: 10_000,
      bullLottoWinner: 5000,
      cashNet: -23_000,
      attribution: null,
      total: 0,
    });
    // The finished shift's figures are cleared for the next one.
    expect(useManagerShiftStore.getState().lottoReconciliation).toBeNull();
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

  it('requires the Bullock figures', async () => {
    await openReconciliationStep(() => {});
    await page.getByRole('button', { name: 'Post and Close' }).click();

    await expect.element(page.getByText('Required').first()).toBeVisible();
    expect(useManagerShiftStore.getState().lottoReconciliation).toBeNull();
  });

  it('posts the scratch tickets, lotto reports and reconciliation in order, then closes', async () => {
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    await page.getByLabelText('Bullock').fill('800');
    await page.getByLabelText('Bull-Payouts').fill('100');
    await page.getByLabelText('Bull-LottoWinner').fill('50');
    await page.getByLabelText('Cash Net').fill('-230');
    await page.getByRole('combobox').selectOptions('previous-day');

    // Nothing has been posted while walking the steps.
    expect(postedPaths()).toEqual([]);

    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));

    expect(postedPaths()).toEqual([
      '/scratch-tickets',
      '/lotto-reports',
      '/lotto-reconciliations',
      '/shifts/9/close',
    ]);
    const scratch = postedBody('/scratch-tickets') as {
      userId: number;
      shiftNumber: number;
      lines: { denomination: number; openCount: number }[];
    };
    expect(scratch).toMatchObject({ userId: 3, shiftNumber: 9 });
    expect(scratch.lines.find((line) => line.denomination === 5)).toEqual({
      denomination: 5,
      openCount: 10,
      closeCount: 3,
      activationsCount: 5,
    });
    const lotto = postedBody('/lotto-reports') as {
      shiftId: number;
      slips: { slipType: string; amounts: Record<string, number> }[];
    };
    expect(lotto.shiftId).toBe(9);
    expect(lotto.slips.map((slip) => slip.slipType)).toEqual([
      'PREVIOUS_DAY',
      'YESTERDAY',
      'FULL_DAY',
      'DAY_END',
    ]);
    expect(lotto.slips[3].amounts.onlineNetSales).toBe(100_000);
    expect(postedBody('/lotto-reconciliations')).toEqual({
      shiftId: 9,
      userId: 3,
      bullock: 80_000,
      bullPayouts: 10_000,
      bullLottoWinner: 5000,
      lottoNet: 6000,
      redeemNet: 17_000,
      activationsNet: 0,
      cashNet: -23_000,
      total: 0,
      attribution: 'PREVIOUS_DAY',
    });
  });

  it('sends no attribution when none is chosen', async () => {
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    await page.getByLabelText('Bullock').fill('0');
    await page.getByLabelText('Bull-Payouts').fill('0');
    await page.getByLabelText('Bull-LottoWinner').fill('0');
    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));

    expect(
      (postedBody('/lotto-reconciliations') as { attribution: null })
        .attribution,
    ).toBeNull();
  });

  it('stops at the failed report, shows the error and does not close the shift', async () => {
    let exited = false;
    await openReconciliationStep(
      () => {
        exited = true;
      },
      {
        lottoSave: Response.json(
          { message: 'Already saved for this shift' },
          { status: 409 },
        ),
      },
    );
    await fillBullFigures();
    await page.getByRole('button', { name: 'Post and Close' }).click();

    await expect
      .element(page.getByText('Already saved for this shift'))
      .toBeVisible();
    expect(exited).toBe(false);
    expect(postedPaths()).toEqual(['/scratch-tickets', '/lotto-reports']);
  });

  it('retries without posting a saved report twice', async () => {
    let exited = false;
    await openReconciliationStep(
      () => {
        exited = true;
      },
      {
        lottoSave: Response.json({ message: 'Database down' }, { status: 500 }),
      },
    );
    await fillBullFigures();
    await page.getByRole('button', { name: 'Post and Close' }).click();
    await expect.element(page.getByText('Database down')).toBeVisible();

    // The API recovers; only what is still unsaved is posted.
    stubManagerShiftApi();
    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));

    expect(postedPaths()).toEqual([
      '/lotto-reports',
      '/lotto-reconciliations',
      '/shifts/9/close',
    ]);
  });
});
