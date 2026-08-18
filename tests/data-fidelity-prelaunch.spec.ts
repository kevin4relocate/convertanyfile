import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function readyApp(page: Page): Promise<Locator> {
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  return app;
}

async function downloadText(page: Page, app: Locator): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return (await readFile(path!)).toString('utf8');
}

test('CSV headers with meaningful surrounding whitespace are preserved exactly', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Final fidelity regression only needs one browser');
  await page.goto('/csv-to-json/');
  const app = await readyApp(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'header-whitespace.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('" Account ID ",name\n001,Alice'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const parsed = JSON.parse(await downloadText(page, app)) as Array<Record<string, string>>;
  expect(parsed[0]?.[' Account ID ']).toBe('001');
  expect(parsed[0]).not.toHaveProperty('Account ID');
});

test('empty JSON objects remain explicit when converting to a table', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Final fidelity regression only needs one browser');
  await page.goto('/json-to-csv/');
  const app = await readyApp(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'empty-objects.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"id":1,"meta":{}},{}]'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const csv = await downloadText(page, app);
  expect(csv).toContain('id,meta,value');
  expect(csv).toContain('1,{},');
  expect(csv).toContain(',,{}');
});
