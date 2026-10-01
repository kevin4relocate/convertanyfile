import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

async function policyFromHeaders(): Promise<string> {
  const headers = await readFile('public/_headers', 'utf8');
  const line = headers.split(/\r?\n/).find((entry) => entry.trimStart().startsWith('Content-Security-Policy:'));
  if (!line) throw new Error('Content-Security-Policy is missing from public/_headers');
  return line.slice(line.indexOf(':') + 1).trim();
}

async function enforceProductionCspLocally(page: Page): Promise<void> {
  const productionPolicy = await policyFromHeaders();
  // Local preview is HTTP, so production's HTTPS-upgrade directive would intentionally rewrite localhost URLs.
  const localPolicy = productionPolicy.replace(/;?\s*upgrade-insecure-requests\s*;?/g, ';').replace(/;;+/g, ';').trim();

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4321') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy': localPolicy,
      },
    });
  });

  await page.addInitScript(() => {
    (window as Window & { __cspViolations?: string[] }).__cspViolations = [];
    window.addEventListener('securitypolicyviolation', (event) => {
      (window as Window & { __cspViolations?: string[] }).__cspViolations?.push(
        `${event.effectiveDirective}: ${event.blockedURI}`,
      );
    });
  });
}

async function expectNoCspViolations(page: Page): Promise<void> {
  await expect.poll(
    () => page.evaluate(() => (window as Window & { __cspViolations?: string[] }).__cspViolations ?? []),
  ).toEqual([]);
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'chromium-mobile', 'Desktop CSP runtime coverage is sufficient.');
  await enforceProductionCspLocally(page);
});

test('CSP allows the application shell and inline structured data', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/ConvertAnyFile/i);
  const structuredData = page.locator('script[type="application/ld+json"]');
  await expect.poll(() => structuredData.count()).toBeGreaterThan(0);
  expect(await structuredData.evaluateAll((nodes) => nodes.map((node) => JSON.parse(node.textContent || '{}')).every(Boolean))).toBe(true);
  await expect(page.locator('#home-converter-subtitle-tab')).toHaveText('Subtitles');
  await expectNoCspViolations(page);
});

test('CSP allows image and archive Worker/WASM runtimes', async ({ page }) => {
  await page.goto('/png-to-jpg/');
  let app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'csp-image.png',
    mimeType: 'image/png',
    buffer: PNG_2X2,
  });
  let convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 60_000 });
  await convert.click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted', { timeout: 60_000 });
  await expectNoCspViolations(page);

  await page.goto('/7z-to-zip/');
  app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'csp-archive.7z',
    mimeType: 'application/x-7z-compressed',
    buffer: await readFile('tests/fixtures/archive-wasm/simple-files.7z'),
  });
  convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 30_000 });
  await convert.click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted', { timeout: 90_000 });
  await expectNoCspViolations(page);
});
