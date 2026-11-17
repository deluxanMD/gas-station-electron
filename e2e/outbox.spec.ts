import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import type { OutboxApi } from '../src/shared/ipc';

// The preload API as the renderer sees it; the e2e project does not load the renderer's global typings.
interface PortalWindow {
  api: { outbox: OutboxApi };
}
declare const window: PortalWindow;

const userDataDir = mkdtempSync(join(tmpdir(), 'gsp-outbox-'));

async function launch(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [
      '.',
      `--user-data-dir=${userDataDir}`,
      ...(process.env.CI ? ['--no-sandbox'] : []),
    ],
  });
  return { app, page: await app.firstWindow() };
}

test('a queued write survives an app restart', async () => {
  const first = await launch();
  const entry = await first.page.evaluate(() =>
    window.api.outbox.enqueue({
      userId: 7,
      entity: 'fuel-dip',
      method: 'POST',
      path: 'fuel-dips',
      payload: { dipAt: '2026-01-01T10:00:00.000Z', regularTcVolume: 1200.5 },
    }),
  );
  expect(entry.status).toBe('pending');
  await first.app.close();

  const second = await launch();
  const pending = await second.page.evaluate(() =>
    window.api.outbox.list('pending'),
  );
  expect(pending.map((e) => e.id)).toEqual([entry.id]);
  expect(
    await second.page.evaluate(() => window.api.outbox.counts()),
  ).toMatchObject({
    pending: 1,
  });
  await second.app.close();
});

test('the main process rejects a path aimed at another host', async () => {
  const { app, page } = await launch();
  const message = await page.evaluate(() =>
    window.api.outbox
      .enqueue({
        userId: 7,
        entity: 'x',
        method: 'POST',
        path: 'https://evil.example/steal',
        payload: {},
      })
      .then(
        () => 'accepted',
        (error: unknown) =>
          error instanceof Error ? error.message : String(error),
      ),
  );
  expect(message).not.toBe('accepted');
  await app.close();
});
