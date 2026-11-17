import { BrowserWindow, ipcMain, safeStorage } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc';
import type { OfflineLoginResult } from '../../shared/ipc';
import type { Credentials } from '../auth/credentials';
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

const rememberSchema = z.object({
  userId: z.string().min(1).max(50),
  dbUserId: z.number().int().positive(),
  role: z.string().max(50).nullable(),
  password: z.string().min(1).max(128),
});

const offlineLoginSchema = z.object({
  userId: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
});

export function registerSyncIpc(
  engine: SyncEngine,
  sessions: SessionStore,
  outbox: Outbox,
  credentials: Credentials,
): void {
  ipcMain.handle(IpcChannel.SessionSet, (_event, input: unknown) => {
    const { userId, accessToken, refreshToken } = sessionSchema.parse(input);
    sessions.set(userId, { accessToken, refreshToken });
  });
  ipcMain.handle(IpcChannel.SessionRelease, (_event, userId: unknown) => {
    const id = userIdSchema.parse(userId);
    // The session stays while writes wait, and for anyone who can sign in offline: they need it to sync and to work.
    sessions.release(
      id,
      outbox.userIdsWithUnsynced().includes(id) || credentials.has(id),
    );
  });
  ipcMain.handle(IpcChannel.SessionRenew, (_event, userId: unknown) =>
    engine.renewAccessToken(userIdSchema.parse(userId)),
  );
  ipcMain.handle(IpcChannel.CredentialsRemember, (_event, input: unknown) =>
    credentials.remember(rememberSchema.parse(input)),
  );
  ipcMain.handle(
    IpcChannel.CredentialsLoginOffline,
    async (_event, input: unknown): Promise<OfflineLoginResult> => {
      const verdict = await credentials.verify(offlineLoginSchema.parse(input));
      if (verdict.status !== 'ok') return verdict;
      const token = sessions.get(verdict.dbUserId)?.accessToken;
      // Without a session the device has nothing to act for this user: only an online sign-in can fix that.
      return token
        ? {
            status: 'ok',
            dbUserId: verdict.dbUserId,
            role: verdict.role,
            token,
          }
        : { status: 'unavailable' };
    },
  );
  ipcMain.handle(IpcChannel.SyncGetState, () => engine.getState());
  ipcMain.handle(IpcChannel.SyncNow, () => engine.syncNow());

  engine.on('state', (state) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IpcChannel.SyncState, state);
    }
  });
}
