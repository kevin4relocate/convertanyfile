import { expect, test } from '@playwright/test';
import { imageDownloadFilename, applyImageDownloadNames, cleanDownloadAffix } from '../src/image-tools/core/download-naming';

test('image naming preserves the original stem while using the real output extension', () => {
  expect(imageDownloadFilename('旅行 写真.JPG', '旅行 写真-resized.webp', { mode: 'tool-default', affix: '' })).toBe('旅行 写真-resized.webp');
  expect(imageDownloadFilename('旅行 写真.JPG', '旅行 写真-resized.webp', { mode: 'original', affix: '' })).toBe('旅行 写真.webp');
  expect(imageDownloadFilename('portrait.jpg', 'portrait-compressed.png', { mode: 'prefix', affix: 'edited-' })).toBe('edited-portrait.png');
  expect(imageDownloadFilename('portrait.jpg', 'portrait-resized.webp', { mode: 'suffix', affix: '-small' })).toBe('portrait-small.webp');
  expect(imageDownloadFilename('portrait.jpeg', 'portrait-resized.jpg', { mode: 'suffix', affix: '' })).toBe('portrait.jpg');
  expect(imageDownloadFilename('portrait.jpg', 'app-icons.zip', { mode: 'prefix', affix: 'edit-' })).toBe('app-icons.zip');
  expect(cleanDownloadAffix('../edit:/')).toBe('-edit--');
});

test('ZIP entries retain the per-file original names and extension', () => {
  const files = [
    { filename: 'first-watermarked.webp', sourceFilename: 'first.jpg', blob: new Blob(['a']) },
    { filename: 'second-watermarked.png', sourceFilename: 'second.webp', blob: new Blob(['b']) },
  ];
  expect(applyImageDownloadNames(files, { mode: 'tool-default', affix: '' }).map(item => item.filename)).toEqual(['first-watermarked.webp', 'second-watermarked.png']);
  expect(applyImageDownloadNames(files, { mode: 'original', affix: '' }).map(item => item.filename)).toEqual(['first.webp', 'second.png']);
  expect(applyImageDownloadNames(files, { mode: 'prefix', affix: 'new_' }).map(item => item.filename)).toEqual(['new_first.webp', 'new_second.png']);
  expect(applyImageDownloadNames(files, { mode: 'suffix', affix: '_done' }).map(item => item.filename)).toEqual(['first_done.webp', 'second_done.png']);
});

test('image editing workbenches share filename choices without affecting Bulk Rename', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Check shared options once in Chromium');
  for (const route of ['/resize-image/', '/crop-image/', '/compress-image/', '/remove-image-metadata/', '/remove-watermark/', '/add-watermark/']) {
    await page.goto(route);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
    const select = app.locator('[data-download-name-mode]');
    await expect(select).toHaveValue('tool-default');
    // Some editors hide their entire action footer until an image is processed.
    // Verify select state in the DOM without waiting for a currently hidden footer.
    await select.evaluate((element: HTMLSelectElement) => {
      element.value = 'prefix';
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(app.locator('[data-download-name-affix-label]')).toHaveText('Prefix');
    await app.locator('[data-download-name-affix]').evaluate((element: HTMLInputElement) => { element.value = 'edited-'; });
    await select.evaluate((element: HTMLSelectElement) => {
      element.value = 'suffix';
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(app.locator('[data-download-name-affix-label]')).toHaveText('Suffix');
    await select.evaluate((element: HTMLSelectElement) => {
      element.value = 'tool-default';
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(app.locator('[data-download-name-affix]')).toBeHidden();
  }
  await page.goto('/bulk-rename-images/');
  await expect(page.locator('[data-image-tool-app]')).toHaveAttribute('data-image-tool-ready', 'true');
  await expect(page.locator('[data-download-name-mode]')).toHaveCount(0);
});

test('resize download honors the chosen prefix and original name', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Single browser for image encoding');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==', 'base64');
  await page.goto('/resize-image/');
  const app = page.locator('[data-image-tool-app]');
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'holiday.png', mimeType: 'image/png', buffer: png });
  await expect(app.locator('[data-role="process-batch"]')).toBeEnabled();
  await app.locator('[data-role="process-batch"]').click();
  await expect(app.locator('[data-role="download-batch"]')).toBeEnabled();
  await app.locator('[data-download-name-mode]').selectOption('prefix');
  await app.locator('[data-download-name-affix]').fill('new_');
  const first = page.waitForEvent('download');
  await app.locator('[data-role="download-batch"]').click();
  expect((await first).suggestedFilename()).toBe('new_holiday.png');
  await app.locator('[data-download-name-mode]').selectOption('original');
  const second = page.waitForEvent('download');
  await app.locator('[data-role="download-batch"]').click();
  expect((await second).suggestedFilename()).toBe('holiday.png');
  await app.locator('[data-download-name-mode]').selectOption('tool-default');
  const third = page.waitForEvent('download');
  await app.locator('[data-role="download-batch"]').click();
  expect((await third).suggestedFilename()).toContain('holiday-');
});
