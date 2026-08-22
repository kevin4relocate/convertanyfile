import { expect, test } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAD0lEQVR4nGP4z8DAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);

const imageFile = { name: 'tiny.png', mimeType: 'image/png', buffer: tinyPng };

test('Resize Image admits and resizes a local PNG', async ({ page }) => {
  await page.goto('/resize-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Resize images online');
  await page.locator('[data-role="file-input"]').setInputFiles(imageFile);
  await expect(page.locator('[data-role="summary"]')).toContainText('1 image');
  await page.locator('[data-role="width"]').fill('10');
  await page.locator('[data-role="height"]').fill('10');
  await page.locator('[data-role="run"]').click();
  await expect(page.locator('.image-utility-row-status')).toHaveText('Done', { timeout: 60_000 });
  await expect(page.locator('.image-utility-row-copy span')).toContainText('10×10');
});

test('Compress Image admits and recompresses a local PNG', async ({ page }) => {
  await page.goto('/compress-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Compress images online');
  await page.locator('[data-role="file-input"]').setInputFiles(imageFile);
  await expect(page.locator('[data-role="summary"]')).toContainText('1 image');
  await page.locator('[data-role="output"]').selectOption('webp');
  await page.locator('[data-role="quality"]').fill('70');
  await page.locator('[data-role="run"]').click();
  await expect(page.locator('.image-utility-row-status')).toHaveText('Done', { timeout: 60_000 });
  await expect(page.locator('.image-utility-row button')).toHaveText('Download');
});
