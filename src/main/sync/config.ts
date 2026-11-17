import { API_VERSION } from './constants';
import type { SyncConfig } from './types';

interface ConfigSources {
  // The API address baked in at build time (MAIN_VITE_API_BASE_URL), without the version.
  buildTimeApiBaseUrl: string;
  isPackaged: boolean;
  env: NodeJS.ProcessEnv;
}

/**
 * Where to sync. A packaged app only ever uses the address built into it; a development or test run may point at
 * another server with GSP_API_BASE_URL (and shorten the probe with GSP_SYNC_PROBE_MS).
 */
export function readSyncConfig({
  buildTimeApiBaseUrl,
  isPackaged,
  env,
}: ConfigSources): SyncConfig {
  const override = isPackaged ? undefined : env.GSP_API_BASE_URL;
  const probeMs = isPackaged ? Number.NaN : Number(env.GSP_SYNC_PROBE_MS);
  const base = (override ?? buildTimeApiBaseUrl).replace(/\/+$/, '');
  return {
    apiBaseUrl: `${base}/${API_VERSION}`,
    ...(Number.isFinite(probeMs) && probeMs > 0
      ? {
          probeOnlineIntervalMs: probeMs,
          probeOfflineIntervalsMs: [probeMs],
          tickMs: probeMs,
        }
      : {}),
  };
}
