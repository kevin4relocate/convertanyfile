import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

function diagnostics(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`[console] ${message.text()}`); });
  page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));
  page.on('requestfailed', (request) => errors.push(`[requestfailed] ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`));
  return errors;
}

async function appReady(page: Page): Promise<Locator> {
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  return app;
}

async function downloadText(page: Page, app: Locator): Promise<{ name: string; bytes: Buffer; text: string }> {
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  return { name: download.suggestedFilename(), bytes, text: bytes.toString('utf8') };
}

test('CSV to JSON parses quoted commas, escaped quotes, and embedded newlines locally', async ({ page }) => {
  const errors = diagnostics(page);
  await page.goto('/csv-to-json/');
  const app = await appReady(page);
  const csv = 'name,notes,age\r\nAlice,"hello, world",30\r\nBob,"line one\nline two",41\r\nCara,"said ""hello""",27\r\n';
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'people.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await expect(app.locator('[data-role="output-format"]')).toHaveValue('json');
  await expect(app.getByLabel('Pretty print')).toBeVisible();
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('people.json');
  expect(JSON.parse(result.text)).toEqual([
    { name: 'Alice', notes: 'hello, world', age: '30' },
    { name: 'Bob', notes: 'line one\nline two', age: '41' },
    { name: 'Cara', notes: 'said "hello"', age: '27' },
  ]);
  expect(errors).toEqual([]);
});

test('JSON to CSV flattens nested objects and keeps arrays explicit', async ({ page }) => {
  const errors = diagnostics(page);
  await page.goto('/json-to-csv/');
  const app = await appReady(page);
  const json = JSON.stringify([
    { name: 'Alice', profile: { city: 'Austin' }, tags: ['a', 'b'] },
    { name: 'Bob', profile: { city: 'Paris' }, tags: [] },
  ]);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from(json) });
  await expect(app.locator('[data-role="output-format"]')).toHaveValue('csv');
  await expect(app.getByLabel('Header row')).toBeVisible();
  await expect(app.getByLabel('Line endings')).toBeVisible();
  await expect(app.getByLabel('UTF-8 BOM')).toBeVisible();
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('records.csv');
  expect(result.text).toContain('name,profile.city,tags');
  expect(result.text).toContain('Alice,Austin,"[""a"",""b""]"');
  expect(result.text).toContain('Bob,Paris,[]');
  expect(errors).toEqual([]);
});

test('NDJSON alias converts to a normal JSON array', async ({ page }) => {
  const errors = diagnostics(page);
  await page.goto('/jsonl-to-json/');
  const app = await appReady(page);
  const ndjson = '{"id":1,"name":"first"}\n\n{"id":2,"name":"second"}\n';
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'events.ndjson', mimeType: 'application/x-ndjson', buffer: Buffer.from(ndjson) });
  await expect(app.locator('[data-role="file-list"]')).toContainText('events.ndjson');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('events.json');
  expect(JSON.parse(result.text)).toEqual([{ id: 1, name: 'first' }, { id: 2, name: 'second' }]);
  expect(errors).toEqual([]);
});

test('Data output controls are engine-declared and affect CSV bytes', async ({ page }) => {
  const errors = diagnostics(page);
  await page.goto('/data-converter/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'one.json', mimeType: 'application/json', buffer: Buffer.from('[{"name":"Alice"},{"name":"Bob"}]') });
  const output = app.locator('[data-role="output-format"]');
  await expect(output).toBeEnabled();
  await output.selectOption('csv');
  const header = app.getByLabel('Header row');
  const endings = app.getByLabel('Line endings');
  const bom = app.getByLabel('UTF-8 BOM');
  await header.uncheck();
  await endings.selectOption('crlf');
  await bom.check();
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(Array.from(result.bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  expect(result.text.replace(/^\uFEFF/, '')).toBe('Alice\r\nBob');
  expect(errors).toEqual([]);
});

test('malformed delimited input fails permanently without a retry loop', async ({ page }) => {
  await page.goto('/csv-to-json/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'broken.csv', mimeType: 'text/csv', buffer: Buffer.from('name,notes\nAlice,"never closed') });
  await expect(app.locator('.file-row')).toHaveCount(1);
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('.status-error')).toContainText('unclosed quoted field');
  await expect(app.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(app.locator('[data-role="convert-all"]')).toBeHidden();
});

test('data batch reuses the shared queue and ZIP workflow', async ({ page }) => {
  const errors = diagnostics(page);
  await page.goto('/csv-to-json/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles([
    { name: 'one.csv', mimeType: 'text/csv', buffer: Buffer.from('id,name\n1,Alice') },
    { name: 'two.csv', mimeType: 'text/csv', buffer: Buffer.from('id,name\n2,Bob') },
  ]);
  await expect(app.locator('.file-row')).toHaveCount(2);
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('2/2 converted');
  await expect(app.locator('[data-role="download-zip"]')).toBeVisible();
  expect(errors).toEqual([]);
});
