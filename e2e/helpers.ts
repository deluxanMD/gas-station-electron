import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import type {
  OutboxApi,
  SessionApi,
  ShiftsApi,
  SyncApi,
} from '../src/shared/ipc';

// The preload API as the renderer sees it; the e2e project does not load the renderer's global typings.
export interface PortalWindow {
  api: {
    outbox: OutboxApi;
    session: SessionApi;
    sync: SyncApi;
    shifts: ShiftsApi;
  };
}

export interface Received {
  method: string;
  url: string;
  authorization: string | undefined;
  idempotencyKey: string | undefined;
  body: unknown;
}

// A stand-in for the API that can be taken down and brought back on the same port, like a lost connection.
export class StubApi {
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

export async function launch(
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
