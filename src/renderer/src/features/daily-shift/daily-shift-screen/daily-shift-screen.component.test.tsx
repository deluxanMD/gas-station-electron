import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function signInAs(role: string): void {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role })}.sig`;
  useAuthStore.getState().signIn(token);
}

describe('DailyShiftScreen (real browser)', () => {
  afterEach(() => {
    useCashierShiftStore.setState({
      creditTotals: null,
      dailySummary: null,
      cashClose: null,
    });
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('walks a cashier through three steps with Next', async () => {
    signInAs('CASHIER');
    await render(<DailyShiftScreen onExit={() => {}} />);

    await expect.element(page.getByText('Step 1 of 3')).toBeVisible();
    for (const label of [
      'Credit Totals - Terminal',
      'Credit Totals - Host',
      'Debit - Terminal',
      'Fleet',
      'SV Redemption',
    ]) {
      await page.getByLabelText(label).fill('1.00');
    }
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 2 of 3')).toBeVisible();
    await page.getByLabelText('Day End Date').fill('2026-11-09');
    await page.getByLabelText('Day End Time (AM/PM)').fill('23:30');
    for (const label of ['Fuel Sales', 'Item Sales', 'GST', 'HST']) {
      await page.getByLabelText(label).fill('1.00');
    }
    await page.getByLabelText('Penny Rounding').fill('0');
    await page.getByLabelText('Total Sales').fill('4.00');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Save and Close' }))
      .toBeVisible();
  });

  it('has no flow for a role without one yet', async () => {
    signInAs('MANAGER');
    await render(<DailyShiftScreen onExit={() => {}} />);

    await expect
      .element(page.getByText(/not available for your role yet/))
      .toBeVisible();
  });
});
