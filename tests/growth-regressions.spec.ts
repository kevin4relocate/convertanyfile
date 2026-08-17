import { expect, test } from '@playwright/test';

const EXPANDED_IMAGE_ROUTES = [
  '/heic-to-webp/', '/heic-to-tiff/',
  '/webp-to-avif/', '/webp-to-tiff/',
  '/png-to-avif/', '/png-to-tiff/',
  '/jpg-to-avif/', '/jpg-to-tiff/',
  '/avif-to-png/', '/avif-to-webp/', '/avif-to-tiff/',
  '/tiff-to-png/', '/tiff-to-webp/', '/tiff-to-avif/',
  '/bmp-to-png/', '/bmp-to-webp/', '/bmp-to-tiff/',
] as const;

test('image converter keeps the complete drop zone in the first desktop viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop first-viewport regression');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/image-converter/');

  const frame = page.locator('[data-converter-page-frame]');
  const converter = page.locator('.converter-page-tool .converter-card--compact');
  const dropZone = converter.locator('[data-role="drop-zone"]');
  await expect(frame).toBeVisible();
  await expect(converter).toBeVisible();
  await expect(dropZone).toBeVisible();
  await expect(page.getByText('Choose files', { exact: true })).toBeVisible();
  await expect(page.getByText('Files stay on your device during conversion', { exact: true })).toBeVisible();

  const frameBox = await frame.boundingBox();
  const converterBox = await converter.boundingBox();
  const dropBox = await dropZone.boundingBox();
  expect(frameBox).not.toBeNull();
  expect(converterBox).not.toBeNull();
  expect(dropBox).not.toBeNull();
  expect(frameBox!.height).toBeLessThan(220);
  expect(converterBox!.y).toBeLessThan(340);
  expect(dropBox!.y + dropBox!.height).toBeLessThanOrEqual(900);
});

test('expanded image routes are real converter pages with substantive pair-specific content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'SEO content regression only needs one browser');

  for (const path of EXPANDED_IMAGE_ROUTES) {
    await page.goto(path);
    await expect(page.locator('[data-converter-page-frame]')).toBeVisible();
    await expect(page.locator('[data-converter-app]')).toHaveCount(1);
    await expect(page.locator('.quick-answer')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Understand the source and the output/i })).toBeVisible();
    const article = page.locator('.content-article');
    const text = await article.innerText();
    expect(text, `${path} should not expose unresolved content`).not.toContain('undefined');
    expect(text.length, `${path} should contain substantive conversion guidance`).toBeGreaterThan(1800);
  }
});

test('shared shell and converter controller bootstrap in Firefox and WebKit', async ({ page }, testInfo) => {
  test.skip(!['firefox-desktop', 'webkit-desktop'].includes(testInfo.project.name), 'Cross-browser bootstrap regression');
  await page.goto('/image-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(page.locator('[data-converter-page-frame]')).toBeVisible();
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await expect(app.locator('[data-role="drop-zone"]')).toBeVisible();
  await expect(page.getByText('Choose files', { exact: true })).toBeVisible();
});
