import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function appReady(page: Page): Promise<Locator> {
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  return app;
}

async function downloadText(page: Page, app: Locator): Promise<{ name: string; text: string }> {
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { name: download.suggestedFilename(), text: (await readFile(path!)).toString('utf8') };
}

test('mobile header exposes real navigation without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile product navigation regression');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menu = page.locator('.mobile-nav');
  await expect(menu).toBeVisible();
  await menu.locator('summary').click();
  await expect(menu.getByRole('link', { name: 'Image Converter', exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Data Converter', exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'FAQ', exact: true })).toBeVisible();

  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
});

test('converter topbars identify the active product instead of generic workflow copy', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop product-label regression');
  for (const [path, label] of [
    ['/image-converter/', 'Image Converter'],
    ['/data-converter/', 'Data Converter'],
    ['/csv-to-json/', 'CSV → JSON'],
  ] as const) {
    await page.goto(path);
    await expect(page.locator('.converter-topbar strong')).toHaveText(label);
  }
});

test('pair routes scope the native file picker before the engine loads', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Route input-contract regression');

  await page.goto('/heic-to-jpg/');
  let accept = await page.locator('[data-role="file-input"]').getAttribute('accept');
  expect(accept).toContain('.heic');
  expect(accept).toContain('.heif');
  expect(accept).not.toContain('.png');

  await page.goto('/jsonl-to-json/');
  accept = await page.locator('[data-role="file-input"]').getAttribute('accept');
  expect(accept).toContain('.jsonl');
  expect(accept).toContain('.ndjson');
  expect(accept).not.toContain('.csv');
});

test('valid scalar JSON is admitted and converts to tabular output', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run data scalar conversion once');
  await page.goto('/json-to-csv/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'scalar.json',
    mimeType: 'application/json',
    buffer: Buffer.from('"hello"'),
  });
  await expect(app.locator('.file-row')).toHaveCount(1);
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('scalar.csv');
  expect(result.text).toBe('value\nhello');
});

test('single successful result uses direct download without redundant ZIP action', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Single-result action regression');
  await page.goto('/csv-to-json/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'one.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,name\n1,Alice'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  await expect(app.getByRole('button', { name: 'Download', exact: true })).toBeVisible();
  await expect(app.locator('[data-role="download-zip"]')).toBeHidden();
});

test('rapid consecutive drops cannot bypass the 50-file batch limit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Serialized admission regression');
  await page.goto('/csv-to-json/');
  const app = await appReady(page);

  await app.locator('[data-role="drop-zone"]').evaluate((zone) => {
    const makeTransfer = (start: number) => {
      const transfer = new DataTransfer();
      for (let index = 0; index < 30; index += 1) {
        transfer.items.add(new File([`id,name\n${start + index},Person ${start + index}`], `batch-${start + index}.csv`, { type: 'text/csv' }));
      }
      return transfer;
    };
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: makeTransfer(0) }));
    zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: makeTransfer(30) }));
  });

  await expect(app.locator('.file-row')).toHaveCount(50, { timeout: 30_000 });
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('50 files');
  await expect(app.locator('[data-role="notice"]')).toContainText('10 files skipped');
});

test('shared progress surface exposes progressbar semantics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Accessibility contract regression');
  await page.goto('/data-converter/');
  const progress = page.locator('[data-role="progress"]');
  await expect(progress).toHaveAttribute('role', 'progressbar');
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuemax', '100');
  await expect(progress).toHaveAttribute('aria-valuenow', '0');
});
