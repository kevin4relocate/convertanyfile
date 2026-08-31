import { expect, test } from '@playwright/test';

const NEW_GUIDES = [
  ['/guides/how-to-convert-csv-to-json/', '/csv-to-json/'],
  ['/guides/how-to-convert-json-to-csv/', '/json-to-csv/'],
  ['/guides/how-to-convert-jpg-to-webp/', '/jpg-to-webp/'],
  ['/guides/how-to-convert-webp-to-jpg/', '/webp-to-jpg/'],
  ['/guides/how-to-convert-png-to-jpg/', '/png-to-jpg/'],
  ['/guides/how-to-convert-jpg-to-png/', '/jpg-to-png/'],
] as const;

test('homepage promotes image and data growth entry points', async ({ page }) => {
  await page.goto('/');
  for (const href of ['/resize-image/', '/heic-to-jpg/', '/csv-to-json/', '/json-to-csv/', '/guides/how-to-convert-csv-to-json/']) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
});

test('data converter prioritizes common routes while retaining the full catalog', async ({ page }) => {
  await page.goto('/data-converter/');
  await expect(page.getByRole('heading', { name: 'Start with the data jobs people need most often.' })).toBeVisible();
  await expect(page.locator('a[href="/csv-to-json/"]').first()).toBeVisible();
  await expect(page.locator('a[href="/json-to-csv/"]').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Use the exact format pair when the destination is specific.' })).toBeVisible();
});

for (const [path, toolHref] of NEW_GUIDES) {
  test(`${path} is indexable and links back to its tool`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://convertanyfile.net${path}`);
    await expect(page.locator('script[type="application/ld+json"]').filter({ hasText: '"Article"' }).first()).toBeAttached();
    await expect(page.locator(`a[href="${toolHref}"]`).first()).toBeVisible();
  });
}

test('HTML sitemap exposes crawlable routes across categories', async ({ page }) => {
  await page.goto('/sitemap/');
  await expect(page.getByRole('heading', { name: 'ConvertAnyFile HTML sitemap' })).toBeVisible();
  for (const href of [
    '/image-tools/',
    '/csv-to-json/',
    '/rar-to-zip/',
    '/srt-to-vtt/',
    '/guides/how-to-convert-jpg-to-webp/',
    '/guides/how-to-remove-watermark-from-image/',
  ]) {
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
  }
});
