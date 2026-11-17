import type { ElectronAPI } from '@electron-toolkit/preload';
import type { OutboxApi, SessionApi, SyncApi } from '../shared/ipc';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: { outbox: OutboxApi; session: SessionApi; sync: SyncApi };
  }
}
