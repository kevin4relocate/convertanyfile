import { expect, test } from '@playwright/test';

const ORIGIN = 'https://convertanyfile.net';
const PATHS = [
  '/', '/about/', '/contact/', '/privacy/', '/terms/', '/faq/', '/guides/',
  '/formats/', '/image-tools/', '/text-tools/', '/data-tools/',
  '/image-converter/', '/data-converter/', '/archive-converter/', '/subtitle-converter/',
  '/jpg-to-webp/', '/png-to-jpg/', '/heic-to-jpg/', '/csv-to-json/',
  '/text/json-formatter/', '/text/json-validator/', '/text/url-encoder/',
  '/data/json-schema-validator/', '/data/csv-file-merger/', '/data/csv-data-profiler/',
  '/guides/how-to-convert-jpg-to-webp/',
] as const;

// Avoid synthetic analytics events when testing live production.
test.beforeEach(async ({ context }) => {
  await context.route(/https:\/\/www\.googletagmanager\.com\/.*/, route => route.abort());
  await context.route(/https:\/\/(?:[^/]+\.)?google-analytics\.com\/.*/, route => route.abort());
});

test('deployed revision is transparent and non-sensitive', async ({ request }) => {
  const response = await request.get('/build-info.json');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const info = await response.json() as { site?: string; revision?: string; builtAt?: string };
  expect(info.site).toBe('ConvertAnyFile');
  expect(info.revision).toMatch(/^(?:[a-f0-9]{40}|unknown)$/);
  expect(Number.isFinite(Date.parse(info.builtAt ?? ''))).toBe(true);
  expect(Object.keys(info).sort()).toEqual(['builtAt', 'revision', 'site']);
});

test('priority public routes are crawlable, canonical and return HTML', async ({ request }) => {
  test.setTimeout(120_000);
  for (const path of PATHS) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toMatch(/text\/html/i);
    const html = await response.text();
    expect(html, path).toContain('<link rel="canonical" href="' + ORIGIN + path + '"');
    expect(html, path).toContain('<meta name="robots" content="index,follow');
    expect((html.match(/<h1\b/gi) ?? []).length, path + ' H1 count').toBe(1);
    expect(html, path).toContain('<meta name="description" content="');
  }
});

test('production publishes the new editorial content and policy', async ({ request }) => {
  for (const [path, literal] of [
    ['/text/json-formatter/', 'Make an API response readable'],
    ['/data/json-schema-validator/', 'Catch a rule violation that valid JSON alone misses'],
    ['/jpg-to-webp/', 'Example: preparing photographs for a website'],
    ['/contact/', 'Help us improve ConvertAnyFile'],
  ] as const) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(literal);
  }
  const privacy = await request.get('/privacy/');
  expect(await privacy.text()).toContain('All AdSense ad requests are paused');
  const home = await request.get('/');
  const html = await home.text();
  expect(html).toContain('pagead/js/adsbygoogle.js?client=ca-pub-4046271575630296');
  expect(html.indexOf('pauseAdRequests = 1')).toBeLessThan(html.indexOf('adsbygoogle.js?client=ca-pub-4046271575630296'));
  expect(html).not.toContain('data-ad-slot=');
  const adsTxt = await request.get('/ads.txt');
  expect(adsTxt.status()).toBe(200);
  expect((await adsTxt.text()).trim()).toBe('google.com, pub-4046271575630296, DIRECT, f08c47fec0942fa0');
});

test('production headers and static assets have expected safety properties', async ({ request }) => {
  const html = await request.get('/contact/');
  const headers = html.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age=31536000');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  const csp = headers['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain('https://pagead2.googlesyndication.com');
  const favicon = await request.get('/favicon.svg');
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()['content-type']).toMatch(/svg|xml/i);
});

test('core routes fit a phone-width viewport without horizontal page overflow', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/', '/contact/', '/image-tools/', '/text/json-formatter/', '/data/json-schema-validator/', '/jpg-to-webp/']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const dims = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dims.scroll, path + ' has horizontal overflow').toBeLessThanOrEqual(dims.width + 2);
  }
});

test('Text and Data tools operate on deployed JavaScript, not only static HTML', async ({ page }) => {
  await page.goto('/text/json-formatter/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-tool-input]').fill('{"ok":true,"id":7}');
  await page.locator('[data-tool-run]').click();
  const formatted = await page.locator('[data-tool-output]').inputValue();
  expect(JSON.parse(formatted)).toEqual({ ok: true, id: 7 });

  await page.goto('/data/json-schema-validator/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-data-input]').fill('{"age":-1}');
  await page.locator('[data-data-secondary]').fill('{"type":"object","properties":{"age":{"type":"integer","minimum":0}}}');
  await page.locator('[data-data-run]').click();
  await expect(page.locator('[data-data-error]')).toBeHidden();
  await expect(page.locator('[data-data-output]')).not.toHaveValue('');
});

test('Image Tools search Clear action remains functional in production', async ({ page }) => {
  await page.goto('/image-tools/', { waitUntil: 'domcontentloaded' });
  const input = page.locator('[data-directory-search-input]');
  await expect(page.locator('[data-image-tools-directory]')).toHaveAttribute('data-directory-ready', 'true');
  await input.fill('resize');
  await expect(page.locator('[data-directory-clear]')).toBeVisible();
  await page.locator('[data-directory-clear]').click();
  await expect(input).toHaveValue('');
  await input.blur();
  await input.focus();
  await expect(input).toHaveValue('');
});

test('analytics is opt-in, revocable and separate from advertising', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-privacy-preferences]')).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  await page.locator('[data-analytics-reject]').click();
  await page.reload();
  await expect(page.locator('[data-privacy-preferences]')).toBeHidden();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  await page.locator('[data-open-privacy-preferences]').click();
  await page.locator('[data-analytics-accept]').click();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(
    new URL(page.url()).hostname.endsWith('convertanyfile.net') ? 1 : 0
  );
  await page.locator('[data-open-privacy-preferences]').click();
  await page.locator('[data-analytics-reject]').click();
  await page.reload();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  await expect(page.locator('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')).toHaveCount(1);
  const headHtml = await page.locator('head').innerHTML();
  expect(headHtml).toContain('pauseAdRequests = 1');
  expect(headHtml.indexOf('pauseAdRequests = 1')).toBeLessThan(headHtml.indexOf('adsbygoogle.js?client=ca-pub-4046271575630296'));
});
