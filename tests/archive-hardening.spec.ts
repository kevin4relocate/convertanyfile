import { readFile } from 'node:fs/promises';
import { expect, test, type Locator, type Page } from '@playwright/test';
import JSZip from 'jszip';

interface TarEntrySpec {
  path: string;
  data?: Buffer;
  type?: '0' | '1' | '2' | '5' | '6';
  linkName?: string;
}

function writeOctal(header: Buffer, offset: number, length: number, value: number): void {
  const text = value.toString(8).padStart(length - 1, '0').slice(-(length - 1));
  header.write(text, offset, length - 1, 'ascii');
  header[offset + length - 1] = 0;
}

function makeTarEntries(entries: readonly TarEntrySpec[]): Buffer {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    const type = entry.type ?? '0';
    const data = type === '0' ? (entry.data ?? Buffer.alloc(0)) : Buffer.alloc(0);
    const header = Buffer.alloc(512);
    header.write(entry.path, 0, 100, 'utf8');
    writeOctal(header, 100, 8, type === '5' ? 0o755 : 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, data.length);
    writeOctal(header, 136, 12, 1_700_000_000);
    header.fill(32, 148, 156);
    header[156] = type.charCodeAt(0);
    if (entry.linkName) header.write(entry.linkName, 157, 100, 'utf8');
    header.write('ustar', 257, 'ascii');
    header[262] = 0;
    header.write('00', 263, 'ascii');
    const checksum = header.reduce((sum, value) => sum + value, 0);
    header.write(checksum.toString(8).padStart(6, '0').slice(-6), 148, 6, 'ascii');
    header[154] = 0;
    header[155] = 32;
    chunks.push(header);
    if (data.length) {
      const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512);
      data.copy(padded);
      chunks.push(padded);
    }
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}

function fixture(name: string): Promise<Buffer> {
  return readFile(`tests/fixtures/archive-wasm/${name}`);
}

async function downloadBytes(page: Page, app: Locator): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download');
  await app.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!);
}

async function addAndConvert(page: Page, source: { name: string; mimeType: string; buffer: Buffer }, output = 'zip'): Promise<Locator> {
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles(source);
  await app.locator('[data-role="output-format"]').selectOption(output);
  await app.locator('[data-role="convert-all"]').click();
  return app;
}

test('Archive dropzone visibly advertises 7Z and RAR', async ({ page }) => {
  await page.goto('/archive-converter/');
  const copy = page.locator('[data-converter-app] .drop-copy');
  await expect(copy).toContainText('7Z');
  await expect(copy).toContainText('RAR');
});

test('truncated real 7Z fails permanently after signature admission', async ({ page }) => {
  await page.goto('/7z-to-zip/');
  const source = await fixture('simple-files.7z');
  const app = await addAndConvert(page, {
    name: 'truncated.7z',
    mimeType: 'application/x-7z-compressed',
    buffer: source.subarray(0, Math.min(20, source.length)),
  });
  await expect(app.locator('[data-role="file-list"]')).toContainText(/corrupt|incomplete/i);
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
  await expect(app.getByRole('button', { name: 'Retry' })).toHaveCount(0);
});

test('truncated real RAR fails permanently after signature admission', async ({ page }) => {
  await page.goto('/rar-to-zip/');
  const source = await fixture('v4.rar');
  const app = await addAndConvert(page, {
    name: 'truncated.rar',
    mimeType: 'application/vnd.rar',
    buffer: source.subarray(0, Math.min(20, source.length)),
  });
  await expect(app.locator('[data-role="file-list"]')).toContainText(/corrupt|incomplete/i);
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
  await expect(app.getByRole('button', { name: 'Retry' })).toHaveCount(0);
});

test('WASM runtime load failure is temporary and exposes Retry', async ({ page }) => {
  await page.route('**/vendor/libarchive-wasm/libarchive.wasm', (route) => route.abort());
  await page.goto('/7z-to-zip/');
  const app = await addAndConvert(page, {
    name: 'runtime-check.7z',
    mimeType: 'application/x-7z-compressed',
    buffer: await fixture('simple-files.7z'),
  });
  await expect(app.locator('[data-role="file-list"]')).toContainText(/decoder runtime unavailable/i);
  await expect(app.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('duplicate TAR paths are rejected before ZIP output can overwrite them', async ({ page }) => {
  await page.goto('/tar-to-zip/');
  const tar = makeTarEntries([
    { path: 'same.txt', data: Buffer.from('first') },
    { path: 'same.txt', data: Buffer.from('second') },
  ]);
  const app = await addAndConvert(page, { name: 'duplicate.tar', mimeType: 'application/x-tar', buffer: tar });
  await expect(app.locator('[data-role="file-list"]')).toContainText(/duplicate path/i);
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
  await expect(app.getByRole('button', { name: 'Retry' })).toHaveCount(0);
});

test('TAR symbolic links are rejected instead of silently disappearing', async ({ page }) => {
  await page.goto('/tar-to-zip/');
  const tar = makeTarEntries([
    { path: 'real.txt', data: Buffer.from('real') },
    { path: 'alias.txt', type: '2', linkName: 'real.txt' },
  ]);
  const app = await addAndConvert(page, { name: 'symlink.tar', mimeType: 'application/x-tar', buffer: tar });
  await expect(app.locator('[data-role="file-list"]')).toContainText(/symbolic link/i);
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
});

test('TAR control-character paths are rejected', async ({ page }) => {
  await page.goto('/tar-to-zip/');
  const tar = makeTarEntries([{ path: 'bad\u0001name.txt', data: Buffer.from('bad') }]);
  const app = await addAndConvert(page, { name: 'control.tar', mimeType: 'application/x-tar', buffer: tar });
  await expect(app.locator('[data-role="file-list"]')).toContainText(/control characters/i);
  await expect(app.locator('[data-role="result-summary"]')).toContainText('failed');
});

test('Unicode names and zero-byte files survive TAR to ZIP repacking', async ({ page }) => {
  await page.goto('/tar-to-zip/');
  const unicodePath = 'thư-mục/日本語-😀.txt';
  const tar = makeTarEntries([
    { path: unicodePath, data: Buffer.from('unicode payload') },
    { path: 'empty.txt', data: Buffer.alloc(0) },
  ]);
  const app = await addAndConvert(page, { name: 'unicode.tar', mimeType: 'application/x-tar', buffer: tar });
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const zip = await JSZip.loadAsync(await downloadBytes(page, app), { checkCRC32: true });
  expect(await zip.file(unicodePath)!.async('text')).toBe('unicode payload');
  expect((await zip.file('empty.txt')!.async('uint8array')).byteLength).toBe(0);
});
