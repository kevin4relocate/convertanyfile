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
  const app = page.locator('[data-converter-app]').first();
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

const SRT = `1\n00:00:01,500 --> 00:00:03,000\nHello <i>world</i>.\n\n2\n00:00:04,250 --> 00:00:06,000\nSecond line\ncontinues here.\n`;

const VTT_WITH_METADATA = `WEBVTT\n\nNOTE local comment\nnot a cue\n\nSTYLE\n::cue { color: lime; }\n\nintro\n00:00:01.000 --> 00:00:02.500 line:90%\nHello <b>world</b>\n`;

test('Subtitle Preview performs worker preflight and exposes useful queue metadata', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Subtitle readiness regression');
  const errors = diagnostics(page);
  await page.goto('/subtitle-converter/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'ready.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(SRT) });
  await expect(app.locator('[data-engine-label]')).toHaveText('Private converter ready');
  await expect(app.locator('[data-role="output-format"]')).toBeEnabled();
  await expect(app.locator('[data-role="file-list"]')).toContainText('2 cues');
  await expect(app.locator('[data-role="file-list"]')).toContainText('ends 0:06');
  await expect(app.locator('[data-role="file-list"]')).toContainText('UTF-8');
  await expect(app.locator('.conversion-policy-note')).toContainText('ASS/SSA styling');
  expect(errors).toEqual([]);
});

test('SRT to VTT converts cue timing and text locally', async ({ page }) => {
  const errors = diagnostics(page);
  await page.goto('/srt-to-vtt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'captions.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(SRT) });
  await expect(app.locator('[data-role="output-format"]')).toHaveValue('vtt');
  await expect(app.getByLabel('Timing shift')).toBeVisible();
  await expect(app.getByLabel('Timing shift')).toHaveAttribute('type', 'number');
  await expect(app.getByLabel('Plain text only')).toBeVisible();
  await expect(app.getByLabel('Line endings')).toBeVisible();
  await expect(app.getByLabel('UTF-8 BOM')).toBeVisible();
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('captions.vtt');
  expect(result.text).toBe('WEBVTT\n\n00:00:01.500 --> 00:00:03.000\nHello <i>world</i>.\n\n00:00:04.250 --> 00:00:06.000\nSecond line\ncontinues here.');
  expect(errors).toEqual([]);
});

test('exact millisecond timing shift and formatting cleanup transform all cues deterministically', async ({ page }) => {
  await page.goto('/srt-to-vtt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'shift.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(SRT) });
  await app.getByLabel('Timing shift').fill('1350');
  await app.getByLabel('Plain text only').check();
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.text).toContain('00:00:02.850 --> 00:00:04.350');
  expect(result.text).toContain('Hello world.');
  expect(result.text).not.toContain('<i>');
});

test('negative timing shifts that cross zero fail instead of clipping cues', async ({ page }) => {
  await page.goto('/srt-to-vtt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'too-early.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(SRT) });
  await app.getByLabel('Timing shift').fill('-2000');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('.status-error')).toContainText('before 00:00');
  await expect(app.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

test('timing shift outside the premium safety range fails clearly', async ({ page }) => {
  await page.goto('/srt-to-vtt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'extreme.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(SRT) });
  await app.getByLabel('Timing shift').evaluate((input: HTMLInputElement) => { input.value = '700000'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('.status-error')).toContainText('-600000 to 600000 ms');
  await expect(app.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

test('WebVTT to SRT drops VTT-only blocks and cue settings', async ({ page }) => {
  await page.goto('/vtt-to-srt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'captions.webvtt', mimeType: 'text/vtt', buffer: Buffer.from(VTT_WITH_METADATA) });
  await expect(app.locator('[data-role="file-list"]')).toContainText('VTT metadata');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('captions.srt');
  expect(result.text).toBe('1\n00:00:01,000 --> 00:00:02,500\nHello <b>world</b>');
});

test('VTT to VTT without text/timing transforms preserves document metadata', async ({ page }) => {
  await page.goto('/subtitle-converter/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'metadata.vtt', mimeType: 'text/vtt', buffer: Buffer.from(VTT_WITH_METADATA) });
  await app.locator('[data-role="output-format"]').selectOption('vtt');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.text).toContain('NOTE local comment');
  expect(result.text).toContain('STYLE');
  expect(result.text).toContain('::cue { color: lime; }');
  expect(result.text).toContain('line:90%');
  expect(result.text).toContain('intro');
});

test('ASS to SRT keeps dialogue timing/text and strips ASS override syntax', async ({ page }) => {
  await page.goto('/ass-to-srt/');
  const app = await appReady(page);
  const ass = `[Script Info]\nScriptType: v4.00+\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.20,0:00:03.45,Default,,0,0,0,,{\\i1}Hello, world\\Nsecond line\n`;
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'styled.ass', mimeType: 'text/plain', buffer: Buffer.from(ass) });
  await expect(app.locator('[data-role="file-list"]')).toContainText('formatted text');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.text).toBe('1\n00:00:01,200 --> 00:00:03,450\nHello, world\nsecond line');
});

test('new SSA to VTT pair route is backed by real conversion', async ({ page }) => {
  await page.goto('/ssa-to-vtt/');
  const app = await appReady(page);
  const ssa = `[Script Info]\nScriptType: v4.00\n\n[Events]\nFormat: Marked, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: Marked=0,0:00:01.00,0:00:02.50,Default,,0,0,0,,Hello from SSA\n`;
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'legacy.ssa', mimeType: 'text/plain', buffer: Buffer.from(ssa) });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.name).toBe('legacy.vtt');
  expect(result.text).toContain('00:00:01.000 --> 00:00:02.500');
  expect(result.text).toContain('Hello from SSA');
});

test('SBV to SRT converts timestamp syntax deterministically', async ({ page }) => {
  await page.goto('/sbv-to-srt/');
  const app = await appReady(page);
  const sbv = `0:00:01.000,0:00:03.250\nFirst caption\n\n0:00:04.000,0:00:05.500\nSecond caption\n`;
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'youtube.sbv', mimeType: 'text/plain', buffer: Buffer.from(sbv) });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.text).toContain('00:00:01,000 --> 00:00:03,250');
  expect(result.text).toContain('00:00:04,000 --> 00:00:05,500');
});

test('TXT output supports timestamp ranges, cue spacing, CRLF and BOM', async ({ page }) => {
  await page.goto('/srt-to-txt/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'dialogue.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(SRT) });
  await expect(app.getByLabel('Timestamps')).toBeVisible();
  await expect(app.getByLabel('Cue spacing')).toBeVisible();
  await app.getByLabel('Timestamps').selectOption('range');
  await app.getByLabel('Cue spacing').selectOption('single');
  await app.getByLabel('Line endings').selectOption('crlf');
  await app.getByLabel('UTF-8 BOM').check();
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(Array.from(result.bytes.subarray(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  const text = result.text.replace(/^\uFEFF/, '');
  expect(text).toContain('[00:00:01.500 → 00:00:03.000] Hello world.');
  expect(text).toContain('\r\n[00:00:04.250 → 00:00:06.000] Second line');
  expect(text).not.toContain('<i>');
});

test('Windows-1252 fallback is detected during preflight and exported as UTF-8', async ({ page }) => {
  await page.goto('/srt-to-txt/');
  const app = await appReady(page);
  const prefix = Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nCaf', 'ascii');
  const suffix = Buffer.from('\n', 'ascii');
  const source = Buffer.concat([prefix, Buffer.from([0xe9]), suffix]);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'legacy.srt', mimeType: 'application/x-subrip', buffer: source });
  await expect(app.locator('[data-role="file-list"]')).toContainText('Windows-1252');
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  const result = await downloadText(page, app);
  expect(result.text).toBe('Café');
});

test('full-file preflight rejects a subtitle whose later cue is malformed', async ({ page }) => {
  await page.goto('/subtitle-converter/');
  const app = await appReady(page);
  const lateFailure = `1\n00:00:01,000 --> 00:00:02,000\nValid first cue\n\n2\nthis is not timing\nBroken second cue\n`;
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'late-failure.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(lateFailure) });
  await expect(app.locator('.file-row')).toHaveCount(0);
  await expect(app.locator('[data-role="notice"]')).toContainText('1 file skipped');
});

test('invalid SRT-shaped filenames are rejected before entering the queue', async ({ page }) => {
  await page.goto('/subtitle-converter/');
  const app = await appReady(page);
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'not-really.srt', mimeType: 'text/plain', buffer: Buffer.from('this is plain text without timed cues') });
  await expect(app.locator('.file-row')).toHaveCount(0);
  await expect(app.locator('[data-role="notice"]')).toContainText('1 file skipped');
});

test('homepage homogeneous subtitle drop auto-routes to Subtitle Preview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage Subtitle auto-route regression');
  await page.goto('/');
  await page.locator('[data-home-converter]').evaluate((element, content) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([content], 'captions.srt', { type: 'application/x-subrip' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, SRT);
  await expect(page.getByRole('tab', { name: /Subtitles/i })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-home-panel="subtitle"] [data-role="file-list"]')).toContainText('captions.srt');
  await expect(page.locator('[data-home-panel="subtitle"] [data-role="file-list"]')).toContainText('2 cues');
});

test('mixed subtitle and data files stay on selected Data tab and admit only Data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage mixed Subtitle regression');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Data' }).click();
  await page.locator('[data-home-converter]').evaluate((element, subtitle) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([subtitle], 'captions.srt', { type: 'application/x-subrip' }));
    transfer.items.add(new File(['id,name\n1,Alice'], 'people.csv', { type: 'text/csv' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, SRT);
  await expect(page.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true');
  const panel = page.locator('[data-home-panel="data"]');
  await expect(panel.locator('.file-row')).toHaveCount(1);
  await expect(panel.locator('[data-role="file-list"]')).toContainText('people.csv');
  await expect(panel.locator('[data-role="file-list"]')).not.toContainText('captions.srt');
  await expect(page.locator('[data-home-auto-hint]')).toContainText('Mixed files kept on Data');
});
