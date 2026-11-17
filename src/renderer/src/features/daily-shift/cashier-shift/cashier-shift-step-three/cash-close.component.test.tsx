import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import {
  resetShiftStore,
  seedOpenShift,
  SHIFT_CLIENT_ID,
} from '@/features/shift/test-utils';
import { useShiftStore } from '@/features/shift/shift-store';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';
import { installFakeDevice, uninstallFakeDevice } from '@/test/fake-device';
import type { FakeDevice } from '@/test/fake-device';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

// Credit totals 10.00 (host and terminal); total sales 100.00.
async function openStepThree(onExit: () => void = () => {}): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'CASHIER' })}.sig`;
  useAuthStore.getState().signIn(token, 4);
  seedOpenShift();
  await render(<DailyShiftScreen onExit={onExit} />);

  await page.getByLabelText('Credit Totals - Terminal').fill('10');
  await page.getByLabelText('Credit Totals - Host').fill('10');
  await page.getByLabelText('Debit - Terminal').fill('0');
  await page.getByLabelText('Fleet').fill('0');
  await page.getByLabelText('SV Redemption').fill('0');
  await page.getByRole('button', { name: 'Next' }).click();

  await page.getByLabelText('Day End Date').fill('2026-11-09');
  await page.getByLabelText('Day End Time (AM/PM)').fill('23:30');
  await page.getByLabelText('Fuel Sales').fill('60');
  await page.getByLabelText('Item Sales').fill('30');
  await page.getByLabelText('GST').fill('10');
  await page.getByLabelText('HST').fill('0');
  await page.getByLabelText('Penny Rounding').fill('0');
  await page.getByLabelText('Total Sales').fill('100');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
}

async function fillRest(cashOnHand: string): Promise<void> {
  await page.getByLabelText('Lotto Winner').fill('5');
  await page.getByLabelText('Gift Certificates/Misc.').fill('0');
  await page.getByLabelText('Redemptions').fill('0');
  await page.getByLabelText('Safedrops').fill('20');
  await page.getByLabelText('Cash on Hand').fill(cashOnHand);
}

let device: FakeDevice;

describe('Payouts and Cash on Hand window (real browser)', () => {
  beforeEach(() => {
    device = installFakeDevice();
  });

  afterEach(() => {
    uninstallFakeDevice();
    resetShiftStore();
    useAuthStore.getState().signOut();
    useCashierShiftStore.setState({
      creditTotals: null,
      dailySummary: null,
      cashClose: null,
    });
    localStorage.clear();
  });

  it('flags a started payout row with missing cells', async () => {
    await openStepThree();
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await fillRest('50');
    await page.getByLabelText('Payout 1', { exact: true }).fill('Bread');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await expect.element(page.getByText('Required').first()).toBeVisible();
    expect(useCashierShiftStore.getState().cashClose).toBeNull();
  });

  it('asks to check numbers when Cash on Hand is not the expected amount', async () => {
    await openStepThree();
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await fillRest('1');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await expect
      .element(page.getByText(/check the numbers again/))
      .toBeVisible();
    expect(useCashierShiftStore.getState().cashClose).toBeNull();
  });

  it('alerts when Total POS differs from the credit totals', async () => {
    await openStepThree();
    await page.getByLabelText('Total POS (Card Sales)').fill('12');
    await expect.element(page.getByRole('alert')).toBeVisible();
  });

  it('totals payouts, saves cents and closes', async () => {
    let exited = false;
    await openStepThree(() => {
      exited = true;
    });
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await page.getByLabelText('Payout 1', { exact: true }).fill('Bread');
    await page.getByLabelText('Payout 1 type').selectOptions('vendor');
    await page.getByLabelText('Payout 1 amount').fill('7.25');
    await expect
      .element(page.getByTestId('total-payouts'))
      .toHaveTextContent('7.25');
    await fillRest('57.75');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await vi.waitFor(() => expect(exited).toBe(true));

    // All three steps are cleared once the shift is saved.
    expect(useCashierShiftStore.getState()).toMatchObject({
      creditTotals: null,
      dailySummary: null,
      cashClose: null,
    });
    expect(useShiftStore.getState().current).toEqual({ status: 'none' });
    // The three tables are saved on the device together with the close.
    expect(device.finished).toHaveLength(1);
    expect(device.finished[0].clientId).toBe(SHIFT_CLIENT_ID);
    expect(device.paths()).toEqual([
      'credit-totals',
      'daily-summary-reports',
      'payouts',
    ]);
    expect(device.body('credit-totals')).toMatchObject({
      shiftClientId: SHIFT_CLIENT_ID,
      userId: 4,
      creditTerminal: 10,
      creditTotal: 10,
    });
    expect(device.body('daily-summary-reports')).toMatchObject({
      shiftClientId: SHIFT_CLIENT_ID,
      fuelSales: 60,
      totalSales: 100,
    });
    expect(device.body('payouts')).toMatchObject({
      shiftClientId: SHIFT_CLIENT_ID,
      totalPos: 10,
      vendorPayout: 7.25,
      lottoPayout: 0,
      safedrops: 20,
      cashOnHand: 57.75,
    });
  });

  it('saves nothing until Save and Close is pressed', async () => {
    await openStepThree();
    expect(device.finished).toHaveLength(0);
    expect(window.api.shifts.finish).not.toHaveBeenCalled();
  });

  it('stays open when saving on the device fails, and a retry saves everything once', async () => {
    let exited = false;
    await openStepThree(() => {
      exited = true;
    });
    device.failNextFinish('Disk full');
    await page.getByLabelText('Total POS (Card Sales)').fill('10');
    await fillRest('65');
    await page.getByRole('button', { name: 'Save and Close' }).click();

    await expect.element(page.getByText('Disk full')).toBeVisible();
    expect(exited).toBe(false);
    expect(useShiftStore.getState().current.status).toBe('open');
    expect(device.finished).toHaveLength(0);

    await page.getByRole('button', { name: 'Save and Close' }).click();
    await vi.waitFor(() => expect(exited).toBe(true));
    expect(device.finished).toHaveLength(1);
  });
});
