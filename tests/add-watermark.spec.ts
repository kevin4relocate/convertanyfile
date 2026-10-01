import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';

const IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAKAAAABkCAIAAACO1KzYAAABJklEQVR4nO3dQQ3CUBBAQSCIQQQiKqdykIAIDkionDro4ZfS5GXmvskmL3ve6/z6Xui6nb0AxxI4TuA4geMEjhM4TuA4geMEjhM4TuA4geMEjhM4TuA4geMEjhM4TuC4+57h6fn41R5se3+WsUEXHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAsftek45/DGRv3HBcQLHCRwncJzAcQLHCRwncJzAcQLHCRwncJzAcQLHCRwncJzAcQLHrXk+B/hWskPBAAAAAElFTkSuQmCC',
  'base64',
);

test('Add Watermark adds draggable text and downloads a real image', async ({ page }) => {
  await page.goto('/add-watermark/');
  await expect(page.getByRole('heading', { level: 1, name: 'Add a watermark to images.' })).toBeVisible();

  const root = page.locator('[data-image-tool-app][data-tool-id="add-watermark"]');
  await root.locator('[data-role="file-input"]').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: IMAGE });
  await expect(root).toHaveAttribute('data-has-items', 'true');
  const canvas = root.locator('[data-role="watermark-canvas"]');
  await expect(canvas).toBeVisible();

  await root.locator('[data-setting="watermarkText"]').fill('ConvertAnyFile');
  await root.locator('[data-setting="watermarkOpacity"]').fill('72');

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.84, box!.y + box!.height * 0.88);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5, { steps: 5 });
  await page.mouse.up();

  const process = root.locator('[data-role="process-batch"]');
  await expect(process).toBeEnabled();
  await process.click();
  await expect(root.locator('[data-role="ready-count"]')).toContainText('1/1 watermarked', { timeout: 30_000 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    root.locator('[data-role="download-batch"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe('sample-watermarked.png');
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(Array.from(bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
});

test('Add Watermark applies an uploaded logo to a batch and downloads ZIP', async ({ page }) => {
  await page.goto('/add-watermark/');
  const root = page.locator('[data-image-tool-app][data-tool-id="add-watermark"]');

  await root.locator('[data-role="file-input"]').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: IMAGE },
    { name: 'two.png', mimeType: 'image/png', buffer: IMAGE },
  ]);
  await expect(root.locator('[data-role="batch-count"]')).toHaveText('2');

  await root.locator('[data-role="logo-input"]').setInputFiles({ name: 'brand.png', mimeType: 'image/png', buffer: IMAGE });
  await expect(root.locator('[data-role="logo-name"]')).toHaveText('brand.png');
  await expect(root.locator('[data-watermark-mode="logo"]')).toHaveAttribute('aria-checked', 'true');

  await root.locator('[data-setting="watermarkLogoSize"]').fill('28');
  await root.locator('[data-setting="watermarkOpacity"]').fill('60');
  await root.locator('[data-role="process-batch"]').click();
  await expect(root.locator('[data-role="ready-count"]')).toContainText('2/2 watermarked', { timeout: 30_000 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    root.locator('[data-role="download-batch"]').click(),
  ]);
  expect(download.suggestedFilename()).toBe('watermarked-images-2.zip');
  const path = await download.path();
  expect(path).not.toBeNull();
  const zip = await JSZip.loadAsync(await readFile(path!));
  expect(Object.keys(zip.files).sort()).toEqual(['one-watermarked.png', 'two-watermarked.png']);
});
