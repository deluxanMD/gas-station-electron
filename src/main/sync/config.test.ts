import { describe, expect, it } from 'vitest';
import { readSyncConfig } from './config';

const base = {
  buildTimeApiBaseUrl: 'https://api.example.com/api/',
  isPackaged: false,
};

describe('readSyncConfig', () => {
  it('uses the built-in address with the API version', () => {
    expect(readSyncConfig({ ...base, env: {} })).toEqual({
      apiBaseUrl: 'https://api.example.com/api/v1',
    });
  });

  it('lets a development run point at another server and probe faster', () => {
    expect(
      readSyncConfig({
        ...base,
        env: {
          GSP_API_BASE_URL: 'http://localhost:4000/api',
          GSP_SYNC_PROBE_MS: '200',
        },
      }),
    ).toEqual({
      apiBaseUrl: 'http://localhost:4000/api/v1',
      probeOnlineIntervalMs: 200,
      probeOfflineIntervalsMs: [200],
      tickMs: 200,
    });
  });

  it('ignores overrides in a packaged app', () => {
    expect(
      readSyncConfig({
        ...base,
        isPackaged: true,
        env: {
          GSP_API_BASE_URL: 'http://evil.example',
          GSP_SYNC_PROBE_MS: '10',
        },
      }),
    ).toEqual({ apiBaseUrl: 'https://api.example.com/api/v1' });
  });
});
