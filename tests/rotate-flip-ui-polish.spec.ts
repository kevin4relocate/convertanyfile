import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

test('Rotate / Flip keeps a compact header, custom selects and bounded preview', async ({ page }) => {
  await page.goto('/rotate-flip-image/');
  const app = page.locator('[data-image-tool-app]');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'rotate.png', mimeType: 'image/png', buffer: PNG_2X2 });

  await expect(app.locator('.deterministic-header [data-role="mode-summary"]')).toBeHidden();
  await expect(app.locator('.deterministic-header > div:first-child > span')).toBeHidden();

  const rotation = app.locator('[data-setting="rotation"]');
  expect(await rotation.evaluate((element) => getComputedStyle(element).appearance)).toBe('none');
  expect(await rotation.evaluate((element) => getComputedStyle(element).backgroundImage)).not.toBe('none');

  await rotation.selectOption('90');
  const frames = app.locator('[data-role="preview-panel"] .image-preview-panel__frame');
  await expect(frames).toHaveCount(2);
  const heights = await frames.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().height));
  expect(Math.abs(heights[0] - heights[1])).toBeLessThan(2);
  expect(Math.max(...heights)).toBeLessThanOrEqual(381);
});
