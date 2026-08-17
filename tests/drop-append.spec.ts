import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

test('dropping more files into an active workspace appends them to the batch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run the drag-and-drop regression once in Chromium');

  await page.goto('/image-converter/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');

  const initialFiles = Array.from({ length: 10 }, (_, index) => ({
    name: `initial-${String(index + 1).padStart(2, '0')}.png`,
    mimeType: 'image/png',
    buffer: PNG_2X2,
  }));
  await app.locator('[data-role="file-input"]').setInputFiles(initialFiles);
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('10 files');
  await expect(app.locator('.file-row')).toHaveCount(10);

  const pngBase64 = PNG_2X2.toString('base64');
  await app.locator('[data-role="workspace"]').evaluate((workspace, base64) => {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const transfer = new DataTransfer();
    for (let index = 1; index <= 5; index += 1) {
      transfer.items.add(new File([bytes], `added-${String(index).padStart(2, '0')}.png`, { type: 'image/png' }));
    }
    workspace.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    workspace.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, pngBase64);

  await expect(app.locator('[data-role="batch-summary"]')).toContainText('15 files');
  await expect(app.locator('.file-row')).toHaveCount(15);
  await expect(app.locator('[data-role="file-list"]')).toContainText('added-05.png');
});