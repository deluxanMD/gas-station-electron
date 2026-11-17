import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  resetShiftStore,
  seedOpenShift,
  SHIFT_CLIENT_ID,
} from '@/features/shift/test-utils';
import { installFakeDevice, uninstallFakeDevice } from '@/test/fake-device';
import type { FakeDevice } from '@/test/fake-device';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { useManagerShiftStore } from '@/features/daily-shift/manager-shift/manager-shift-store';
import { SCRATCH_DENOMINATIONS } from '@/features/daily-shift/manager-shift/manager-shift-step-three/constants';
import { stubManagerShiftApi } from '@/features/daily-shift/manager-shift/test-utils';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

// Walks steps 1-4: $5 tickets sold 12 ($60, $25 activated) and lotto slips.
let device: FakeDevice;

async function openReconciliationStep(
  onExit: () => void,
  stub: Parameters<typeof stubManagerShiftApi>[0] = {},
): Promise<void> {
  stubManagerShiftApi(stub);
  device = installFakeDevice();
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

// The paths of the records saved with the shift, in order.
const savedPaths = (): string[] => device.paths();

const savedBody = (path: string): unknown => device.body(path);

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
    uninstallFakeDevice();
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
    expect(device.finished[0].clientId).toBe(SHIFT_CLIENT_ID);
    expect(savedBody('lotto-reconciliations')).toMatchObject({
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

  it('saves the scratch tickets, lotto reports and reconciliation together with the close', async () => {
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    await page.getByLabelText('Bullock').fill('800');
    await page.getByLabelText('Bull-Payouts').fill('100');
    await page.getByLabelText('Bull-LottoWinner').fill('50');
    await page.getByLabelText('Cash Net').fill('-230');
    await page.getByRole('combobox').selectOptions('previous-day');

    // Nothing has been saved while walking the steps.
    expect(device.finished).toHaveLength(0);

    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));

    expect(savedPaths()).toEqual([
      'scratch-tickets',
      'lotto-reports',
      'lotto-reconciliations',
    ]);
    const scratch = savedBody('scratch-tickets') as {
      userId: number;
      businessDate: string;
      shiftNumber: number;
      lines: { denomination: number; openCount: number }[];
    };
    expect(scratch).toMatchObject({ userId: 3, shiftNumber: 9 });
    // The day is the device's, so a sheet sent later still belongs to the day it was made.
    expect(scratch.businessDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(scratch.lines.find((line) => line.denomination === 5)).toEqual({
      denomination: 5,
      openCount: 10,
      closeCount: 3,
      activationsCount: 5,
    });
    const lotto = savedBody('lotto-reports') as {
      shiftClientId: string;
      slips: { slipType: string; amounts: Record<string, number> }[];
    };
    expect(lotto.shiftClientId).toBe(SHIFT_CLIENT_ID);
    expect(lotto.slips.map((slip) => slip.slipType)).toEqual([
      'PREVIOUS_DAY',
      'YESTERDAY',
      'FULL_DAY',
      'DAY_END',
    ]);
    expect(lotto.slips[3].amounts.onlineNetSales).toBe(100_000);
    expect(savedBody('lotto-reconciliations')).toEqual({
      shiftClientId: SHIFT_CLIENT_ID,
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
      (savedBody('lotto-reconciliations') as { attribution: null }).attribution,
    ).toBeNull();
  });

  it('stays open when saving on the device fails and saves everything once on retry', async () => {
    let exited = false;
    await openReconciliationStep(() => {
      exited = true;
    });
    device.failNextFinish('Disk full');
    await fillBullFigures();
    await page.getByRole('button', { name: 'Post and Close' }).click();

    await expect.element(page.getByText('Disk full')).toBeVisible();
    expect(exited).toBe(false);
    expect(device.finished).toHaveLength(0);

    await page.getByRole('button', { name: 'Post and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));
    expect(device.finished).toHaveLength(1);
  });
});
