import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { ModuleId } from '@/features/auth/types';
import { useAuthStore } from '@/features/auth/auth-store';
import { useShiftStore } from '@/features/shift/shift-store';
import { resetShiftStore, seedOpenShift } from '@/features/shift/test-utils';
import { HomeScreen } from '@/features/home/home-screen';

function encodePart(value: object): string {
  return btoa(JSON.stringify(value));
}

function signInAs(role: string): void {
  const token = `${encodePart({ alg: 'HS256' })}.${encodePart({ sub: 'u1', role })}.sig`;
  useAuthStore.getState().signIn(token, 4);
}

async function renderHome(
  onSelectModule: (id: ModuleId) => void = () => {},
): Promise<void> {
  await render(
    <HomeScreen
      userId="u1"
      onSignOut={() => {}}
      onSelectModule={onSelectModule}
    />,
  );
}

describe('HomeScreen modules by role (real browser)', () => {
  afterEach(() => {
    resetShiftStore();
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('shows every module an owner can view', async () => {
    signInAs('OWNER');
    await renderHome();

    await expect
      .element(page.getByRole('button', { name: 'Fuel Pricing' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Cash Management' }))
      .toBeVisible();
  });

  it('hides modules a cashier cannot view', async () => {
    signInAs('CASHIER');
    seedOpenShift();
    await renderHome();

    await expect
      .element(page.getByRole('button', { name: 'Daily Shift' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Fuel Pricing' }))
      .not.toBeInTheDocument();
  });
});

describe('HomeScreen shift (real browser)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetShiftStore();
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('starts a shift from the welcome header', async () => {
    signInAs('CASHIER');
    useShiftStore.setState({ current: { status: 'none' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({
            data: {
              id: 9,
              userId: 4,
              startTime: '2026-11-09T14:00:00.000Z',
              endTime: null,
            },
          }),
        ),
      ),
    );
    await renderHome();

    await page.getByRole('button', { name: 'Start shift' }).click();

    await expect.element(page.getByText(/Shift started at/)).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Start shift' }))
      .not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/shifts$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: 4 }),
      }),
    );
  });

  it('shows why a shift could not be started and keeps the button', async () => {
    signInAs('CASHIER');
    useShiftStore.setState({ current: { status: 'none' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({ message: 'Database down' }, { status: 500 }),
        ),
      ),
    );
    await renderHome();

    await page.getByRole('button', { name: 'Start shift' }).click();

    await expect.element(page.getByText('Database down')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Start shift' }))
      .toBeEnabled();
  });

  it('keeps Daily Shift locked until a shift is started', async () => {
    signInAs('CASHIER');
    useShiftStore.setState({ current: { status: 'none' } });
    await renderHome();

    // The card's name also carries its hint, hence the pattern.
    await expect
      .element(page.getByRole('button', { name: /^Daily Shift/ }))
      .toBeDisabled();
    await expect
      .element(page.getByText('Start your shift first.'))
      .toBeVisible();
  });

  it('asks before opening Daily Shift and opens it on Continue', async () => {
    signInAs('CASHIER');
    seedOpenShift();
    const onSelectModule = vi.fn();
    await renderHome(onSelectModule);

    await page.getByRole('button', { name: 'Daily Shift' }).click();
    await expect
      .element(page.getByRole('dialog', { name: 'Ready to close your shift?' }))
      .toBeVisible();
    expect(onSelectModule).not.toHaveBeenCalled();

    await page.getByRole('button', { name: 'Continue' }).click();
    expect(onSelectModule).toHaveBeenCalledWith('daily-shift');
  });

  it('stays on the home screen when the confirmation is declined', async () => {
    signInAs('CASHIER');
    seedOpenShift();
    const onSelectModule = vi.fn();
    await renderHome(onSelectModule);

    await page.getByRole('button', { name: 'Daily Shift' }).click();
    await page.getByRole('button', { name: 'Not yet' }).click();

    expect(onSelectModule).not.toHaveBeenCalled();
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no shift controls or closing prompt for a manager', async () => {
    signInAs('MANAGER');
    useShiftStore.setState({ current: { status: 'none' } });
    const onSelectModule = vi.fn();
    await renderHome(onSelectModule);

    await expect
      .element(page.getByRole('button', { name: 'Start shift' }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: /^Daily Shift/ }))
      .toBeEnabled();

    await page.getByRole('button', { name: /^Daily Shift/ }).click();
    expect(onSelectModule).toHaveBeenCalledWith('daily-shift');
    await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
  });
});
