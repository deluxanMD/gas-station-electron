import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { OutboxEntry } from '@/lib/ipc';
import { installFakeDevice, uninstallFakeDevice } from '@/test/fake-device';
import { useSyncStore } from '@/features/sync/sync-store';
import { SyncIssuesScreen } from '.';

const entry = (over: Partial<OutboxEntry>): OutboxEntry => ({
  id: '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90',
  userId: 7,
  shiftClientId: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91',
  entity: 'payouts',
  method: 'POST',
  path: 'payouts',
  payload: {},
  status: 'needs_attention',
  attempts: 1,
  nextAttemptAt: '2026-11-09T14:00:00.000Z',
  lastError: 'Shift is already closed',
  createdAt: '2026-11-09T14:00:00.000Z',
  updatedAt: '2026-11-09T14:00:00.000Z',
  ...over,
});

function device(entries: OutboxEntry[]): ReturnType<typeof installFakeDevice> {
  const fake = installFakeDevice();
  vi.mocked(window.api.outbox.list).mockResolvedValue(entries);
  return fake;
}

describe('SyncIssuesScreen (real browser)', () => {
  afterEach(() => {
    uninstallFakeDevice();
    useSyncStore.setState({ state: null });
  });

  it('says so when nothing needs attention', async () => {
    device([]);
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await expect
      .element(page.getByText('Nothing needs attention.'))
      .toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Save to a file' }))
      .not.toBeInTheDocument();
  });

  it('lists each refused change in plain words, with what the server said', async () => {
    device([
      entry({}),
      entry({
        id: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a99',
        entity: 'fuel-dip',
        lastError: 'Already saved for this shift',
      }),
    ]);
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await expect
      .element(page.getByText('Payouts and cash on hand'))
      .toBeVisible();
    await expect
      .element(page.getByText('Shift is already closed'))
      .toBeVisible();
    await expect.element(page.getByText('Fuel dips')).toBeVisible();
    await expect
      .element(page.getByText('Already saved for this shift'))
      .toBeVisible();
  });

  it('explains that the rest of a shift waits for a refused start', async () => {
    device([entry({ entity: 'shift-start', lastError: 'User not found' })]);
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await expect.element(page.getByText('Start of a shift')).toBeVisible();
    await expect
      .element(
        page.getByText('The rest of this shift is waiting for this one.'),
      )
      .toBeVisible();
  });

  it('sends a change again when asked', async () => {
    device([entry({})]);
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await page
      .getByRole('button', { name: 'Send again: Payouts and cash on hand' })
      .click();

    await vi.waitFor(() =>
      expect(window.api.outbox.retry).toHaveBeenCalledWith(
        '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90',
      ),
    );
  });

  it('reads the list again when the number needing attention changes', async () => {
    device([entry({})]);
    useSyncStore.setState({
      state: {
        connectivity: 'online',
        syncing: false,
        counts: {
          pending: 0,
          sending: 0,
          synced: 0,
          failed: 0,
          needs_attention: 1,
        },
        signInRequiredUserIds: [],
        lastSyncedAt: null,
      },
    });
    await render(<SyncIssuesScreen onExit={() => {}} />);
    await expect
      .element(page.getByText('Shift is already closed'))
      .toBeVisible();

    // The change was sent again and went through: the main process reports none left.
    vi.mocked(window.api.outbox.list).mockResolvedValue([]);
    useSyncStore.setState({
      state: {
        connectivity: 'online',
        syncing: false,
        counts: {
          pending: 0,
          sending: 0,
          synced: 1,
          failed: 0,
          needs_attention: 0,
        },
        signInRequiredUserIds: [],
        lastSyncedAt: null,
      },
    });

    await expect
      .element(page.getByText('Nothing needs attention.'))
      .toBeVisible();
  });

  it('saves the changes to a file the person chooses and says where', async () => {
    device([entry({})]);
    vi.mocked(window.api.outbox.exportEntries).mockResolvedValue({
      saved: true,
      path: '/Users/me/unsent-changes.json',
    });
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await page.getByRole('button', { name: 'Save to a file' }).click();

    await expect
      .element(page.getByText('Saved to /Users/me/unsent-changes.json'))
      .toBeVisible();
  });

  it('says nothing when the person cancels the save', async () => {
    device([entry({})]);
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await page.getByRole('button', { name: 'Save to a file' }).click();

    await vi.waitFor(() =>
      expect(window.api.outbox.exportEntries).toHaveBeenCalled(),
    );
    await expect.element(page.getByRole('note')).not.toBeInTheDocument();
  });

  it('shows why a change could not be sent again', async () => {
    device([entry({})]);
    vi.mocked(window.api.outbox.retry).mockRejectedValue(
      new Error('Disk full'),
    );
    await render(<SyncIssuesScreen onExit={() => {}} />);

    await page
      .getByRole('button', { name: 'Send again: Payouts and cash on hand' })
      .click();

    await expect.element(page.getByText('Disk full')).toBeVisible();
  });

  it('shows an error when the list cannot be read, and leaves through Back to home', async () => {
    device([]);
    vi.mocked(window.api.outbox.list).mockRejectedValue(
      new Error('Database locked'),
    );
    let left = false;
    await render(
      <SyncIssuesScreen
        onExit={() => {
          left = true;
        }}
      />,
    );

    await expect.element(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Back to home' }).click();
    expect(left).toBe(true);
  });
});
