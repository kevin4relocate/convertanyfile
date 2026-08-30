import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

const SINGLE_IMAGE_ROUTES = [
  ['/resize-image/', 'resize-image', 'download-batch'],
  ['/compress-image/', 'compress-image', 'download-batch'],
  ['/rotate-flip-image/', 'rotate-flip-image', 'download-batch'],
  ['/crop-image/', 'crop-image', 'download-batch'],
  ['/blur-image/', 'blur-image', 'download-batch'],
  ['/bulk-rename-images/', 'bulk-rename-images', 'download-batch'],
  ['/remove-image-metadata/', 'remove-image-metadata', 'download-batch'],
  ['/remove-watermark/', 'remove-watermark', 'download'],
  ['/gemini-ai-logo-remover/', 'gemini-ai-logo-remover', 'download'],
] as const;

for (const [path, toolId, downloadRole] of SINGLE_IMAGE_ROUTES) {
  test(`${toolId} uses a direct-download label for one image`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run download-label coverage once in Chromium');
    await page.goto(path);
    const app = page.locator(`[data-image-tool-app][data-tool-id="${toolId}"]`);
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'single.png',
      mimeType: 'image/png',
      buffer: PNG_2X2,
    });
    const download = app.locator(`[data-role="${downloadRole}"]`);
    await expect(download).toHaveText('Download image');
    await expect(download).not.toContainText('ZIP');
  });
}

for (const [path, toolId] of [
  ['/resize-image/', 'resize-image'],
  ['/remove-image-metadata/', 'remove-image-metadata'],
  ['/bulk-rename-images/', 'bulk-rename-images'],
] as const) {
  test(`${toolId} advertises ZIP when a batch contains multiple files`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run download-label coverage once in Chromium');
    await page.goto(path);
    const app = page.locator(`[data-image-tool-app][data-tool-id="${toolId}"]`);
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
    await app.locator('[data-role="file-input"]').setInputFiles([
      { name: 'one.png', mimeType: 'image/png', buffer: PNG_2X2 },
      { name: 'two.png', mimeType: 'image/png', buffer: PNG_2X2 },
    ]);
    await expect(app.locator('[data-role="download-batch"]')).toHaveText('Download ZIP');
  });
}
