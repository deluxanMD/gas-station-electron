import { app, shell, BrowserWindow, ipcMain, net } from 'electron';
import { join } from 'node:path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import icon from '../../resources/icon.png?asset';
import { openDatabase } from './db/database';
import { Outbox } from './outbox/outbox';
import { registerOutboxIpc } from './outbox/ipc';
import { readSyncConfig } from './sync/config';
import { PROBE_PATH } from './sync/constants';
import { Connectivity } from './sync/connectivity';
import { SyncEngine } from './sync/engine';
import { keychainEncryptor, registerSyncIpc } from './sync/ipc';
import { SessionStore } from './sync/session';
import { ShiftMap } from './sync/shiftMap';

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1640,
    height: 1200,
    fullscreen: true,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.electron');

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });

    // Writes made on this device wait here until the server confirms them.
    const db = openDatabase(join(app.getPath('userData'), 'gas-station.db'));
    const outbox = new Outbox(db);
    registerOutboxIpc(outbox);

    // Sends the queued writes whenever the server can be reached, whichever screen is open.
    const config = readSyncConfig({
      buildTimeApiBaseUrl: import.meta.env.MAIN_VITE_API_BASE_URL,
      isPackaged: app.isPackaged,
      env: process.env,
    });
    const connectivity = new Connectivity({
      probeUrl: `${config.apiBaseUrl}/${PROBE_PATH}`,
      fetch: (input, init) => net.fetch(input, init),
      onlineIntervalMs: config.probeOnlineIntervalMs,
      offlineIntervalsMs: config.probeOfflineIntervalsMs,
    });
    const sessions = new SessionStore(db, keychainEncryptor);
    const engine = new SyncEngine({
      outbox,
      sessions,
      shiftMap: new ShiftMap(db),
      connectivity,
      fetch: (input, init) => net.fetch(input, init),
      apiBaseUrl: config.apiBaseUrl,
      tickMs: config.tickMs,
    });
    registerSyncIpc(engine, sessions, outbox);
    connectivity.start();
    engine.start();
    app.on('will-quit', () => {
      engine.stop();
      connectivity.stop();
      db.close();
    });

    // IPC test
    // eslint-disable-next-line no-console
    ipcMain.on('ping', () => console.log('pong'));

    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error) => {
    console.error('Failed to initialize app:', error);
  });

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
