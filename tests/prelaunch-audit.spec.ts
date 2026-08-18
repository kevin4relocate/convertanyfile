import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

async function appReady(page: Page, scope?: Locator): Promise<Locator> {
  const app = scope?.locator('[data-converter-app]') ?? page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  return app;
}

async function delayFullFileReads(page: Page, delayMs = 900): Promise<void> {
  await page.evaluate((delay) => {
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = function arrayBuffer(): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        window.setTimeout(() => original.call(this).then(resolve, reject), delay);
      });
    };
  }, delayMs);
}

async function downloadText(page: Page, app: Locator): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return (await readFile(path!)).toString('utf8');
}

test('Data cancel remains authoritative even while the browser is still reading the source file', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Race regression only needs one browser');
  await page.goto('/csv-to-json/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'cancel-me.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,name\n1,Alice\n2,Bob'),
  });
  await expect(app.locator('[data-role="output-format"]')).toBeEnabled();
  await delayFullFileReads(page);

  await app.locator('[data-role="convert-all"]').click();
  const cancel = app.locator('[data-role="cancel"]');
  await expect(cancel).toBeVisible();
  await cancel.click();

  await expect(app.locator('.file-row')).toContainText('Ready', { timeout: 15_000 });
  await expect(app.locator('.status-success')).toHaveCount(0);
  await expect(app.locator('[data-role="result-summary"]')).toBeHidden();
  await expect(app.locator('[data-engine-label]')).toHaveText('Private converter ready', { timeout: 15_000 });
  await expect(app.locator('[data-role="convert-all"]')).toBeEnabled();
});

test('Image cancel remains authoritative while the source file read is delayed', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'WASM cancellation race only needs one browser');
  await page.goto('/png-to-jpg/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'cancel-me.png',
    mimeType: 'image/png',
    buffer: PNG_2X2,
  });
  await expect(app.locator('[data-role="output-format"]')).toBeEnabled({ timeout: 60_000 });
  await delayFullFileReads(page);

  await app.locator('[data-role="convert-all"]').click();
  const cancel = app.locator('[data-role="cancel"]');
  await expect(cancel).toBeVisible();
  await cancel.click();

  await expect(app.locator('.file-row')).toContainText('Ready', { timeout: 20_000 });
  await expect(app.locator('.status-success')).toHaveCount(0);
  await expect(app.locator('[data-role="result-summary"]')).toBeHidden();
  await expect(app.locator('[data-engine-label]')).toHaveText('Private converter ready', { timeout: 60_000 });
  await expect(app.locator('[data-role="convert-all"]')).toBeEnabled({ timeout: 60_000 });
});

test('a valid JSONL record larger than the admission sample is not rejected as truncated JSON', async ({ page }) => {
  await page.goto('/jsonl-to-json/');
  const app = await appReady(page);
  const payload = JSON.stringify({ id: 1, text: 'x'.repeat(70 * 1024) });
  expect(Buffer.byteLength(payload)).toBeGreaterThan(64 * 1024);

  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'large-record.jsonl',
    mimeType: 'application/x-ndjson',
    buffer: Buffer.from(payload),
  });
  await expect(app.locator('.file-row')).toHaveCount(1);
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const parsed = JSON.parse(await downloadText(page, app)) as Array<{ id: number; text: string }>;
  expect(parsed).toHaveLength(1);
  expect(parsed[0]?.id).toBe(1);
  expect(parsed[0]?.text).toHaveLength(70 * 1024);
});

test('JSON numeric fidelity keeps safe decimals but rejects values that would silently round', async ({ page }) => {
  await page.goto('/json-to-csv/');
  let app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'safe-decimal.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"amount":0.1,"scaled":1e3}]'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  await expect(app.locator('.status-error')).toHaveCount(0);

  await page.goto('/json-to-csv/');
  app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'precision-loss.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"amount":0.123456789012345678}]'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('.status-error')).toContainText('lose precision');
  await expect(app.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(app.locator('[data-role="convert-all"]')).toBeHidden();
});

test('homepage cannot hide an active conversion by switching categories', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage state-lock regression');
  await page.goto('/');
  const dataTab = page.getByRole('tab', { name: 'Data' });
  const imageTab = page.getByRole('tab', { name: 'Images' });
  const dataPanel = page.locator('[data-home-panel="data"]');
  const imagePanel = page.locator('[data-home-panel="image"]');

  await dataTab.click();
  const app = await appReady(page, dataPanel);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'busy.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,name\n1,Alice'),
  });
  await expect(app.locator('[data-role="output-format"]')).toBeEnabled();
  await delayFullFileReads(page, 5000);
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="cancel"]')).toBeVisible();
  await expect(imageTab).toHaveAttribute('aria-disabled', 'true');

  await imageTab.click();
  await expect(dataTab).toHaveAttribute('aria-selected', 'true');
  await expect(dataPanel).toBeVisible();
  await expect(imagePanel).toBeHidden();
  await expect(page.locator('[data-home-auto-hint]')).toContainText('Finish or cancel');

  await app.locator('[data-role="cancel"]').click();
  await expect(app.locator('[data-role="cancel"]')).toBeHidden({ timeout: 15_000 });
  await expect(imageTab).not.toHaveAttribute('aria-disabled', 'true');
  await imageTab.click();
  await expect(imageTab).toHaveAttribute('aria-selected', 'true');
  await expect(imagePanel).toBeVisible();
});

test('public homepage presents only live converter categories', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Launch-surface regression');
  await page.goto('/');
  const section = page.locator('#converters');
  await expect(section.locator('.category-card--live')).toHaveCount(2);
  await expect(section.locator('.category-card--planned')).toHaveCount(0);
  await expect(section.getByRole('link', { name: /Images/i })).toBeVisible();
  await expect(section.getByRole('link', { name: /Data/i })).toBeVisible();
  await expect(section).not.toContainText('Planned');
  await expect(section).not.toContainText('Archives');
  await expect(section).not.toContainText('Audio');
});

test('local Data conversion does not upload source bytes or contact an external origin', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Network privacy regression');
  const unsafeRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['http:', 'https:'].includes(url.protocol)) return;
    const external = url.origin !== 'http://127.0.0.1:4321';
    const uploadsData = !['GET', 'HEAD'].includes(request.method()) || Boolean(request.postData());
    if (external || uploadsData) unsafeRequests.push(`${request.method()} ${request.url()}`);
  });

  await page.goto('/csv-to-json/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'private-source.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('secret,value\nalpha,private-data'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  expect(unsafeRequests).toEqual([]);
});
