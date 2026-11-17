import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { launch, StubApi } from './helpers';
import type { PortalWindow } from './helpers';

declare const window: PortalWindow;

test('a refused change can be saved to a file and sent again once the cause is fixed', async () => {
  const port = await StubApi.reservePort();
  const api = new StubApi(port);
  api.refuse(409, 'Shift is already closed');
  await api.up();
  const userDataDir = mkdtempSync(join(tmpdir(), 'gsp-issues-'));
  const { app, page } = await launch(userDataDir, port);

  await page.evaluate(() =>
    window.api.session.set({
      userId: 7,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }),
  );
  const entry = await page.evaluate(() =>
    window.api.outbox.enqueue({
      userId: 7,
      entity: 'payouts',
      method: 'POST',
      path: 'payouts',
      payload: { userId: 7, totalPos: 10.5 },
    }),
  );
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.api.sync.getState().then((s) => s.counts.needs_attention),
      ),
    )
    .toBe(1);

  // The person picks where to save; the native dialog is replaced by a fixed answer.
  const file = join(mkdtempSync(join(tmpdir(), 'gsp-export-')), 'unsent.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = () =>
      Promise.resolve({ canceled: false, filePath });
  }, file);
  const saved = await page.evaluate(() => window.api.outbox.exportEntries());
  expect(saved).toEqual({ saved: true, path: file });
  const exported = JSON.parse(readFileSync(file, 'utf8')) as {
    entries: {
      id: string;
      serverMessage: string;
      payload: unknown;
      request: string;
    }[];
  };
  expect(exported.entries).toEqual([
    expect.objectContaining({
      id: entry.id,
      request: 'POST payouts',
      serverMessage: 'Shift is already closed',
      payload: expect.objectContaining({ totalPos: 10.5 }),
    }),
  ]);

  // A person who closes the dialog saves nothing.
  await app.evaluate(({ dialog }) => {
    dialog.showSaveDialog = () =>
      Promise.resolve({ canceled: true, filePath: '' });
  });
  expect(await page.evaluate(() => window.api.outbox.exportEntries())).toEqual({
    saved: false,
  });

  // Still refused: sending again leaves it waiting for attention.
  expect(
    await page.evaluate((id) => window.api.outbox.retry(id), entry.id),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.api.outbox.list('needs_attention').then((l) => l[0]?.attempts),
      ),
    )
    .toBe(1);

  api.accept();
  expect(
    await page.evaluate((id) => window.api.outbox.retry(id), entry.id),
  ).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.api.sync.getState().then((s) => s.counts.synced),
      ),
    )
    .toBe(1);
  expect(api.received).toHaveLength(1);
  // The same idempotency key as the first try.
  expect(api.received[0].idempotencyKey).toBe(entry.id);
  // Nothing left to retry.
  expect(
    await page.evaluate((id) => window.api.outbox.retry(id), entry.id),
  ).toBe(false);

  await app.close();
  await api.down();
});
