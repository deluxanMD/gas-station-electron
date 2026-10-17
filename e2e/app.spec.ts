import { _electron as electron, expect, test } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] });
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
