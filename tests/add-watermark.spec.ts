import { expect, test, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

async function ready(page: Page) {
  await page.goto('/add-watermark/');
  const app = page.locator('[data-image-tool-app][data-tool-id="add-watermark"]');
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  return app;
}

test.describe('Add Watermark', () => {
  test('mounts and processes a text watermark batch', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run watermark interaction coverage once in Chromium');
    const app = await ready(page);

    await app.locator('[data-role="file-input"]').setInputFiles([
      { name: 'one.png', mimeType: 'image/png', buffer: PNG_2X2 },
      { name: 'two.png', mimeType: 'image/png', buffer: PNG_2X2 },
    ]);

    await expect(app).toHaveAttribute('data-has-items', 'true');
    await expect(app.locator('.watermark-card')).toHaveCount(2);
    await expect(app.locator('[data-role="preview-canvas"]')).toBeVisible();

    await app.locator('[data-role="watermark-text"]').fill('relocateworks.com');
    await app.locator('[data-role="watermark-opacity"]').evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '55';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(app.locator('[data-role="opacity-output"]')).toHaveText('55%');

    const canvas = app.locator('[data-role="preview-canvas"]');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * 0.7, box!.y + box!.height * 0.7);
    await page.mouse.up();

    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="download-batch"]')).toBeEnabled();
    await expect(app.locator('[data-role="download-batch"]')).toHaveText('Download ZIP');
    await expect(app.locator('[data-role="batch-result-summary"]')).toContainText('2 watermarked images');
  });

  test('accepts a logo watermark and processes it', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run watermark logo coverage once in Chromium');
    const app = await ready(page);

    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: PNG_2X2,
    });

    await app.locator('[data-watermark-kind="logo"]').click();
    await expect(app.locator('[data-role="logo-controls"]')).toBeVisible();
    await expect(app.locator('[data-role="process-batch"]')).toBeDisabled();

    await app.locator('[data-role="logo-input"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: PNG_2X2,
    });

    await expect(app.locator('[data-role="logo-name"]')).toHaveText('logo.png');
    await expect(app.locator('[data-role="process-batch"]')).toBeEnabled();
    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="download-batch"]')).toBeEnabled();
    await expect(app.locator('[data-role="download-batch"]')).toHaveText('Download image');
  });
});
