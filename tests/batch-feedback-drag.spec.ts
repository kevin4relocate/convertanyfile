import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

test('batch-limit feedback stays concise and the workspace drop overlay always clears', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop drag regression only needs one browser');
  await page.goto('/');

  const app = page.locator('[data-home-panel="image"] [data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');

  const initialFiles = Array.from({ length: 50 }, (_, index) => ({
    name: `image-${String(index + 1).padStart(2, '0')}.png`,
    mimeType: 'image/png',
    buffer: PNG_2X2,
  }));
  await app.locator('[data-role="file-input"]').setInputFiles(initialFiles);
  await expect(app.locator('[data-role="batch-summary"]')).toContainText('50 files', { timeout: 30_000 });

  const workspace = app.locator('[data-role="workspace"]');
  const transfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const dataTransfer = new DataTransfer();
    for (let index = 0; index < 3; index += 1) {
      dataTransfer.items.add(new File([bytes], `overflow-${index + 1}.png`, { type: 'image/png' }));
    }
    return dataTransfer;
  }, PNG_2X2.toString('base64'));

  await workspace.dispatchEvent('dragenter', { dataTransfer: transfer });
  await expect(workspace).toHaveClass(/is-dragging/);
  await workspace.dispatchEvent('drop', { dataTransfer: transfer });

  await expect(workspace).not.toHaveClass(/is-dragging/);
  const notice = app.locator('[data-role="notice"]');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveText('3 files skipped — 50-file limit reached.');
  await expect(notice).not.toContainText('overflow-');

  const noticeBox = await notice.boundingBox();
  const appBox = await app.boundingBox();
  expect(noticeBox).not.toBeNull();
  expect(appBox).not.toBeNull();
  expect(noticeBox!.width).toBeLessThanOrEqual(appBox!.width);
});

test('successful conversion uses a short success message', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Feedback copy regression only needs one browser');
  await page.goto('/csv-to-json/');
  const app = page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized', 'true');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,name\n1,Alice\n2,Bob'),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary"]')).toContainText('1/1 converted');
  await expect(app.locator('[data-role="success-notice"]')).toHaveText('1 file converted successfully.');
  await expect(app.locator('[data-role="success-notice"]')).toBeVisible();
});
