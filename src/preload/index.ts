import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IpcChannel } from '../shared/ipc';
import type { OutboxApi } from '../shared/ipc';

// Custom APIs for renderer
const outbox: OutboxApi = {
  enqueue: (input) => ipcRenderer.invoke(IpcChannel.OutboxEnqueue, input),
  list: (status) => ipcRenderer.invoke(IpcChannel.OutboxList, status),
  counts: () => ipcRenderer.invoke(IpcChannel.OutboxCounts),
};

const api = { outbox };

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
