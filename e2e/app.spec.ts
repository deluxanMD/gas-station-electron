import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Fresh profile per run so persisted state (e.g. theme) never leaks between runs.
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
  await expect(
    page.getByRole('heading', { name: 'Gas Station Portal' }),
  ).toBeVisible();
});

test('theme toggle switches the app to dark mode', async () => {
  const toggle = page.getByRole('button', { name: /^Theme:/ });
  await toggle.click(); // system -> light
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await toggle.click(); // light -> dark
  await expect(page.locator('html')).toHaveClass(/dark/);
});
