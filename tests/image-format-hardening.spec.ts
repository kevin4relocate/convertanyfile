import { expect, test, type Page } from '@playwright/test';

function pcx1x1(): Buffer {
  const bytes = Buffer.alloc(135);
  bytes[0] = 0x0a; bytes[1] = 5; bytes[2] = 1; bytes[3] = 8;
  bytes.writeUInt16LE(0, 8); bytes.writeUInt16LE(0, 10);
  bytes.writeUInt16LE(72, 12); bytes.writeUInt16LE(72, 14);
  bytes[65] = 3; bytes.writeUInt16LE(2, 66); bytes.writeUInt16LE(1, 68);
  Buffer.from([0xc1, 0xff, 0x00, 0xc2, 0x00, 0xc2, 0x00]).copy(bytes, 128);
  return bytes;
}

function tga1x1(): Buffer {
  const bytes = Buffer.alloc(21);
  bytes[2] = 2;
  bytes.writeUInt16LE(1, 12); bytes.writeUInt16LE(1, 14);
  bytes[16] = 24; bytes[17] = 0x20;
  Buffer.from([0x00, 0x00, 0xff]).copy(bytes, 18);
  return bytes;
}

function jpeg2x2(): Buffer {
  return Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCpRRRX4ef0gf/Z', 'base64');
}

function realMultiSizePngBackedIco(): Buffer {
  return Buffer.from('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', 'base64');
}

function truncatedPng(): Buffer {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52]).copy(bytes);
  bytes.writeUInt32BE(2, 16); bytes.writeUInt32BE(2, 20);
  return bytes;
}

async function expectLegacyConversion(page: Page, name: string, mimeType: string, buffer: Buffer): Promise<void> {
  await page.goto('/image-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({ name, mimeType, buffer });
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('1 file');
  await expect(app.locator('[data-role="file-list"]')).toContainText(name);
  const output = app.locator('[data-role="output-format"]');
  await expect(output).toBeEnabled({ timeout: 60_000 });
  await expect(app.locator('[data-role="file-list"]')).toContainText(name);
  await output.selectOption('jpg');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toBeVisible({ timeout: 60_000 });
  const summary = await app.locator('[data-role="result-summary"]').innerText();
  const rows = await app.locator('[data-role="file-list"]').innerText();
  console.log(`[legacy-conversion] ${name} :: ${summary} :: ${rows.replace(/\n/g, ' | ')}`);
  await expect(app.locator('[data-role="result-summary"]'), `${name}: ${rows}`).toContainText('1/1 converted');
  await expect(app.locator('.status-success')).toHaveCount(1);
  await expect(app.locator('[data-role="file-list"]')).not.toContainText(/\d{4,}% larger/);
}

test('PCX converts through the real image engine', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run legacy WASM conversion once');
  await expectLegacyConversion(page, 'legacy.pcx', 'image/x-pcx', pcx1x1());
});

test('TGA converts through the real image engine', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run legacy WASM conversion once');
  await expectLegacyConversion(page, 'legacy.tga', 'image/x-tga', tga1x1());
});

test('real multi-size PNG-backed ICO converts through the real image engine', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run real ICO WASM conversion once');
  await expectLegacyConversion(page, 'image.ico', 'image/x-icon', realMultiSizePngBackedIco());
});

test('mislabeled JPEG bytes with a PNG filename are detected and converted', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run signature-over-extension regression once');
  await page.goto('/image-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'generated-image.png',
    mimeType: 'image/png',
    buffer: jpeg2x2(),
  });
  await expect(app.locator('[data-role="file-list"]')).toContainText('JPEG image');
  const output = app.locator('[data-role="output-format"]');
  await expect(output).toBeEnabled({ timeout: 60_000 });
  await output.selectOption('webp');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted', { timeout: 60_000 });
  await expect(app.locator('.status-success')).toHaveCount(1);
});

test('deterministic corrupt-input failures do not offer pointless retry actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run failure semantics once');
  await page.goto('/image-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'truncated.png', mimeType: 'image/png', buffer: truncatedPng() });
  const convert = app.locator('[data-role="convert-all"]');
  await expect(convert).toBeEnabled({ timeout: 60_000 });
  await convert.click();

  const failed = app.locator('.status-error');
  await expect(failed).toBeVisible({ timeout: 60_000 });
  await expect(failed).toContainText(/corrupted|invalid|Unable to convert/i);
  await expect(failed.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(app.locator('[data-role="convert-all"]')).toBeHidden();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1 failed');
});