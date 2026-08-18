import { expect, test } from '@playwright/test';

const SAMPLE_BYTES = 64 * 1024;

test('a multibyte UTF-8 character split by the 64 KB admission sample is not treated as invalid encoding', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Sampling-boundary regression only needs one browser');
  await page.goto('/csv-to-json/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');

  const header = Buffer.from('value\n');
  const ascii = Buffer.from('a'.repeat(SAMPLE_BYTES - header.length - 1));
  const payload = Buffer.concat([header, ascii, Buffer.from('€\n')]);
  expect(payload[SAMPLE_BYTES - 1]).toBe(0xe2);
  expect(payload.length).toBeGreaterThan(SAMPLE_BYTES);

  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'utf8-boundary.csv',
    mimeType: 'text/csv',
    buffer: payload,
  });

  await expect(app.locator('.file-row')).toHaveCount(1);
  await expect(app.locator('[data-role="file-list"]')).toContainText('utf8-boundary.csv');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  await expect(app.locator('.status-error')).toHaveCount(0);
});
