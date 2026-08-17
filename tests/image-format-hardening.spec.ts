import { expect, test } from '@playwright/test';

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

function truncatedPng(): Buffer {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52]).copy(bytes);
  bytes.writeUInt32BE(2, 16); bytes.writeUInt32BE(2, 20);
  return bytes;
}

test('PCX and TGA are runtime-gated inputs and convert through the real image engine', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run legacy WASM conversion once');
  await page.goto('/image-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles([
    { name: 'legacy.pcx', mimeType: 'image/x-pcx', buffer: pcx1x1() },
    { name: 'legacy.tga', mimeType: 'image/x-tga', buffer: tga1x1() },
  ]);

  await expect(app.locator('[data-role="batch-summary"]')).toContainText('2 files');
  await expect(app.locator('[data-role="file-list"]')).toContainText('legacy.pcx');
  await expect(app.locator('[data-role="file-list"]')).toContainText('legacy.tga');
  const output = app.locator('[data-role="output-format"]');
  await expect(output).toBeEnabled({ timeout: 60_000 });
  await output.selectOption('jpg');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('2/2 converted', { timeout: 60_000 });
  await expect(app.locator('.status-success')).toHaveCount(2);
  await expect(app.locator('[data-role="file-list"]')).not.toContainText(/\d{4,}% larger/);
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
