import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc';
import type { OutboxStatus } from '../../shared/ipc';
import type { Outbox } from './outbox';

const enqueueSchema = z.object({
  userId: z.number().int().positive(),
  shiftClientId: z.string().uuid().optional(),
  entity: z.string().min(1).max(50),
  method: z.enum(['POST', 'PUT', 'PATCH', 'DELETE']),
  // Only API paths: a queued write must never be aimed at another host.
  path: z
    .string()
    .regex(/^[a-z0-9\-/{}]+$/i, 'Invalid path')
    .max(200),
  payload: z.json(),
});

const statusSchema = z
  .enum(['pending', 'sending', 'synced', 'failed', 'needs_attention'])
  .optional();

// Every payload is validated here: the renderer is not trusted.
export function registerOutboxIpc(outbox: Outbox): void {
  ipcMain.handle(IpcChannel.OutboxEnqueue, (_event, input: unknown) =>
    outbox.enqueue(enqueueSchema.parse(input)),
  );
  ipcMain.handle(IpcChannel.OutboxList, (_event, status: unknown) =>
    outbox.list(statusSchema.parse(status) as OutboxStatus | undefined),
  );
  ipcMain.handle(IpcChannel.OutboxCounts, () => outbox.counts());
}
