import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function convertAndDownload(page: Page, route: string, file: { name: string; mimeType: string; buffer: Buffer }): Promise<{ text: string; app: Locator }> {
  await page.goto(route);
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles(file);
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { text: (await readFile(path!)).toString('utf8'), app };
}

test('duplicate and already-suffixed CSV headers cannot overwrite one another', async ({ page }) => {
  const result = await convertAndDownload(page, '/csv-to-json/', {
    name: 'headers.csv', mimeType: 'text/csv', buffer: Buffer.from('a,a_2,a\nfirst,second,third'),
  });
  expect(JSON.parse(result.text)).toEqual([{ a: 'first', a_2: 'second', a_3: 'third' }]);
});

test('literal dots in JSON keys cannot collide with nested-object dot paths', async ({ page }) => {
  const result = await convertAndDownload(page, '/json-to-csv/', {
    name: 'paths.json', mimeType: 'application/json', buffer: Buffer.from('[{"a.b":"literal","a":{"b":"nested"}}]'),
  });
  const [header, row] = result.text.split(/\r?\n/);
  expect(header).toBe('a\\.b,a.b');
  expect(row).toBe('literal,nested');
});

test('header-only delimited files preserve their schema when switching delimiters', async ({ page }) => {
  const result = await convertAndDownload(page, '/csv-to-tsv/', {
    name: 'schema.csv', mimeType: 'text/csv', buffer: Buffer.from('id,name,email\n'),
  });
  expect(result.text).toBe('id\tname\temail');
});

test('invalid UTF-8 data is rejected before entering the queue', async ({ page }) => {
  await page.goto('/data-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'legacy.csv', mimeType: 'text/csv', buffer: Buffer.from([0xff, 0xfe, 0x61, 0x00]),
  });
  await expect(app.locator('[data-role="workspace"]')).toBeHidden();
  await expect(app.locator('[data-role="notice"]')).toContainText('unsupported or invalid');
});
