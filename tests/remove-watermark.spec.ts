import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function uploadSyntheticWatermark(page: Page): Promise<void> {
  await page.locator('[data-image-tool-app]').evaluate(async (root) => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 240;
    const context = canvas.getContext('2d')!;
    const gradient = context.createLinearGradient(0, 0, 360, 240);
    gradient.addColorStop(0, '#334b70');
    gradient.addColorStop(1, '#7c94a8');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 360, 240);
    context.fillStyle = 'rgba(255,255,255,.96)';
    context.fillRect(310, 202, 26, 22);
    context.fillStyle = 'rgba(90,50,220,.95)';
    context.fillRect(316, 207, 14, 12);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('fixture encode failed')), 'image/png'));
    const file = new File([blob], 'gemini-style-corner.png', { type: 'image/png' });
    const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test('Remove Watermark Preview auto-selects, repairs locally, previews, and downloads', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Primary image-tool functional regression');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/remove-watermark/');
  const root = page.locator('[data-image-tool-app]');
  await uploadSyntheticWatermark(page);

  await expect(root.locator('[data-role="editor"]')).toBeVisible();
  await expect(root.locator('[data-role="source-meta"]')).toContainText('360 × 240');
  await expect(root.locator('[data-role="selection-status"]')).not.toContainText('will suggest');
  await expect(root.locator('[data-role="remove"]')).toBeEnabled();

  await root.locator('[data-role="remove"]').click();
  await expect(root.locator('[data-role="result-label"]')).toContainText('pixels repaired', { timeout: 20_000 });
  await expect(root.locator('[data-role="download"]')).toBeEnabled();
  await expect(root.locator('[data-role="result-empty"]')).toBeHidden();

  const downloadPromise = page.waitForEvent('download');
  await root.locator('[data-role="download"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('gemini-style-corner-watermark-removed.png');
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.byteLength).toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test('manual Rectangle selection and Undo work after clearing Auto Select', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Manual mask regression');
  await page.goto('/remove-watermark/');
  const root = page.locator('[data-image-tool-app]');
  await uploadSyntheticWatermark(page);
  await expect(root.locator('[data-role="remove"]')).toBeEnabled();

  await root.locator('[data-role="reset-mask"]').click();
  await expect(root.locator('[data-role="remove"]')).toBeDisabled();
  const mask = root.locator('[data-role="mask-canvas"]');
  const box = await mask.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.78, box!.y + box!.height * 0.78);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.96, box!.y + box!.height * 0.96, { steps: 4 });
  await page.mouse.up();
  await expect(root.locator('[data-role="remove"]')).toBeEnabled();
  await expect(root.locator('[data-role="undo"]')).toBeEnabled();

  await root.locator('[data-role="undo"]').click();
  await expect(root.locator('[data-role="remove"]')).toBeDisabled();
});

test('Image Tools and Remove Watermark pages have substantive SEO and privacy content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Image Tools content regression');
  await page.goto('/remove-watermark/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Remove a watermark from an image.');
  await expect(page.getByText('No AI API and no upload queue')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Four steps from source image to repaired copy.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Remove Watermark FAQ' })).toBeVisible();
  await expect(page.getByText('Gemini-style corner logos')).toBeVisible();

  await page.goto('/image-tools/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Useful image edits');
  await expect(page.getByRole('link', { name: /Remove Watermark/i })).toHaveAttribute('href', '/remove-watermark/');
  await expect(page.getByText('Resize Image')).toBeVisible();
});

test('Remove Watermark editor stacks on mobile without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile image-tool regression');
  await page.goto('/remove-watermark/');
  await uploadSyntheticWatermark(page);
  const root = page.locator('[data-image-tool-app]');
  await expect(root.locator('[data-role="editor"]')).toBeVisible();
  await expect(root.locator('[data-role="remove"]')).toBeEnabled();

  const layout = await page.evaluate(() => {
    const grid = document.querySelector<HTMLElement>('.image-tool-preview-grid')!;
    const mask = document.querySelector<HTMLElement>('[data-role="mask-canvas"]')!;
    return {
      columns: getComputedStyle(grid).gridTemplateColumns,
      touchAction: getComputedStyle(mask).touchAction,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  expect(layout.columns.split(' ').length).toBe(1);
  expect(layout.touchAction).toBe('none');
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
});
