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

const OPEN_SHIFT = {
  id: 9,
  userId: 4,
  startTime: '2026-11-09T14:00:00.000Z',
  endTime: null,
};

// Answers login, the current-shift lookup and any other call by URL.
function stubApi(currentShift: object | null = null, role = 'MANAGER'): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      const url = String(input);
      let data: object | null = {};
      if (url.includes('/auth/login')) data = { token: makeToken(role), id: 4 };
      else if (url.includes('/shifts/current')) data = currentShift;
      return Promise.resolve(Response.json({ data }));
    }),
  );
}

function saveSession(role = 'MANAGER'): void {
  localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      state: { token: makeToken(role), dbUserId: 4 },
      version: 0,
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
    stubApi();
    await render(<App />);
    await submitCredentials();

    await expect.element(page.getByText('Welcome, station1')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect.element(page.getByLabelText('User ID')).toBeVisible();
  });

  it('opens the home screen on load when a token is saved', async () => {
    stubApi();
    saveSession();
    await useAuthStore.persist.rehydrate();

    await render(<App />);

    await expect.element(page.getByText('Welcome, station1')).toBeVisible();
  });

  it('opens daily shift from the home card after confirming, and returns home', async () => {
    stubApi(OPEN_SHIFT, 'CASHIER');
    saveSession('CASHIER');
    await useAuthStore.persist.rehydrate();

    await render(<App />);
    await page.getByRole('button', { name: 'Daily Shift' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect.element(page.getByText('Step 1 of 3')).toBeVisible();

    await page.getByRole('button', { name: 'Back to home' }).click();
    await expect.element(page.getByText('Welcome, station1')).toBeVisible();
  });

  it('offers to start a shift when the user has none open', async () => {
    stubApi(null, 'CASHIER');
    saveSession('CASHIER');
    await useAuthStore.persist.rehydrate();

    await render(<App />);

    await expect
      .element(page.getByRole('button', { name: 'Start shift' }))
      .toBeVisible();
  });

  it('sends a user without an open shift away from the daily shift page', async () => {
    stubApi(null, 'CASHIER');
    saveSession('CASHIER');
    await useAuthStore.persist.rehydrate();
    window.location.hash = '#/daily-shift';

    await render(<App />);

    await expect.element(page.getByText('Welcome, station1')).toBeVisible();
  });

  it('opens the login screen on load when no token is saved', async () => {
    await useAuthStore.persist.rehydrate();

    await render(<App />);

    await expect.element(page.getByLabelText('User ID')).toBeVisible();
  });
});
