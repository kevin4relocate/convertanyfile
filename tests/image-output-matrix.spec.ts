import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { FORMAT_REFERENCE } from '../src/content/format-reference';
import { IMAGE_OUTPUTS } from '../src/engines/image/formats';

const PNG_16 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAIUlEQVR4nGNkIAD+MzD8xyfPRMgAQmDUgFEDRg0YLAYAABitAh61MMBjAAAAAElFTkSuQmCC',
  'base64',
);

const CERTIFIED_OUTPUTS = IMAGE_OUTPUTS.map((output) => output.id);

async function addSource(page: import('@playwright/test').Page) {
  const app = page.locator('[data-converter-app]');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'matrix-source.png',
    mimeType: 'image/png',
    buffer: PNG_16,
  });
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('1 file');
  return app;
}

test('every certified output has a public format reference', () => {
  for (const output of IMAGE_OUTPUTS) {
    expect(FORMAT_REFERENCE[output.id], `${output.id} needs format documentation`).toBeTruthy();
  }
});

test('every public image output is writable and its result can be decoded again', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run the full WASM codec matrix once');
  test.setTimeout(8 * 60_000);

  const browserErrors: string[] = [];
  page.on('pageerror', (error) => browserErrors.push(`[pageerror] ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`[console] ${message.text()}`); });

  await page.goto('/image-converter/');
  let app = await addSource(page);
  const output = app.locator('[data-role="output-format"]');
  await expect(output).toBeEnabled({ timeout: 60_000 });

  const optionValues = await output.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value));
  expect(optionValues).toEqual(CERTIFIED_OUTPUTS);

  for (const format of CERTIFIED_OUTPUTS) {
    await output.selectOption(format);
    const convert = app.locator('[data-role="convert-all"]');
    await expect(convert, `${format} convert button`).toBeEnabled({ timeout: 60_000 });
    await convert.click();
    await expect(app.locator('[data-role="result-summary"]'), `${format} encode`).toContainText('1/1 converted', { timeout: 90_000 });

    const downloadPromise = page.waitForEvent('download');
    await app.getByRole('button', { name: 'Download', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`matrix-source.${format}`);
    const path = await download.path();
    expect(path, `${format} download path`).not.toBeNull();
    const encoded = await readFile(path!);
    expect(encoded.byteLength, `${format} produced bytes`).toBeGreaterThan(8);

    // Decode the exact generated file back through the public product path. This
    // catches writers that return bytes but produce a file our packaged runtime
    // cannot subsequently read.
    await app.locator('[data-role="clear-all"]').click();
    await app.locator('[data-role="file-input"]').setInputFiles({
      name: `roundtrip.${format}`,
      mimeType: 'application/octet-stream',
      buffer: encoded,
    });
    await expect(app.locator('[data-role="batch-summary"]'), `${format} decode admission`).toContainText('1 file');
    await output.selectOption('jpg');
    await app.locator('[data-role="convert-all"]').click();
    await expect(app.locator('[data-role="result-summary"]'), `${format} round-trip decode`).toContainText('1/1 converted', { timeout: 90_000 });

    await app.locator('[data-role="clear-all"]').click();
    app = await addSource(page);
    await expect(output).toBeEnabled({ timeout: 60_000 });
  }

  expect(browserErrors, browserErrors.join('\n')).toEqual([]);
});
