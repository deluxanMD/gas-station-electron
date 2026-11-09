import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCashierShiftStore } from '@/features/daily-shift/cashier-shift/cashier-shift-store';
import { DailyShiftScreen } from '@/features/daily-shift/daily-shift-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function signInAsCashier(): void {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role: 'CASHIER' })}.sig`;
  useAuthStore.getState().signIn(token);
}

describe('Credit Totals window (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    useCashierShiftStore.setState({ creditTotals: null });
    localStorage.clear();
  });

  it('blocks Next until every amount is valid', async () => {
    signInAsCashier();
    await render(<DailyShiftScreen onExit={() => {}} />);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 1 of 3')).toBeVisible();
    await expect.element(page.getByText('Required').first()).toBeVisible();
  });

  it('saves amounts as cents and moves to the next window', async () => {
    signInAsCashier();
    await render(<DailyShiftScreen onExit={() => {}} />);

    await page.getByLabelText('Credit Totals - Terminal').fill('100.5');
    await page.getByLabelText('Credit Totals - Host').fill('100.50');
    await page.getByLabelText('Debit - Terminal').fill('20');
    await page.getByLabelText('Fleet').fill('0');
    await page.getByLabelText('SV Redemption').fill('3.07');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect.element(page.getByText('Step 2 of 3')).toBeVisible();
    expect(useCashierShiftStore.getState().creditTotals).toEqual({
      creditTerminalCents: 10_050,
      creditHostCents: 10_050,
      debitTerminalCents: 2000,
      fleetCents: 0,
      svRedemptionCents: 307,
    });

    await page.getByRole('button', { name: 'Back' }).click();
    await expect
      .element(page.getByLabelText('SV Redemption'))
      .toHaveValue('3.07');
  });
});
