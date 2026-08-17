import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

const fakeAudioNamedJpg = Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00fake-audio');

function captureBrowserDiagnostics(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = `[console] ${message.text()}`;
      errors.push(text);
      console.log(text);
    }
  });
  page.on('pageerror', (error) => {
    const text = `[pageerror] ${error.message}`;
    errors.push(text);
    console.log(text);
  });
  page.on('requestfailed', (request) => {
    const text = `[requestfailed] ${request.url()} :: ${request.failure()?.errorText ?? 'unknown'}`;
    errors.push(text);
    console.log(text);
  });
  return errors;
}

async function expectControllerReady(page: Page) {
  const app = page.locator('[data-converter-app]');
  try {
    await expect(app).toHaveAttribute('data-initialized', 'true', { timeout: 5000 });
  } catch (error) {
    const snapshot = await page.evaluate(() => ({
      app: document.querySelector('[data-converter-app]')?.outerHTML.slice(0, 500),
      scripts: Array.from(document.scripts).map((script) => ({ src: script.src, type: script.type, text: script.textContent?.slice(0, 120) })),
    }));
    console.log(`[converter bootstrap snapshot] ${JSON.stringify(snapshot)}`);
    throw error;
  }
  return app;
}

test('real image engine accepts PNG, rejects disguised audio, converts and downloads JPEG', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run the expensive WASM conversion once');
  const browserErrors = captureBrowserDiagnostics(page);

  await page.goto('/image-converter/');
  const app = await expectControllerReady(page);
  const input = app.locator('[data-role="file-input"]');

  await input.setInputFiles([
    { name: 'sample.png', mimeType: 'image/png', buffer: PNG_2X2 },
    { name: 'pretend.jpg', mimeType: 'image/jpeg', buffer: fakeAudioNamedJpg },
  ]);

  await expect(app.locator('[data-role="workspace"]')).toBeVisible();
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('1 file');
  await expect(app.locator('[data-role="file-list"]')).toContainText('sample.png');
  await expect(app.locator('[data-role="file-list"]')).not.toContainText('pretend.jpg');
  await expect(app.locator('[data-role="notice"]')).toContainText('pretend.jpg');

  const convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 60_000 });
  await expect(app.locator('[data-role="engine-state"]')).toContainText('Private converter ready');
  await convert.click();

  const summary = app.locator('[data-role="result-summary"]');
  await expect(summary).toBeVisible({ timeout: 60_000 });
  await expect(summary).toContainText('1/1 converted');
  await expect(app.locator('.status-success')).toContainText('Converted');

  const downloadButton = app.getByRole('button', { name: 'Download', exact: true });
  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sample.jpg');

  const path = await download.path();
  expect(path).not.toBeNull();
  const jpeg = await readFile(path!);
  expect(Array.from(jpeg.subarray(0, 3))).toEqual([0xff, 0xd8, 0xff]);
  expect(browserErrors, browserErrors.join('\n')).toEqual([]);
});

test('large batch is capped at 50 and stays inside an internally scrollable list', async ({ page }) => {
  captureBrowserDiagnostics(page);
  await page.goto('/image-converter/');
  const app = await expectControllerReady(page);
  const files = Array.from({ length: 51 }, (_, index) => ({
    name: `image-${String(index + 1).padStart(2, '0')}.png`,
    mimeType: 'image/png',
    buffer: PNG_2X2,
  }));

  await app.locator('[data-role="file-input"]').setInputFiles(files);
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('50 files');
  await expect(app.locator('.file-row')).toHaveCount(50);
  await expect(app.locator('[data-role="notice"]')).toContainText('50-file limit');

  const list = app.locator('[data-role="file-list"]');
  const measurements = await list.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
    };
  });

  expect(measurements.clientHeight).toBeLessThanOrEqual(390);
  expect(measurements.scrollHeight).toBeGreaterThan(measurements.clientHeight);
  expect(measurements.overflowY).toBe('auto');

  const convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 60_000 });
  await expect(convert).toContainText('Convert 50 Files');
});
