import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc';
import type { LocalShifts } from './localShifts';

const userIdSchema = z.number().int().positive();

const adoptSchema = z.object({
  userId: userIdSchema,
  id: z.number().int().positive(),
  clientId: z.string().uuid().nullable(),
  startTime: z.iso.datetime({ offset: true }),
});

const finishSchema = z.object({
  clientId: z.string().uuid(),
  writes: z
    .array(
      z.object({
        entity: z.string().min(1).max(50),
        // Only API paths: a queued write must never be aimed at another host.
        path: z
          .string()
          .regex(/^[a-z0-9-/]+$/i, 'Invalid path')
          .max(200),
        payload: z.record(z.string(), z.json()),
      }),
    )
    .max(50),
});

// Every payload is validated here: the renderer is not trusted.
export function registerShiftsIpc(shifts: LocalShifts): void {
  ipcMain.handle(IpcChannel.ShiftsCurrent, (_event, userId: unknown) =>
    shifts.current(userIdSchema.parse(userId)),
  );
  ipcMain.handle(IpcChannel.ShiftsStart, (_event, userId: unknown) =>
    shifts.start(userIdSchema.parse(userId)),
  );
  ipcMain.handle(IpcChannel.ShiftsAdopt, (_event, input: unknown) =>
    shifts.adopt(adoptSchema.parse(input)),
  );
  ipcMain.handle(IpcChannel.ShiftsFinish, (_event, input: unknown) =>
    shifts.finish(finishSchema.parse(input)),
  );
}
