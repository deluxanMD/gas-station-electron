import type { ElectronAPI } from '@electron-toolkit/preload';
import type {
  CacheApi,
  CredentialsApi,
  OutboxApi,
  SessionApi,
  ShiftsApi,
  SyncApi,
} from '../shared/ipc';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: {
      outbox: OutboxApi;
      session: SessionApi;
      sync: SyncApi;
      shifts: ShiftsApi;
      credentials: CredentialsApi;
      cache: CacheApi;
    };
  }
}
