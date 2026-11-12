import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

async function openStepTwo(): Promise<void> {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'CASHIER' })}.sig`;
  useAuthStore.getState().signIn(token, 7);
  await render(<DailyShiftScreen onExit={() => {}} />);

  await page.getByLabelText('Credit Totals - Terminal').fill('1');
  await page.getByLabelText('Credit Totals - Host').fill('1');
  await page.getByLabelText('Debit - Terminal').fill('1');
  await page.getByLabelText('Fleet').fill('1');
  await page.getByLabelText('SV Redemption').fill('1');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect.element(page.getByText('Step 2 of 3')).toBeVisible();
}

async function fillSummary(totalSales: string): Promise<void> {
  await page.getByLabelText('Day End Date').fill('2026-11-09');
  await page.getByLabelText('Day End Time (AM/PM)').fill('23:30');
  await page.getByLabelText('Fuel Sales').fill('100');
  await page.getByLabelText('Item Sales').fill('50');
  await page.getByLabelText('GST').fill('7.50');
  await page.getByLabelText('HST').fill('0');
  await page.getByLabelText('Penny Rounding').fill('-0.02');
  await page.getByLabelText('Total Sales').fill(totalSales);
}

describe('Daily Summary window (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    useCashierShiftStore.setState({
      creditTotals: null,
      dailySummary: null,
      cashClose: null,
    });
    localStorage.clear();
  });

  it('asks to verify when the parts do not add up to Total Sales', async () => {
    await openStepTwo();
    await fillSummary('999');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText(/Please verify/)).toBeVisible();
    await expect.element(page.getByText('Step 2 of 3')).toBeVisible();
  });

  it('prefills the shift number with the shift id', async () => {
    await openStepTwo();
    await expect.element(page.getByLabelText('Shift Number')).toHaveValue('7');
  });

  it('requires a reason when the shift number is changed', async () => {
    await openStepTwo();
    await fillSummary('157.48');
    await page.getByLabelText('Shift Number').fill('8');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText(/Give a reason/)).toBeVisible();
    await page.getByLabelText('Reason for Change').fill('Missed shift');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
  });

  it('saves the summary as cents and moves on', async () => {
    await openStepTwo();
    await fillSummary('157.48');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
    expect(useCashierShiftStore.getState().dailySummary).toEqual({
      dayEndDate: '2026-11-09',
      dayEndTime: '23:30',
      shiftNumber: 7,
      shiftChangeReason: '',
      fuelSalesCents: 10_000,
      itemSalesCents: 5000,
      gstCents: 750,
      hstCents: 0,
      pennyRoundingCents: -2,
      totalSalesCents: 15_748,
    });
  });
});
