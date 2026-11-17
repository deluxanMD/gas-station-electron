import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import type { OutboxApi, SessionApi, SyncApi } from '../src/shared/ipc';

// The preload API as the renderer sees it; the e2e project does not load the renderer's global typings.
interface PortalWindow {
  api: { outbox: OutboxApi; session: SessionApi; sync: SyncApi };
}
declare const window: PortalWindow;

const SHIFT = '3f2b8c1e-6d4a-4b7e-9a10-5c2d8e7f1a90';

interface Received {
  method: string;
  url: string;
  authorization: string | undefined;
  idempotencyKey: string | undefined;
  body: unknown;
}

// A stand-in for the API that can be taken down and brought back on the same port, like a lost connection.
class StubApi {
  readonly received: Received[] = [];
  private server: Server | null = null;

  constructor(readonly port: number) {}

  static async reservePort(): Promise<number> {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const { port } = probe.address() as AddressInfo;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    return port;
  }

  async up(): Promise<void> {
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((resolve) =>
      this.server?.listen(this.port, '127.0.0.1', resolve),
    );
  }

  async down(): Promise<void> {
    const { server } = this;
    this.server = null;
    server?.closeAllConnections();
    await new Promise<void>((resolve) =>
      server ? server.close(() => resolve()) : resolve(),
    );
  }

  private async handle(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString();
    const url = req.url ?? '';
    res.setHeader('Content-Type', 'application/json');

    if (url.endsWith('/health/live')) {
      res.end(JSON.stringify({ status: 'alive' }));
      return;
    }
    this.received.push({
      method: req.method ?? '',
      url,
      authorization: req.headers.authorization,
      idempotencyKey: req.headers['idempotency-key'] as string | undefined,
      body: raw ? JSON.parse(raw) : null,
    });
    res.statusCode = 201;
    res.end(
      JSON.stringify({
        status: 'success',
        data: url.endsWith('/shifts') ? { id: 42 } : {},
      }),
    );
  }
}

async function launch(
  userDataDir: string,
  port: number,
): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [
      '.',
      `--user-data-dir=${userDataDir}`,
      ...(process.env.CI ? ['--no-sandbox'] : []),
    ],
    env: {
      ...process.env,
      GSP_API_BASE_URL: `http://127.0.0.1:${port}/api`,
      GSP_SYNC_PROBE_MS: '200',
    },
  });
  return { app, page: await app.firstWindow() };
}

const enqueueShift = (page: Page): Promise<void> =>
  page.evaluate(
    async ({ shift }) => {
      const { outbox } = window.api;
      await outbox.enqueue({
        userId: 7,
        shiftClientId: shift,
        entity: 'shift-start',
        method: 'POST',
        path: 'shifts',
        payload: { userId: 7, clientId: shift },
      });
      await outbox.enqueue({
        userId: 7,
        shiftClientId: shift,
        entity: 'fuel-dip',
        method: 'POST',
        path: 'fuel-dips',
        payload: {
          shiftClientId: shift,
          userId: 7,
          dipAt: '2026-01-01T10:00:00.000Z',
        },
      });
      await outbox.enqueue({
        userId: 7,
        shiftClientId: shift,
        entity: 'shift-close',
        method: 'POST',
        path: 'shifts/{shiftId}/close',
        payload: {},
      });
    },
    { shift: SHIFT },
  );

test('writes made offline are sent in order once the server is reachable', async () => {
  const port = await StubApi.reservePort();
  const api = new StubApi(port);
  const { app, page } = await launch(
    mkdtempSync(join(tmpdir(), 'gsp-sync-')),
    port,
  );

  await page.evaluate(() =>
    window.api.session.set({
      userId: 7,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }),
  );
  await enqueueShift(page);

  const offline = await page.evaluate(() => window.api.sync.getState());
  expect(offline.connectivity).toBe('offline');
  expect(offline.counts.pending).toBe(3);
  await expect(page.getByRole('status')).toHaveText(
    'Offline: 3 changes waiting to sync',
  );

  await api.up();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.api.sync.getState().then((s) => s.counts.synced),
      ),
    )
    .toBe(3);

  await expect(page.getByRole('status')).toHaveText('All changes synced');
  expect(api.received.map((r) => `${r.method} ${r.url}`)).toEqual([
    'POST /api/v1/shifts',
    'POST /api/v1/fuel-dips',
    'POST /api/v1/shifts/42/close',
  ]);
  expect(api.received.every((r) => r.authorization === 'Bearer access-1')).toBe(
    true,
  );
  const entries = await page.evaluate(() => window.api.outbox.list('synced'));
  expect(api.received.map((r) => r.idempotencyKey)).toEqual(
    entries.map((e) => e.id),
  );

  await app.close();
  await api.down();
});

test('a write queued offline survives a restart and is sent afterwards', async () => {
  const port = await StubApi.reservePort();
  const api = new StubApi(port);
  const userDataDir = mkdtempSync(join(tmpdir(), 'gsp-sync-restart-'));

  const first = await launch(userDataDir, port);
  await first.page.evaluate(() =>
    window.api.session.set({
      userId: 7,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }),
  );
  await first.page.evaluate(() =>
    window.api.outbox.enqueue({
      userId: 7,
      entity: 'fuel-dip',
      method: 'POST',
      path: 'fuel-dips',
      payload: { userId: 7, shiftId: 1, dipAt: '2026-01-01T10:00:00.000Z' },
    }),
  );
  await first.app.close();

  // No session is registered again: the engine restores it from the encrypted store.
  const second = await launch(userDataDir, port);
  await api.up();
  await expect
    .poll(() =>
      second.page.evaluate(() =>
        window.api.sync.getState().then((s) => s.counts.synced),
      ),
    )
    .toBe(1);
  expect(api.received).toHaveLength(1);
  expect(api.received[0].authorization).toBe('Bearer access-1');

  await second.app.close();
  await api.down();
});
