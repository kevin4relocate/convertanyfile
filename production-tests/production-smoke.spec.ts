import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://convertanyfile.net';
const PROD_ORIGIN = 'https://convertanyfile.net';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

async function readyApp(page: Page): Promise<Locator> {
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true', { timeout: 30_000 });
  return app;
}

test.beforeEach(async ({ context }) => {
  // Production smoke should verify the GA bootstrap without creating synthetic GA4 users/sessions.
  await context.route(/https:\/\/www\.googletagmanager\.com\/.*/, (route) => route.abort());
  await context.route(/https:\/\/(?:[^/]+\.)?google-analytics\.com\/.*/, (route) => route.abort());
});

test('production shell, analytics, robots, sitemap and 404 are healthy', async ({ page, request }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBe(200);
  expect(response?.headers()['strict-transport-security']).toContain('max-age=31536000');
  await expect(page).toHaveTitle(/ConvertAnyFile/i);
  await expect(page.locator('#home-converter-subtitle-tab')).toHaveText('Subtitles');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${PROD_ORIGIN}/`);
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js?id=G-LX78XZ9FH2"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => Array.isArray((window as Window & { dataLayer?: unknown[] }).dataLayer))).toBe(true);

  const robots = await request.get(`${BASE_URL}/robots.txt`);
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain('User-agent: *');
  expect(robotsText).toContain('Allow: /');
  expect(robotsText).toContain(`${PROD_ORIGIN}/sitemap-index.xml`);

  const sitemapIndex = await request.get(`${BASE_URL}/sitemap-index.xml`);
  expect(sitemapIndex.status()).toBe(200);
  const indexXml = await sitemapIndex.text();
  expect(indexXml).toContain('<sitemapindex');
  expect(indexXml).toContain(`${PROD_ORIGIN}/sitemap-0.xml`);

  const sitemap = await request.get(`${BASE_URL}/sitemap-0.xml`);
  expect(sitemap.status()).toBe(200);
  const sitemapXml = await sitemap.text();
  expect((sitemapXml.match(/<loc>/g) ?? []).length).toBeGreaterThanOrEqual(40);
  for (const path of ['/', '/image-converter/', '/data-converter/', '/csv-to-json/', '/json-to-csv/', '/heic-to-jpg/', '/image-tools/', '/resize-image/', '/remove-image-metadata/', '/remove-watermark/']) {
    expect(sitemapXml).toContain(`<loc>${PROD_ORIGIN}${path}</loc>`);
  }
  expect(sitemapXml).not.toContain(`<loc>${PROD_ORIGIN}/remove-object/</loc>`);
  expect(sitemapXml).not.toContain(`<loc>${PROD_ORIGIN}/remove-background/</loc>`);

  const missing = await page.goto('/production-smoke-this-page-should-not-exist/', { waitUntil: 'domcontentloaded' });
  expect(missing?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});

test('public Image Tools routes are healthy and retired experimental routes stay unavailable', async ({ page, request }) => {
  for (const path of ['/image-tools/','/resize-image/','/compress-image/','/rotate-flip-image/','/crop-image/','/blur-image/','/bulk-rename-images/','/remove-image-metadata/','/remove-watermark/','/gemini-ai-logo-remover/']) {
    const response = await request.get(`${BASE_URL}${path}`);
    expect(response.status(), `${path} should return 200`).toBe(200);
  }
  for (const path of ['/remove-object/','/remove-background/']) {
    const response = await request.get(`${BASE_URL}${path}`);
    expect(response.status(), `${path} should remain unavailable`).toBe(404);
  }

  await page.goto('/image-tools/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('a[href="/remove-object/"]')).toHaveCount(0);
  await expect(page.locator('a[href="/remove-background/"]')).toHaveCount(0);
});

test('www permanently redirects to the canonical hostname and preserves path/query', async ({ request }) => {
  test.skip(BASE_URL !== PROD_ORIGIN, 'Canonical-host redirect only applies to production');
  const response = await request.get('https://www.convertanyfile.net/csv-to-json/?smoke=1', { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers()['location']).toBe('https://convertanyfile.net/csv-to-json/?smoke=1');
});

test('production Data converter completes and downloads a valid JSON result', async ({ page }) => {
  await page.goto('/csv-to-json/', { waitUntil: 'domcontentloaded' });
  const app = await readyApp(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'production-smoke.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,name\n1,Alice\n2,Bob'),
  });
  await expect(app.locator('.file-row')).toHaveCount(1);
  const convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 30_000 });
  await convert.click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted', { timeout: 30_000 });

  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('production-smoke.json');
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(JSON.parse(await readFile(path!, 'utf8'))).toEqual([
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
  ]);
});

test('production Image converter completes and downloads a real JPEG', async ({ page }) => {
  await page.goto('/png-to-jpg/', { waitUntil: 'domcontentloaded' });
  const app = await readyApp(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'production-smoke.png',
    mimeType: 'image/png',
    buffer: PNG_2X2,
  });
  await expect(app.locator('.file-row')).toHaveCount(1);
  const convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 60_000 });
  await convert.click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted', { timeout: 60_000 });

  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('production-smoke.jpg');
  const path = await download.path();
  expect(path).not.toBeNull();
  const jpeg = await readFile(path!);
  expect(Array.from(jpeg.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);
});
