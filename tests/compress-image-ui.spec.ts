import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

test('Compress Image is size-first and does not show a redundant image preview', async ({ page }) => {
  await page.goto('/compress-image/');
  const app = page.locator('[data-image-tool-app]');

  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'compress-me.png',
    mimeType: 'image/png',
    buffer: PNG_2X2,
  });

  await expect(app.locator('[data-role="preview-panel"]')).toBeHidden();

  const fileMeta = app.locator('.deterministic-file-card__copy > small').first();
  await expect(fileMeta).toContainText(/B|KB|MB/);

  await app.locator('[data-role="process-batch"]').click();
  await expect(fileMeta).toContainText('→');
  await expect(fileMeta).toContainText(/saved|larger/);
});
