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
