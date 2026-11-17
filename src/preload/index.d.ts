import type { ElectronAPI } from '@electron-toolkit/preload';
import type { OutboxApi } from '../shared/ipc';

declare global {
  interface Window {
    electron: ElectronAPI;
    api: { outbox: OutboxApi };
  }
}
