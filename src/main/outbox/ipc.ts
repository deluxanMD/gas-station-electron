import { writeFile } from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc';
import type { ExportResult } from '../../shared/ipc';
import type { Outbox } from './outbox';
import { serializeEntries } from './exportEntries';

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

const oneStatus = z.enum([
  'pending',
  'sending',
  'synced',
  'failed',
  'needs_attention',
]);
const statusSchema = z.union([oneStatus, z.array(oneStatus).max(5)]).optional();

// Every payload is validated here: the renderer is not trusted.
export function registerOutboxIpc(outbox: Outbox): void {
  ipcMain.handle(IpcChannel.OutboxEnqueue, (_event, input: unknown) =>
    outbox.enqueue(enqueueSchema.parse(input)),
  );
  ipcMain.handle(IpcChannel.OutboxList, (_event, status: unknown) =>
    outbox.list(statusSchema.parse(status)),
  );
  ipcMain.handle(IpcChannel.OutboxCounts, () => outbox.counts());
  ipcMain.handle(IpcChannel.OutboxRetry, (_event, id: unknown) =>
    outbox.requeue(z.string().uuid().parse(id)),
  );
  ipcMain.handle(
    IpcChannel.OutboxExport,
    async (event, ids: unknown): Promise<ExportResult> => {
      const wanted = z.array(z.string().uuid()).max(500).optional().parse(ids);
      const entries = outbox
        .list()
        .filter((entry) =>
          wanted
            ? wanted.includes(entry.id)
            : entry.status === 'needs_attention',
        );
      const now = new Date();
      const window = BrowserWindow.fromWebContents(event.sender);
      const options = {
        defaultPath: `unsent-changes-${now.toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      };
      // The person chooses where it goes; nothing is written anywhere else.
      const choice = window
        ? await dialog.showSaveDialog(window, options)
        : await dialog.showSaveDialog(options);
      if (choice.canceled || !choice.filePath) return { saved: false };
      await writeFile(choice.filePath, serializeEntries(entries, now), 'utf8');
      return { saved: true, path: choice.filePath };
    },
  );
}
