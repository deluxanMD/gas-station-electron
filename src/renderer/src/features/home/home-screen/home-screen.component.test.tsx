import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { useAuthStore } from '@/features/auth/auth-store';
import { HomeScreen } from '@/features/home/home-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function signInAs(role: string): void {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role })}.sig`;
  useAuthStore.getState().signIn(token);
}

describe('HomeScreen modules by role (real browser)', () => {
  afterEach(() => {
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('shows every module an owner can view', async () => {
    signInAs('OWNER');
    await render(<HomeScreen userId="u1" onSignOut={() => {}} />);

    await expect
      .element(page.getByRole('button', { name: 'Fuel Pricing' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Cash Management' }))
      .toBeVisible();
  });

  it('hides modules a cashier cannot view', async () => {
    signInAs('CASHIER');
    await render(<HomeScreen userId="u1" onSignOut={() => {}} />);

    await expect
      .element(page.getByRole('button', { name: 'Daily Shift' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Fuel Pricing' }))
      .not.toBeInTheDocument();
  });
});
