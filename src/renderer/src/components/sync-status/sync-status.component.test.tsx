import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { SyncState } from '@/lib/ipc';
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
});
