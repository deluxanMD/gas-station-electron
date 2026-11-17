import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

test('the page may only talk to the API address it was built for', async () => {
  const app = await electron.launch({
    args: [
      '.',
      `--user-data-dir=${mkdtempSync(join(tmpdir(), 'gsp-csp-'))}`,
      ...(process.env.CI ? ['--no-sandbox'] : []),
    ],
  });
  const page = await app.firstWindow();

  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute('content');
  const connect = (policy ?? '')
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('connect-src'));

  // Itself and one address: an origin (no path, no wildcard), not the stand-in placeholder left unreplaced.
  const sources = (connect ?? '').split(/\s+/).slice(1);
  expect(sources).toHaveLength(2);
  expect(sources[0]).toBe("'self'");
  expect(sources[1]).toMatch(/^https?:\/\/[^/*]+$/);
  expect(policy).not.toContain('__API_ORIGIN__');
  expect(policy).toContain("object-src 'none'");

  // Anything else is blocked by the browser itself, not just by the app's own code.
  const blocked = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
    for (const url of ['https://evil.example/steal', 'http://127.0.0.1:1/']) {
      await fetch(url).catch(() => {});
    }
    // The browser reports a violation a moment after the request fails.
    for (let i = 0; i < 20 && violations.length < 2; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return violations;
  });
  expect(blocked).toHaveLength(2);
  expect(blocked.every((v) => v.startsWith('connect-src'))).toBe(true);

  await app.close();
});
