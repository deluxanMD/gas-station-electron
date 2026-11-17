import { describe, expect, it } from 'vitest';
import type { OutboxEntry } from '../../shared/ipc';
import { serializeEntries } from './exportEntries';

const entry: OutboxEntry = {
  id: '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90',
  userId: 7,
  shiftClientId: '9a1b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a91',
  entity: 'payouts',
  method: 'POST',
  path: 'payouts',
  payload: { totalPos: 10.5, shiftClientId: 'x' },
  status: 'needs_attention',
  attempts: 1,
  nextAttemptAt: '2026-01-01T08:00:00.000Z',
  lastError: 'Shift is already closed',
  createdAt: '2026-01-01T07:00:00.000Z',
  updatedAt: '2026-01-01T08:00:00.000Z',
};

describe('serializeEntries', () => {
  it('keeps what was entered, when, and why the server refused it', () => {
    const parsed = JSON.parse(
      serializeEntries([entry], new Date('2026-01-02T09:00:00.000Z')),
    );

    expect(parsed.exportedAt).toBe('2026-01-02T09:00:00.000Z');
    expect(parsed.entries).toEqual([
      {
        id: entry.id,
        madeAt: '2026-01-01T07:00:00.000Z',
        userId: 7,
        shiftClientId: entry.shiftClientId,
        entity: 'payouts',
        request: 'POST payouts',
        status: 'needs_attention',
        attempts: 1,
        serverMessage: 'Shift is already closed',
        payload: { totalPos: 10.5, shiftClientId: 'x' },
      },
    ]);
  });

  it('is readable text and handles nothing to export', () => {
    const text = serializeEntries([], new Date('2026-01-02T09:00:00.000Z'));

    expect(text).toContain('\n');
    expect(JSON.parse(text).entries).toEqual([]);
  });
});
