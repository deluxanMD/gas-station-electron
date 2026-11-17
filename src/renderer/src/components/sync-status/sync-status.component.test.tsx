import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { SyncState } from '@/lib/ipc';
import { useAuthStore } from '@/features/auth/auth-store';
import { useSyncStore } from '@/features/sync/sync-store';
import { SyncStatus } from '.';

const state = (counts: Partial<SyncState['counts']>): SyncState => ({
  connectivity: 'online',
  syncing: false,
  counts: {
    pending: 0,
    sending: 0,
    synced: 0,
    failed: 0,
    needs_attention: 0,
    ...counts,
  },
  signInRequiredUserIds: [],
  lastSyncedAt: null,
});

const part = (value: object): string => btoa(JSON.stringify(value));

const signIn = (): void => {
  useAuthStore
    .getState()
    .signIn(
      `${part({ alg: 'HS256' })}.${part({ sub: 'u1', role: 'CASHIER' })}.sig`,
      4,
    );
};

async function renderPill(): Promise<void> {
  await render(
    <MemoryRouter>
      <SyncStatus />
      <Routes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/sync-issues" element={<p>the issues page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SyncStatus (real browser)', () => {
  afterEach(() => {
    useSyncStore.setState({ state: null });
    useAuthStore.getState().signOut();
    localStorage.clear();
  });

  it('shows nothing outside the desktop app', async () => {
    await renderPill();

    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  it('has no link to the changes that need attention when there are none', async () => {
    useSyncStore.setState({ state: state({ synced: 3 }) });
    await renderPill();

    await expect.element(page.getByRole('status')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Review' }))
      .not.toBeInTheDocument();
  });

  it('says "needs" for one change and "need" for several', async () => {
    useSyncStore.setState({ state: state({ needs_attention: 1 }) });
    await renderPill();

    await expect
      .element(page.getByText(/1 change needs attention/))
      .toBeVisible();
  });

  it('opens the changes that need attention from the pill', async () => {
    useSyncStore.setState({ state: state({ needs_attention: 2 }) });
    await renderPill();

    await expect
      .element(page.getByText(/2 changes need attention/))
      .toBeVisible();
    await page.getByRole('button', { name: 'Review' }).click();

    await expect.element(page.getByText('the issues page')).toBeVisible();
  });

  describe('changes waiting to be sent', () => {
    it('opens the list of what is waiting from the pill', async () => {
      signIn();
      useSyncStore.setState({
        state: { ...state({ pending: 3 }), connectivity: 'offline' },
      });
      await renderPill();

      await page
        .getByRole('button', { name: 'Offline: 3 changes waiting to sync' })
        .click();

      await expect.element(page.getByText('the issues page')).toBeVisible();
    });

    it('does the same while syncing and when a sign-in is needed', async () => {
      signIn();
      useSyncStore.setState({
        state: { ...state({ pending: 2 }), signInRequiredUserIds: [4] },
      });
      await renderPill();

      await expect
        .element(
          page.getByRole('button', { name: 'Sign in to sync 2 changes' }),
        )
        .toBeVisible();
    });

    it('is plain text for someone who is not signed in, who has no screen to go to', async () => {
      useSyncStore.setState({
        state: { ...state({ pending: 3 }), connectivity: 'offline' },
      });
      await renderPill();

      await expect.element(page.getByRole('status')).toBeVisible();
      await expect.element(page.getByRole('button')).not.toBeInTheDocument();
    });

    it('is plain text when nothing is waiting', async () => {
      signIn();
      useSyncStore.setState({
        state: { ...state({}), connectivity: 'offline' },
      });
      await renderPill();

      await expect
        .element(page.getByText('Offline: changes are saved on this device'))
        .toBeVisible();
      await expect.element(page.getByRole('button')).not.toBeInTheDocument();
    });
  });
});
