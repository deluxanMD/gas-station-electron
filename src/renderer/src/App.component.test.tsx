import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import App from '@/App';

function mockSuccessfulLogin(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { userId: 'station1' } }),
    }),
  );
}

async function submitCredentials(): Promise<void> {
  await page.getByLabelText('User ID').fill('station1');
  await page.getByLabelText('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();
}

describe('App navigation (real browser)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('navigates to the home screen after login and back on sign out', async () => {
    mockSuccessfulLogin();
    await render(<App />);
    await submitCredentials();

    await expect.element(page.getByText('Welcome, station1')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect.element(page.getByLabelText('User ID')).toBeVisible();
  });
});
