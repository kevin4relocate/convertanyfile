import { expect, test } from '@playwright/test';
import { parseSrt, serializeSrt } from '../src/platform/subtitle-translation/srt';

test('SRT parser preserves exact timestamps, cue numbers and multiline text', () => {
  const input = '\uFEFF7\r\n00:00:01,000 --> 00:00:03,250\r\nこんにちは\r\n世界\r\n\r\n8\r\n00:00:04,000 --> 00:00:05,000\r\nありがとう';
  const cues = parseSrt(input);
  expect(cues).toHaveLength(2);
  expect(cues[0]?.timing).toBe('00:00:01,000 --> 00:00:03,250');
  expect(cues[0]?.index).toBe('7');
  expect(cues[0]?.text).toBe('こんにちは\n世界');
  expect(serializeSrt(cues)).toContain('8\n00:00:04,000 --> 00:00:05,000\nありがとう');
  expect(() => parseSrt('1\nnot a timestamp\nHello')).toThrow('Invalid SRT block');
  expect(() => parseSrt('1\n00:00:05,000 --> 00:00:01,000\nHello')).toThrow('End time');
});


test('experimental translator is linked from subtitle converter', async ({ page }) => {
  await page.goto('/subtitle-converter/');
  await expect(page.getByRole('link', { name: 'Try Subtitle Translator' })).toHaveAttribute('href', '/subtitle-translator/');
});

test('translator gives clear unsupported-browser state without network fallback', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'Translator', { value: undefined, configurable: true }); });
  await page.goto('/subtitle-translator/');
  await expect(page.locator('[data-translate]')).toBeDisabled();
  await expect(page.locator('[data-progress]')).toContainText('unavailable');
});

test('SRT translation preserves cue timestamps and indices, and remains editable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Translator', {
      configurable: true,
      value: {
        availability: async () => 'available',
        create: async () => ({
          translate: async (text: string) => text.includes('今日は') ? 'Today we talk about Japanese history.' : 'Thank you for joining us.',
          destroy: () => {},
        }),
      },
    });
  });
  await page.goto('/subtitle-translator/');
  await expect(page.locator('[data-translate]')).toBeEnabled();
  await page.locator('[data-translate]').click();
  await expect(page.locator('[data-progress]')).toContainText('Translated 2 cues locally');
  const output = await page.locator('[data-output]').inputValue();
  expect(output).toContain('00:00:01,000 --> 00:00:04,500');
  expect(output).toContain('00:00:05,000 --> 00:00:07,500');
  expect(output).toContain('Today we talk about Japanese history.');
  expect(output).toContain('Thank you for joining us.');
  await expect(page.locator('[data-download]')).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-download]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('translated_ja_to_en.srt');
  await page.locator('[data-reset]').click();
  await expect(page.locator('[data-source]')).toHaveValue('');
  await expect(page.locator('[data-output]')).toHaveValue('');
  await expect(page.locator('[data-download]')).toBeDisabled();
});

test('unsupported language pair and malformed SRT fail without partial download', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Translator', {
      configurable: true,
      value: {
        availability: async () => 'unavailable',
        create: async () => { throw new DOMException('Unable to create translator for the given source and target language.', 'NotSupportedError'); },
      },
    });
  });
  await page.goto('/subtitle-translator/');
  await page.locator('[data-source]').fill('not a subtitle');
  await page.locator('[data-translate]').click();
  await expect(page.locator('[data-error]')).toContainText('Invalid SRT block');
  await expect(page.locator('[data-download]')).toBeDisabled();
  await page.locator('[data-source]').fill('1\n00:00:01,000 --> 00:00:02,000\nこんにちは');
  await page.locator('[data-translate]').click();
  await expect(page.locator('[data-error]')).toContainText('Chrome could not initialize ja → en');
  await expect(page.locator('[data-download]')).toBeDisabled();
});

test('create is invoked inside click without awaiting availability, preserving browser activation', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __translatorCalls?: string[] }).__translatorCalls = [];
    Object.defineProperty(window, 'Translator', {
      configurable: true,
      value: {
        availability: async () => {
          (window as Window & { __translatorCalls?: string[] }).__translatorCalls?.push('availability');
          return 'downloadable';
        },
        create: () => {
          (window as Window & { __translatorCalls?: string[] }).__translatorCalls?.push('create');
          return Promise.resolve({ translate: async (text: string) => text, destroy: () => {} });
        },
      },
    });
  });
  await page.goto('/subtitle-translator/');
  await page.locator('[data-translate]').click();
  await expect(page.locator('[data-progress]')).toContainText('Translated 2 cues locally');
  const calls = await page.evaluate(() => (window as Window & { __translatorCalls?: string[] }).__translatorCalls);
  expect(calls?.[0]).toBe('create');
});

test('SRT file picker has a compact filename indicator', async ({ page }) => {
  await page.goto('/subtitle-translator/');
  await expect(page.locator('[data-file-name]')).toHaveText('No file selected');
  await page.locator('[data-file]').setInputFiles({
    name: 'football-jp.srt', mimeType: 'text/plain',
    buffer: Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nこんにちは', 'utf8'),
  });
  await expect(page.locator('[data-file-name]')).toHaveText('football-jp.srt');
  await expect(page.locator('[data-source]')).toHaveValue(/こんにちは/);
});

test('file chooser lives in actions row and Reset clears input, result and filename', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Translator', {
      configurable: true,
      value: {
        availability: async () => 'available',
        create: async () => ({
          translate: async (text: string) => text,
          destroy: () => {},
        }),
      },
    });
  });
  await page.goto('/subtitle-translator/');
  await expect(page.locator('.translation-controls [data-file]')).toHaveCount(1);
  await expect(page.locator('.translation-editors [data-file]')).toHaveCount(0);
  await page.locator('[data-file]').setInputFiles({
    name: 'sample.srt', mimeType: 'text/plain',
    buffer: Buffer.from('1\\n00:00:01,000 --> 00:00:02,000\\nこんにちは', 'utf8'),
  });
  await expect(page.locator('[data-file-name]')).toHaveText('sample.srt');
  // Reset must work without depending on language-model availability or translation.
  await page.locator('[data-output]').fill('Draft translated subtitle');
  await page.locator('[data-reset]').click();
  await expect(page.locator('[data-source]')).toHaveValue('');
  await expect(page.locator('[data-output]')).toHaveValue('');
  await expect(page.locator('[data-file-name]')).toHaveText('No file selected');
  await expect(page.locator('[data-download]')).toBeDisabled();
  await expect(page.locator('[data-error]')).toBeHidden();
});
