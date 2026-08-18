import { expect, test } from '@playwright/test';

test('extreme valid JSON exponents cannot silently underflow to zero', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Precision edge regression only needs one browser');
  await page.goto('/json-to-csv/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'underflow.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"amount":1e-999999999999999999}]'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('.status-error')).toContainText('lose precision');
  await expect(app.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});
