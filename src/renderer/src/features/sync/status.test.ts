import { describe, expect, it } from 'vitest';
import type { SyncState } from '../../../../shared/ipc';
import { describeSync } from './status';

const state = (
  overrides: Partial<SyncState> = {},
  counts: Partial<SyncState['counts']> = {},
): SyncState => ({
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
  ...overrides,
});

describe('describeSync', () => {
  it('is synced when online with nothing waiting', () => {
    expect(describeSync(state({}, { synced: 5 }))).toEqual({
      kind: 'synced',
      waiting: 0,
      needsAttention: 0,
    });
  });

  it('counts pending, sending and failed writes as waiting', () => {
    const view = describeSync(
      state({ syncing: true }, { pending: 2, sending: 1, failed: 1 }),
    );

    expect(view).toMatchObject({ kind: 'syncing', waiting: 4 });
  });

  it('shows offline, with how many are waiting', () => {
    expect(
      describeSync(state({ connectivity: 'offline' }, { pending: 3 })),
    ).toMatchObject({
      kind: 'offline',
      waiting: 3,
    });
  });

  it('asks the user to sign in before reporting offline', () => {
    expect(
      describeSync(
        state(
          { connectivity: 'offline', signInRequiredUserIds: [7] },
          { pending: 1 },
        ),
      ).kind,
    ).toBe('sign-in');
  });

  it('puts a refused write above everything else', () => {
    const view = describeSync(
      state(
        { connectivity: 'offline', signInRequiredUserIds: [7] },
        { pending: 1, needs_attention: 2 },
      ),
    );

    expect(view).toMatchObject({ kind: 'attention', needsAttention: 2 });
  });
});
