import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import type { OutboxEntry, SyncState } from '@/lib/ipc';
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

// The device lists what the screen asks for: the refused changes and the ones still waiting are read separately.
function device(
  refused: OutboxEntry[],
  waiting: OutboxEntry[] = [],
): ReturnType<typeof installFakeDevice> {
  const fake = installFakeDevice();
  vi.mocked(window.api.outbox.list).mockImplementation((status) =>
    Promise.resolve(status === 'needs_attention' ? refused : waiting),
  );
  return fake;
}

const syncState = (over: Partial<SyncState> = {}): SyncState => ({
  connectivity: 'online',
  syncing: false,
  counts: { pending: 0, sending: 0, synced: 0, failed: 0, needs_attention: 0 },
  signInRequiredUserIds: [],
  lastSyncedAt: null,
  ...over,
});

const waitingEntry = (over: Partial<OutboxEntry>): OutboxEntry =>
  entry({ status: 'pending', lastError: null, attempts: 0, ...over });

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
    vi.mocked(window.api.outbox.list).mockImplementation(() =>
      Promise.resolve([]),
    );
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

  describe('waiting to be sent', () => {
    it('says so when nothing is waiting', async () => {
      device([], []);
      useSyncStore.setState({ state: syncState() });
      await render(<SyncIssuesScreen onExit={() => {}} />);

      await expect
        .element(page.getByText('Nothing is waiting to be sent.'))
        .toBeVisible();
      await expect
        .element(page.getByRole('button', { name: 'Try now' }))
        .not.toBeInTheDocument();
    });

    it('lists what is waiting, in plain words, with why it has not gone', async () => {
      device(
        [],
        [
          waitingEntry({ entity: 'credit-totals' }),
          waitingEntry({
            entity: 'fuel-dip',
            id: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a99',
          }),
        ],
      );
      useSyncStore.setState({
        state: syncState({
          connectivity: 'offline',
          counts: {
            pending: 2,
            sending: 0,
            synced: 0,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });
      await render(<SyncIssuesScreen onExit={() => {}} />);

      await expect.element(page.getByText('Credit totals')).toBeVisible();
      await expect.element(page.getByText('Fuel dips')).toBeVisible();
      await expect
        .element(
          page.getByText('Waiting for a connection to the server.').first(),
        )
        .toBeVisible();
    });

    it('says a person has to sign in again when that is what it waits for', async () => {
      device([], [waitingEntry({ userId: 7 })]);
      useSyncStore.setState({
        state: syncState({
          connectivity: 'online',
          signInRequiredUserIds: [7],
          counts: {
            pending: 1,
            sending: 0,
            synced: 0,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });
      await render(<SyncIssuesScreen onExit={() => {}} />);

      await expect
        .element(
          page.getByText(
            'Waiting for the person who made it to sign in again.',
          ),
        )
        .toBeVisible();
    });

    it('says when a server problem will be tried again', async () => {
      device(
        [],
        [
          waitingEntry({
            attempts: 1,
            lastError: 'Database down',
            nextAttemptAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          }),
        ],
      );
      useSyncStore.setState({
        state: syncState({
          counts: {
            pending: 1,
            sending: 0,
            synced: 0,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });
      await render(<SyncIssuesScreen onExit={() => {}} />);

      await expect
        .element(
          page.getByText(
            /The server had a problem \(Database down\)\. Trying again at/,
          ),
        )
        .toBeVisible();
    });

    it('says a later change of a shift waits for the earlier ones', async () => {
      const shift = '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91';
      device(
        [],
        [
          waitingEntry({ entity: 'shift-start', shiftClientId: shift }),
          waitingEntry({
            id: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a99',
            entity: 'shift-close',
            shiftClientId: shift,
          }),
        ],
      );
      useSyncStore.setState({
        state: syncState({
          counts: {
            pending: 2,
            sending: 0,
            synced: 0,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });
      await render(<SyncIssuesScreen onExit={() => {}} />);

      await expect.element(page.getByText('Queued to be sent.')).toBeVisible();
      await expect
        .element(
          page.getByText(
            'Waiting for an earlier change of the same shift to go first.',
          ),
        )
        .toBeVisible();
    });

    it('asks the sync to run now', async () => {
      device([], [waitingEntry({})]);
      useSyncStore.setState({
        state: syncState({
          counts: {
            pending: 1,
            sending: 0,
            synced: 0,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });
      await render(<SyncIssuesScreen onExit={() => {}} />);

      await page.getByRole('button', { name: 'Try now' }).click();

      await vi.waitFor(() =>
        expect(window.api.sync.syncNow).toHaveBeenCalled(),
      );
    });

    it('reads the list again as changes are sent', async () => {
      device([], [waitingEntry({})]);
      useSyncStore.setState({
        state: syncState({
          counts: {
            pending: 1,
            sending: 0,
            synced: 0,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });
      await render(<SyncIssuesScreen onExit={() => {}} />);
      await expect
        .element(page.getByText('Payouts and cash on hand'))
        .toBeVisible();

      vi.mocked(window.api.outbox.list).mockImplementation(() =>
        Promise.resolve([]),
      );
      useSyncStore.setState({
        state: syncState({
          counts: {
            pending: 0,
            sending: 0,
            synced: 1,
            failed: 0,
            needs_attention: 0,
          },
        }),
      });

      await expect
        .element(page.getByText('Nothing is waiting to be sent.'))
        .toBeVisible();
    });
  });
});
