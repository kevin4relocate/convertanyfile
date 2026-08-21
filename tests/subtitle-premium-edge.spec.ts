import { expect, test, type Locator, type Page } from '@playwright/test';

async function appReady(page: Page): Promise<Locator> {
  const app = page.locator('[data-converter-app]').first();
  await expect(app).toHaveAttribute('data-initialized', 'true');
  return app;
}

const SRT = `1\n00:00:01,500 --> 00:00:03,000\nHello world.\n`;

test('SRT preflight rejects multiple timing lines inside one cue block', async ({ page }) => {
  await page.goto('/subtitle-converter/');
  const app = await appReady(page);
  const ambiguous = [
    '1',
    '00:00:01,000 --> 00:00:02,000',
    'First cue',
    '2',
    '00:00:03,000 --> 00:00:04,000',
    'Second cue without the required separator',
  ].join('\n');

  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'ambiguous.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from(ambiguous),
  });

  await expect(app.locator('.file-row')).toHaveCount(0);
  await expect(app.locator('[data-role="notice"]')).toContainText('1 file skipped');
});

test('fractional timing shifts fail instead of being silently rounded', async ({ page }) => {
  await page.goto('/srt-to-vtt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'fractional.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from(SRT),
  });
  await app.getByLabel('Timing shift').fill('12.5');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('.status-error')).toContainText('whole-number');
  await expect(app.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

test('Premium Subtitle controls stay dark and avoid horizontal overflow on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'One Chromium viewport regression is sufficient');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/srt-to-vtt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'mobile.srt',
    mimeType: 'application/x-subrip',
    buffer: Buffer.from(SRT),
  });

  const settingBackground = await app.locator('.setting-field--number').evaluate((element) => getComputedStyle(element).backgroundColor);
  const numberBackground = await app.locator('.number-setting-wrap').evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(settingBackground).toBe('rgb(25, 30, 41)');
  expect(numberBackground).toBe('rgb(17, 22, 31)');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('premium Subtitle pair catalog exposes all 17 real cross-format routes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Route inventory only needs one browser');
  await page.goto('/subtitle-converter/');
  const links = page.locator('a.related-card[href*="-to-"]');
  await expect(links).toHaveCount(17);

  const expected = [
    '/srt-to-vtt/', '/srt-to-sbv/', '/srt-to-txt/',
    '/vtt-to-srt/', '/vtt-to-sbv/', '/vtt-to-txt/',
    '/ass-to-srt/', '/ass-to-vtt/', '/ass-to-sbv/', '/ass-to-txt/',
    '/ssa-to-srt/', '/ssa-to-vtt/', '/ssa-to-sbv/', '/ssa-to-txt/',
    '/sbv-to-srt/', '/sbv-to-vtt/', '/sbv-to-txt/',
  ];

  const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
  expect(new Set(hrefs)).toEqual(new Set(expected));
});
