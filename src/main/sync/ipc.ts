import { BrowserWindow, ipcMain, safeStorage } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc';
import type { Outbox } from '../outbox/outbox';
import type { SyncEngine } from './engine';
import type { SessionStore } from './session';
import type { Encryptor } from './types';

const sessionSchema = z.object({
  userId: z.number().int().positive(),
  accessToken: z.string().min(1).max(4096),
  refreshToken: z.string().min(1).max(4096),
});

const userIdSchema = z.number().int().positive();

/** Encrypts with the operating system's keychain; unavailable on a machine without one. */
export const keychainEncryptor: Encryptor = {
  get available(): boolean {
    return safeStorage.isEncryptionAvailable();
  },
  encrypt: (plain) => safeStorage.encryptString(plain),
  decrypt: (cipher) => safeStorage.decryptString(cipher),
};

export function registerSyncIpc(
  engine: SyncEngine,
  sessions: SessionStore,
  outbox: Outbox,
): void {
  ipcMain.handle(IpcChannel.SessionSet, (_event, input: unknown) => {
    const { userId, accessToken, refreshToken } = sessionSchema.parse(input);
    sessions.set(userId, { accessToken, refreshToken });
  });
  ipcMain.handle(IpcChannel.SessionRelease, (_event, userId: unknown) => {
    const id = userIdSchema.parse(userId);
    sessions.release(id, outbox.userIdsWithUnsynced().includes(id));
  });
  ipcMain.handle(IpcChannel.SyncGetState, () => engine.getState());
  ipcMain.handle(IpcChannel.SyncNow, () => engine.syncNow());

  engine.on('state', (state) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IpcChannel.SyncState, state);
    }
  });
}
