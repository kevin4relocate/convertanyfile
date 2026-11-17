import { expect, test } from '@playwright/test';

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
});

test('unsupported language pair and malformed SRT fail without partial download', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Translator', {
      configurable: true,
      value: {
        availability: async () => 'unavailable',
        create: async () => { throw new Error('should not create translator'); },
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
  await expect(page.locator('[data-error]')).toContainText('does not support the selected language pair');
  await expect(page.locator('[data-download]')).toBeDisabled();
});
