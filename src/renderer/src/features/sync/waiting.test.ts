import { describe, expect, it } from 'vitest';
import type { OutboxEntry, SyncState } from '@/lib/ipc';
import { describeWaiting } from './waiting';

const SHIFT = '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91';
const NOW = new Date('2026-11-09T14:00:00.000Z');

const entry = (over: Partial<OutboxEntry>): OutboxEntry => ({
  id: crypto.randomUUID(),
  userId: 7,
  shiftClientId: null,
  entity: 'payouts',
  method: 'POST',
  path: 'payouts',
  payload: {},
  status: 'pending',
  attempts: 0,
  nextAttemptAt: '2026-11-09T13:00:00.000Z',
  lastError: null,
  createdAt: '2026-11-09T13:00:00.000Z',
  updatedAt: '2026-11-09T13:00:00.000Z',
  ...over,
});

const online: Pick<SyncState, 'connectivity' | 'signInRequiredUserIds'> = {
  connectivity: 'online',
  signInRequiredUserIds: [],
};

const kinds = (
  entries: OutboxEntry[],
  state: Parameters<typeof describeWaiting>[1] = online,
): string[] =>
  describeWaiting(entries, state, NOW).map((item) => item.reason.kind);

describe('describeWaiting', () => {
  it('says a change is being sent right now', () => {
    expect(kinds([entry({ status: 'sending' })])).toEqual(['sending']);
  });

  it('says when it is only waiting for a connection', () => {
    expect(
      kinds([entry({})], {
        connectivity: 'offline',
        signInRequiredUserIds: [],
      }),
    ).toEqual(['offline']);
  });

  it('puts a needed sign-in before the connection, since signing in is what the person can do', () => {
    expect(
      kinds([entry({ userId: 7 }), entry({ userId: 8 })], {
        connectivity: 'offline',
        signInRequiredUserIds: [7],
      }),
    ).toEqual(['sign-in', 'offline']);
  });

  it('says a later change of a shift waits for the earlier ones, and others do not', () => {
    const other = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';

    expect(
      kinds([
        entry({ shiftClientId: SHIFT, entity: 'shift-start' }),
        entry({ shiftClientId: SHIFT }),
        entry({ shiftClientId: SHIFT, entity: 'shift-close' }),
        entry({ shiftClientId: other }),
        entry({}),
      ]),
    ).toEqual([
      'queued',
      'earlier-change',
      'earlier-change',
      'queued',
      'queued',
    ]);
  });

  it('shows the server problem and when it will be tried again', () => {
    const [item] = describeWaiting(
      [
        entry({
          attempts: 1,
          lastError: 'Database down',
          nextAttemptAt: '2026-11-09T14:05:00.000Z',
        }),
      ],
      online,
      NOW,
    );

    expect(item.reason).toEqual({
      kind: 'retry',
      at: '2026-11-09T14:05:00.000Z',
      message: 'Database down',
    });
  });

  it('treats a retry that has come due as simply queued', () => {
    expect(
      kinds([
        entry({
          lastError: 'Database down',
          nextAttemptAt: '2026-11-09T13:59:00.000Z',
        }),
      ]),
    ).toEqual(['queued']);
  });

  it('keeps the changes in the order given and says nothing for an empty list', () => {
    const a = entry({ id: '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90' });
    const b = entry({ id: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a99' });

    expect(describeWaiting([a, b], online, NOW).map((i) => i.entry.id)).toEqual(
      [a.id, b.id],
    );
    expect(describeWaiting([], online, NOW)).toEqual([]);
  });
});
