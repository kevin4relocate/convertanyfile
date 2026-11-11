import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { expect, test, type Locator, type Page } from '@playwright/test';
import JSZip from 'jszip';

async function makeZip(options: { unsafe?: boolean } = {}): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('hello.txt', 'hello archive');
  zip.file('nested/data.json', '{"ok":true}');
  zip.folder('empty-folder');
  if (options.unsafe) zip.file('../escape.txt', 'do not escape');
  return Buffer.from(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}

function writeOctal(header: Buffer, offset: number, length: number, value: number): void {
  const text = value.toString(8).padStart(length - 1, '0').slice(-(length - 1));
  header.write(text, offset, length - 1, 'ascii');
  header[offset + length - 1] = 0;
}

function makeTar(): Buffer {
  const data = Buffer.from('hello tar');
  const header = Buffer.alloc(512);
  header.write('hello.txt', 0, 'utf8');
  writeOctal(header, 100, 8, 0o644);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, data.length);
  writeOctal(header, 136, 12, 1_700_000_000);
  header.fill(32, 148, 156);
  header[156] = 48;
  header.write('ustar', 257, 'ascii');
  header[262] = 0;
  header.write('00', 263, 'ascii');
  const checksum = header.reduce((sum, value) => sum + value, 0);
  header.write(checksum.toString(8).padStart(6, '0').slice(-6), 148, 6, 'ascii');
  header[154] = 0;
  header[155] = 32;
  const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
  data.copy(padded);
  return Buffer.concat([header, padded, Buffer.alloc(1024)]);
}

function fixture(name: string): Promise<Buffer> {
  return readFile(`tests/fixtures/archive-wasm/${name}`);
}

async function downloadBytes(page: Page, app: Locator): Promise<{ name: string; bytes: Buffer }> {
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return { name: download.suggestedFilename(), bytes: await readFile(path!) };
}

async function convertedZip(page: Page, source: { name: string; mimeType: string; buffer: Buffer }): Promise<JSZip> {
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles(source);
  await expect(app.locator('[data-role="output-format"]')).toHaveValue('zip');
  await app.locator('[data-role="convert-all"]').click();
  try {
    await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  } catch (error) {
    const details = await app.locator('[data-role="file-list"]').innerText();
    throw new Error(`Archive conversion failed: ${details}`, { cause: error });
  }
  const result = await downloadBytes(page, app);
  return JSZip.loadAsync(result.bytes, { checkCRC32: true });
}

test('Archive preview loads the shared converter with archive engine', async ({ page }) => {
  await page.goto('/archive-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-engine', 'archive');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await expect(page.getByRole('heading', { level: 1, name: /Free online archive converter/ })).toBeVisible();
  await expect(app.locator('[data-role="file-input"]')).toHaveAttribute('accept', /\.7z/);
  await expect(app.locator('[data-role="file-input"]')).toHaveAttribute('accept', /\.rar/);
  await expect(app.locator('[data-role="file-input"]')).toHaveAttribute('accept', /\.gz/);
});

test('Archive pair routes use archive-specific product content', async ({ page }) => {
  await page.goto('/7z-to-zip/');
  await expect(page.getByRole('heading', { level: 1, name: 'Convert 7Z to ZIP' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Archive safety checks before repacking' })).toBeVisible();
  await expect(page.locator('main').getByText('7Z/RAR policy:', { exact: false }).first()).toBeVisible();
});

test('7Z decoder is lazy-loaded and a real 7Z can be repacked to ZIP', async ({ page }) => {
  const vendorRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/vendor/libarchive-wasm/')) vendorRequests.push(request.url());
  });
  await page.goto('/7z-to-zip/');
  expect(vendorRequests).toEqual([]);

  const zip = await convertedZip(page, {
    name: 'sample.7z',
    mimeType: 'application/x-7z-compressed',
    buffer: await fixture('simple-files.7z'),
  });
  expect(Object.keys(zip.files).length).toBeGreaterThan(0);
  expect(vendorRequests.some((url) => url.endsWith('/libarchive.wasm'))).toBe(true);
});

test('RAR4 input is decoded locally and repacked to a CRC-valid ZIP', async ({ page }) => {
  await page.goto('/rar-to-zip/');
  const zip = await convertedZip(page, {
    name: 'sample-v4.rar',
    mimeType: 'application/vnd.rar',
    buffer: await fixture('v4.rar'),
  });
  expect(await zip.file('example/README.md')!.async('text')).toContain('# example');
});

test('RAR5 input is decoded locally and repacked to a CRC-valid ZIP', async ({ page }) => {
  await page.goto('/rar-to-zip/');
  const zip = await convertedZip(page, {
    name: 'sample-v5.rar',
    mimeType: 'application/vnd.rar',
    buffer: await fixture('v5.rar'),
  });
  expect(await zip.file('example/README.md')!.async('text')).toContain('# example');
});

test('encrypted RAR is rejected instead of producing partial output', async ({ page }) => {
  await page.goto('/rar-to-zip/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'encrypted.rar',
    mimeType: 'application/vnd.rar',
    buffer: await fixture('v4-encrypted.rar'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="file-list"]')).toContainText(/Encrypted archives are not supported|encrypted/i);
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
});

test('ZIP converts to TAR locally, keeps directory entries, and downloads a real TAR container', async ({ page }) => {
  await page.goto('/zip-to-tar/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'sample.zip', mimeType: 'application/zip', buffer: await makeZip() });
  await expect(app.locator('[data-engine-label]')).toHaveText('Private converter ready');
  await expect(app.locator('[data-role="output-format"]')).toHaveValue('tar');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadBytes(page, app);
  expect(result.name).toBe('sample.tar');
  expect(result.bytes.subarray(257, 262).toString('utf8')).toBe('ustar');
  expect(result.bytes.toString('utf8')).toContain('hello.txt');
  expect(result.bytes.toString('utf8')).toContain('hello archive');
  expect(result.bytes.toString('utf8')).toContain('empty-folder');
});

test('single-file GZIP converts to ZIP and restores the base filename', async ({ page }) => {
  await page.goto('/gz-to-zip/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  const compressed = gzipSync(Buffer.from('hello gzip'));
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'notes.txt.gz', mimeType: 'application/gzip', buffer: compressed });
  await expect(app.locator('[data-role="output-format"]')).toHaveValue('zip');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadBytes(page, app);
  expect(result.name).toBe('notes.txt.zip');
  const zip = await JSZip.loadAsync(result.bytes);
  expect(Object.keys(zip.files)).toContain('notes.txt');
  expect(await zip.file('notes.txt')!.async('text')).toBe('hello gzip');
});

test('ZIP output exposes engine-declared compression profiles and produces a valid ZIP', async ({ page }) => {
  await page.goto('/tar-to-zip/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'sample.tar', mimeType: 'application/x-tar', buffer: makeTar() });
  const compression = app.getByLabel('ZIP compression');
  await expect(compression).toBeVisible();
  await compression.selectOption('maximum');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadBytes(page, app);
  expect(result.name).toBe('sample.zip');
  const zip = await JSZip.loadAsync(result.bytes, { checkCRC32: true });
  expect(await zip.file('hello.txt')!.async('text')).toBe('hello tar');
});

test('unsafe ZIP paths reject the archive instead of silently dropping entries', async ({ page }) => {
  await page.goto('/archive-converter/');
  const app = page.locator('[data-converter-app]');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'unsafe.zip', mimeType: 'application/zip', buffer: await makeZip({ unsafe: true }) });
  await app.locator('[data-role="output-format"]').selectOption('tar');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="file-list"]')).toContainText('unsafe file path');
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
});

test('Invalid ZIP signature is rejected before conversion', async ({ page }) => {
  await page.goto('/archive-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'fake.zip', mimeType: 'application/zip', buffer: Buffer.from('not a zip') });
  await expect(app.locator('[data-role="file-list"]')).not.toContainText('fake.zip');
});

test('Invalid 7Z and RAR signatures are rejected before WASM initialization', async ({ page }) => {
  const vendorRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/vendor/libarchive-wasm/')) vendorRequests.push(request.url());
  });
  await page.goto('/archive-converter/');
  const app = page.locator('[data-converter-app]');
  await app.locator('[data-role="file-input"]').setInputFiles([
    { name: 'fake.7z', mimeType: 'application/x-7z-compressed', buffer: Buffer.from('not 7z') },
    { name: 'fake.rar', mimeType: 'application/vnd.rar', buffer: Buffer.from('not rar') },
  ]);
  await expect(app.locator('[data-role="file-list"]')).not.toContainText('fake.7z');
  await expect(app.locator('[data-role="file-list"]')).not.toContainText('fake.rar');
  expect(vendorRequests).toEqual([]);
});

test('TAR with an invalid header checksum is rejected during admission', async ({ page }) => {
  await page.goto('/archive-converter/');
  const app = page.locator('[data-converter-app]');
  const tar = makeTar();
  tar[10] = (tar[10] ?? 0) ^ 0xff;
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'broken.tar', mimeType: 'application/x-tar', buffer: tar });
  await expect(app.locator('[data-role="file-list"]')).not.toContainText('broken.tar');
});
