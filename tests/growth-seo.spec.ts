import { expect, test } from '@playwright/test';

const GROWTH_GUIDES = [
  '/guides/resize-image-without-stretching/',
  '/guides/resize-image-to-1920x1080/',
  '/guides/reduce-image-file-size-without-resizing/',
  '/guides/compress-images-for-web/',
  '/guides/crop-image-to-circle/',
  '/guides/blur-part-of-image/',
  '/guides/remove-exif-from-photo/',
  '/guides/remove-gps-location-from-image/',
] as const;

const HOME_PRIORITY_LINKS = [
  '/resize-image/',
  '/compress-image/',
  '/crop-image/',
  '/remove-image-metadata/',
  '/remove-watermark/',
  '/gemini-ai-logo-remover/',
  '/heic-to-jpg/',
  '/png-to-webp/',
  '/jpg-to-webp/',
  '/webp-to-jpg/',
  '/png-to-jpg/',
  '/avif-to-jpg/',
  ...GROWTH_GUIDES.slice(0, 6),
] as const;

test('homepage gives high-priority image pages crawlable one-click links', async ({ page }) => {
  await page.goto('/');
  for (const href of HOME_PRIORITY_LINKS) {
    await expect(page.locator(`a[href="${href}"]`).first(), `${href} should be linked from home`).toBeVisible();
  }
});

test('image growth guides are indexable, substantial and connected to live tools', async ({ request }) => {
  for (const path of GROWTH_GUIDES) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should return 2xx`).toBeTruthy();
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="index,follow');
    expect(html).toContain(`<link rel="canonical" href="https://convertanyfile.net${path}"`);
    expect((html.match(/<h1\b/gi) ?? []).length, `${path} should have one H1`).toBe(1);
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('/image');
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    expect(text.length, `${path} should contain substantial guide copy`).toBeGreaterThan(1800);
  }
});

test('guides hub and image tools expose the new content cluster', async ({ page }) => {
  await page.goto('/guides/');
  for (const path of GROWTH_GUIDES) await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();

  await page.goto('/resize-image/');
  await expect(page.locator('a[href="/guides/resize-image-without-stretching/"]')).toBeVisible();
  await expect(page.locator('a[href="/guides/resize-image-to-1920x1080/"]')).toBeVisible();

  await page.goto('/compress-image/');
  await expect(page.locator('a[href="/guides/reduce-image-file-size-without-resizing/"]')).toBeVisible();
  await expect(page.locator('a[href="/guides/compress-images-for-web/"]')).toBeVisible();

  await page.goto('/remove-image-metadata/');
  await expect(page.locator('a[href="/guides/remove-exif-from-photo/"]')).toBeVisible();
  await expect(page.locator('a[href="/guides/remove-gps-location-from-image/"]')).toBeVisible();
});
