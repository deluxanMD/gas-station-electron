import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import App from '@/App';
import { AUTH_STORAGE_KEY, useAuthStore } from '@/features/auth/auth-store';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function makeToken(role = 'MANAGER'): string {
  return `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'station1', role })}.signature`;
}

function mockSuccessfulLogin(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { token: makeToken() } }),
    }),
  );
}

async function submitCredentials(): Promise<void> {
  await page.getByLabelText('User ID').fill('station1');
  await page.getByLabelText('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

describe('App navigation (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().signOut();
    localStorage.clear();
    // Hash routing persists across tests in the same page.
    window.location.hash = '';
  });

  it('navigates to the home screen after login and back on sign out', async () => {
    mockSuccessfulLogin();
    await render(<App />);
    await submitCredentials();

    await expect.element(page.getByText('Welcome, station1')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect.element(page.getByLabelText('User ID')).toBeVisible();
  });

  it('opens the home screen on load when a token is saved', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { token: makeToken() }, version: 0 }),
    );
    await useAuthStore.persist.rehydrate();

    await render(<App />);

    await expect.element(page.getByText('Welcome, station1')).toBeVisible();
  });

  it('opens daily shift from the home card and returns home', async () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { token: makeToken('CASHIER') }, version: 0 }),
    );
    await useAuthStore.persist.rehydrate();

    await render(<App />);
    await page.getByRole('button', { name: 'Daily Shift' }).click();
    await expect.element(page.getByText('Step 1 of 3')).toBeVisible();

    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect.element(page.getByText('Welcome, station1')).toBeVisible();
  });

  it('opens the login screen on load when no token is saved', async () => {
    await useAuthStore.persist.rehydrate();

    await render(<App />);

    await expect.element(page.getByLabelText('User ID')).toBeVisible();
  });
});
