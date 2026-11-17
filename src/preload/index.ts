import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IpcChannel } from '../shared/ipc';
import type {
  CacheApi,
  CredentialsApi,
  OutboxApi,
  SessionApi,
  ShiftsApi,
  SyncApi,
  SyncState,
} from '../shared/ipc';

// Custom APIs for renderer
const outbox: OutboxApi = {
  enqueue: (input) => ipcRenderer.invoke(IpcChannel.OutboxEnqueue, input),
  list: (status) => ipcRenderer.invoke(IpcChannel.OutboxList, status),
  counts: () => ipcRenderer.invoke(IpcChannel.OutboxCounts),
  retry: (id) => ipcRenderer.invoke(IpcChannel.OutboxRetry, id),
  exportEntries: (ids) => ipcRenderer.invoke(IpcChannel.OutboxExport, ids),
};

const session: SessionApi = {
  set: (input) => ipcRenderer.invoke(IpcChannel.SessionSet, input),
  release: (userId) => ipcRenderer.invoke(IpcChannel.SessionRelease, userId),
  renew: (userId) => ipcRenderer.invoke(IpcChannel.SessionRenew, userId),
};

const credentials: CredentialsApi = {
  remember: (input) =>
    ipcRenderer.invoke(IpcChannel.CredentialsRemember, input),
  loginOffline: (input) =>
    ipcRenderer.invoke(IpcChannel.CredentialsLoginOffline, input),
};

const sync: SyncApi = {
  getState: () => ipcRenderer.invoke(IpcChannel.SyncGetState),
  syncNow: () => ipcRenderer.invoke(IpcChannel.SyncNow),
  onState: (listener) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      state: SyncState,
    ): void => listener(state);
    ipcRenderer.on(IpcChannel.SyncState, handler);
    return () => {
      ipcRenderer.removeListener(IpcChannel.SyncState, handler);
    };
  },
};

const shifts: ShiftsApi = {
  current: (userId) => ipcRenderer.invoke(IpcChannel.ShiftsCurrent, userId),
  start: (userId, who) =>
    ipcRenderer.invoke(IpcChannel.ShiftsStart, userId, who),
  today: (query) => ipcRenderer.invoke(IpcChannel.ShiftsToday, query),
  consolidate: (clientIds) =>
    ipcRenderer.invoke(IpcChannel.ShiftsConsolidate, clientIds),
  adopt: (input) => ipcRenderer.invoke(IpcChannel.ShiftsAdopt, input),
  finish: (input) => ipcRenderer.invoke(IpcChannel.ShiftsFinish, input),
};

const cache: CacheApi = {
  get: (key) => ipcRenderer.invoke(IpcChannel.CacheGet, key),
  put: (key, value) => ipcRenderer.invoke(IpcChannel.CachePut, key, value),
};

const api = { outbox, session, sync, shifts, credentials, cache };

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
