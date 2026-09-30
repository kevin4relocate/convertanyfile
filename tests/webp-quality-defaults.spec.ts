import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

const STANDARD_OUTPUT_TOOLS = [
  ['/resize-image/', 'resize-image'],
  ['/rotate-flip-image/', 'rotate-flip-image'],
  ['/crop-image/', 'crop-image'],
  ['/blur-image/', 'blur-image'],
  ['/fade-image-edges/', 'fade-image-edges'],
] as const;

for (const [path, toolId] of STANDARD_OUTPUT_TOOLS) {
  test(`${toolId} uses WebP 82 and JPG 90 defaults`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Shared output quality contract only needs one browser');
    await page.goto(path);
    const app = page.locator(`[data-image-tool-app][data-tool-id="${toolId}"]`);
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'quality-source.png',
      mimeType: 'image/png',
      buffer: PNG_2X2,
    });
    await expect(app).toHaveAttribute('data-has-items', 'true');

    const format = app.locator('[data-role="output-format"]');
    const quality = app.locator('[data-role="output-quality"]');
    await format.selectOption('webp');
    await expect(quality).toHaveValue('82');
    await format.selectOption('jpg');
    await expect(quality).toHaveValue('90');
  });
}

test('compress tool uses WebP 82 and JPG 90 defaults', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Shared output quality contract only needs one browser');
  await page.goto('/compress-image/');
  const app = page.locator('[data-image-tool-app][data-tool-id="compress-image"]');
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'compress-source.png',
    mimeType: 'image/png',
    buffer: PNG_2X2,
  });
  const format = app.locator('[data-setting="format"]');
  const quality = app.locator('[data-setting="quality"]');
  await expect(format).toHaveValue('webp');
  await expect(quality).toHaveValue('82');
  await format.selectOption('jpg');
  await expect(quality).toHaveValue('90');
  await format.selectOption('webp');
  await expect(quality).toHaveValue('82');
});

test('metadata cleanup uses WebP 82 and JPG 90 defaults', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Shared output quality contract only needs one browser');
  await page.goto('/remove-image-metadata/');
  const app = page.locator('[data-image-tool-app][data-tool-id="remove-image-metadata"]');
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'metadata-source.png',
    mimeType: 'image/png',
    buffer: PNG_2X2,
  });
  const format = app.locator('[data-setting="format"]');
  const quality = app.locator('[data-setting="quality"]');
  await format.selectOption('webp');
  await expect(quality).toHaveValue('82');
  await format.selectOption('jpg');
  await expect(quality).toHaveValue('90');
});
