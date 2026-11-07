import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'gsp-e2e-'));
  app = await electron.launch({
    args: [
      '.',
      `--user-data-dir=${userDataDir}`,
      // CI runners can't use Chromium's SUID sandbox.
      ...(process.env.CI ? ['--no-sandbox'] : []),
    ],
  });
  page = await app.firstWindow();
});

test.afterAll(async () => {
  await app.close();
});

test('opens the portal window', async () => {
  await expect(page).toHaveTitle('Gas Station Portal');
  // The login screen's title is a shadcn CardTitle (a div, not a heading).
  await expect(page.getByText('Gas Station Portal')).toBeVisible();
});
