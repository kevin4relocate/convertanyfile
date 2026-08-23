import { expect, test } from '@playwright/test';

const PNG_4X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAE0lEQVR42mP8z8DwnwEJMDGgAQA/JwICXm3wVAAAAABJRU5ErkJggg==',
  'base64',
);

test('blur uses visual whole-image and selected-area controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run blur direct manipulation coverage once in Chromium');
  await page.goto('/blur-image/');
  const app = page.locator('[data-tool-id="blur-image"]');
  await app.locator('[data-role="file-input"]').setInputFiles({ name:'blur.png', mimeType:'image/png', buffer:PNG_4X2 });

  await expect(app.locator('[data-blur-scope="whole"]')).toContainText('Blur whole image');
  await expect(app.locator('[data-blur-scope="region"]')).toContainText('Blur selected area');
  await expect(app.locator('[data-blur-scope="whole"]')).toHaveAttribute('aria-pressed','true');
  await expect(app.locator('[data-role="blur-selection"]')).toBeHidden();

  await app.locator('[data-blur-scope="region"]').click();
  await expect(app.locator('[data-setting="scope"]')).toHaveValue('region');
  await expect(app.locator('[data-role="blur-selection"]')).toBeVisible();
  await expect(app.locator('[data-blur-handle]')).toHaveCount(4);
  await expect(app.locator('.blur-advanced')).toBeVisible();
  await expect(app.locator('.blur-advanced summary')).toHaveText('Advanced coordinates');
});
