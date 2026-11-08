import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
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
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('walks a cashier through three steps with Next', async () => {
    signInAs('CASHIER');
    await render(<DailyShiftScreen onExit={() => {}} />);

    await expect.element(page.getByText('Step 1 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 2 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.element(page.getByText('Step 3 of 3')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Finish' }))
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
