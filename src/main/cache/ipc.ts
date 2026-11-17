import { ipcMain } from 'electron';
import { z } from 'zod';
import { IpcChannel } from '../../shared/ipc';
import type { DeviceCache } from './deviceCache';

const MAX_VALUE_BYTES = 1_000_000;

const keySchema = z
  .string()
  .regex(/^[\w:.,|-]+$/, 'Invalid key')
  .max(200);

// A cached answer is only ever shown back to the renderer; it is never sent anywhere.
export function registerCacheIpc(cache: DeviceCache): void {
  ipcMain.handle(IpcChannel.CacheGet, (_event, key: unknown) =>
    cache.get(keySchema.parse(key)),
  );
  ipcMain.handle(
    IpcChannel.CachePut,
    (_event, key: unknown, value: unknown) => {
      const parsed = z.json().parse(value);
      if (JSON.stringify(parsed).length > MAX_VALUE_BYTES)
        throw new Error('Value too large');
      cache.put(keySchema.parse(key), parsed);
    },
  );
}
