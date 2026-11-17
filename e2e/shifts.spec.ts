import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { launch, StubApi } from './helpers';
import type { PortalWindow } from './helpers';

declare const window: PortalWindow;

test('a shift started and finished with no server is sent in order when the server returns', async () => {
  const port = await StubApi.reservePort();
  const api = new StubApi(port);
  const userDataDir = mkdtempSync(join(tmpdir(), 'gsp-shifts-'));
  const { app, page } = await launch(userDataDir, port);

  await page.evaluate(() =>
    window.api.session.set({
      userId: 7,
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    }),
  );

  const started = await page.evaluate(() => window.api.shifts.start(7));
  expect(started).toMatchObject({ userId: 7, id: null, endTime: null });
  // Starting again returns the same shift instead of opening a second one.
  const again = await page.evaluate(() => window.api.shifts.start(7));
  expect(again.clientId).toBe(started.clientId);

  const finished = await page.evaluate(
    ({ clientId }) =>
      window.api.shifts.finish({
        clientId,
        writes: [
          {
            entity: 'payouts',
            path: 'payouts',
            payload: { userId: 7, totalPos: 10.5 },
          },
          { entity: 'fuel-dip', path: 'fuel-dips', payload: { userId: 7 } },
        ],
      }),
    { clientId: started.clientId },
  );
  expect(finished.endTime).not.toBeNull();
  expect(await page.evaluate(() => window.api.shifts.current(7))).toBeNull();

  const waiting = await page.evaluate(() => window.api.sync.getState());
  expect(waiting.connectivity).toBe('offline');
  expect(waiting.counts.pending).toBe(4);

  await api.up();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.api.sync.getState().then((s) => s.counts.synced),
      ),
    )
    .toBe(4);

  expect(api.received.map((r) => `${r.method} ${r.url}`)).toEqual([
    'POST /api/v1/shifts',
    'POST /api/v1/payouts',
    'POST /api/v1/fuel-dips',
    'POST /api/v1/shifts/42/close',
  ]);
  expect(api.received[0].body).toMatchObject({
    userId: 7,
    clientId: started.clientId,
  });
  // Each record names the shift by the device's id and when it was made, so a late arrival is accepted.
  expect(api.received[1].body).toMatchObject({
    shiftClientId: started.clientId,
    recordedAt: finished.endTime,
    totalPos: 10.5,
  });
  expect(api.received[3].body).toEqual({ endTime: finished.endTime });

  await app.close();
  await api.down();
});

test('an open shift is still open after a restart', async () => {
  const port = await StubApi.reservePort();
  const userDataDir = mkdtempSync(join(tmpdir(), 'gsp-shifts-restart-'));

  const first = await launch(userDataDir, port);
  const started = await first.page.evaluate(() => window.api.shifts.start(7));
  await first.app.close();

  const second = await launch(userDataDir, port);
  const current = await second.page.evaluate(() =>
    window.api.shifts.current(7),
  );
  expect(current?.clientId).toBe(started.clientId);
  await second.app.close();
});
