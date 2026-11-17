import type { OutboxEntry } from '../../shared/ipc';

/**
 * The writes as a person can read and keep them: what was entered, when, and why the server refused it, so nothing
 * that cannot be sent is ever out of reach.
 */
export function serializeEntries(
  entries: readonly OutboxEntry[],
  exportedAt: Date,
): string {
  return JSON.stringify(
    {
      exportedAt: exportedAt.toISOString(),
      entries: entries.map((entry) => ({
        id: entry.id,
        madeAt: entry.createdAt,
        userId: entry.userId,
        shiftClientId: entry.shiftClientId,
        entity: entry.entity,
        request: `${entry.method} ${entry.path}`,
        status: entry.status,
        attempts: entry.attempts,
        serverMessage: entry.lastError,
        payload: entry.payload,
      })),
    },
    null,
    2,
  );
}
