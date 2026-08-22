import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { expect, test, type Page } from '@playwright/test';

async function uploadSyntheticBatch(page: Page, sizes: Array<[number, number]>, prefix = 'watermark'): Promise<void> {
  await page.locator('[data-image-tool-app]').evaluate(async (root, payload) => {
    const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
    const transfer = new DataTransfer();
    for (let index = 0; index < payload.sizes.length; index += 1) {
      const [width, height] = payload.sizes[index]!;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#263b58');
      gradient.addColorStop(1, '#75869b');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(255,255,255,.92)';
      context.font = `700 ${Math.max(10, Math.round(height * 0.065))}px sans-serif`;
      context.textAlign = 'right';
      context.fillText('SAMPLE 7', width * 0.96, height * 0.91);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('fixture encode failed')), 'image/png'));
      transfer.items.add(new File([blob], `${payload.prefix}-${index + 1}.png`, { type: 'image/png' }));
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sizes, prefix });
}

async function drawMask(page: Page, x1 = 0.72, y1 = 0.78, x2 = 0.97, y2 = 0.95): Promise<void> {
  const mask = page.locator('[data-image-tool-app] [data-role="mask-canvas"]');
  const box = await mask.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * x1, box!.y + box!.height * y1);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * x2, box!.y + box!.height * y2, { steps: 5 });
  await page.mouse.up();
}

async function dragRelative(page: Page, from: [number, number], to: [number, number]): Promise<void> {
  const mask = page.locator('[data-image-tool-app] [data-role="mask-canvas"]');
  const box = await mask.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * from[0], box!.y + box!.height * from[1]);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * to[0], box!.y + box!.height * to[1], { steps: 8 });
  await page.mouse.up();
}

async function moveSelectedMask(page: Page): Promise<void> {
  await dragRelative(page, [0.84, 0.86], [0.77, 0.78]);
}

async function maskAlphaBounds(page: Page): Promise<{ minX:number; minY:number; maxX:number; maxY:number; width:number; height:number; canvasWidth:number; canvasHeight:number }> {
  return page.locator('[data-image-tool-app] [data-role="mask-canvas"]').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext('2d')!;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if ((pixels[(y * canvas.width + x) * 4 + 3] ?? 0) < 16) continue;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    return { minX, minY, maxX, maxY, width: Math.max(0, maxX - minX + 1), height: Math.max(0, maxY - minY + 1), canvasWidth: canvas.width, canvasHeight: canvas.height };
  });
}

test('Remove Watermark exposes six manual masks and same-ratio batches start shared', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Remove Watermark product contract');
  await page.goto('/remove-watermark/');
  const root = page.locator('[data-image-tool-app]');
  await expect(root).toHaveAttribute('data-max-files', '50');
  await expect(root).toHaveAttribute('data-max-file-bytes', String(10 * 1024 * 1024));
  await expect(root.locator('[data-role="auto-select"]')).toHaveCount(0);
  await expect(root.locator('[data-tool-mode]')).toHaveCount(6);
  for (const name of ['Rectangle', 'Circle', 'Square', 'Diamond', '4-Point Star', 'Text']) await expect(root.getByRole('button', { name })).toBeVisible();
  await expect(root.getByRole('button', { name: 'Brush' })).toHaveCount(0);
  await expect(root.getByRole('button', { name: 'Eraser' })).toHaveCount(0);
  await uploadSyntheticBatch(page, [[360, 240], [720, 480]], 'shared');
  await expect(root).toHaveAttribute('data-edit-mode', 'shared');
  await expect(root).toHaveAttribute('data-edit-mode-preference', 'auto');
  await expect(root.locator('[data-role="batch-warning"]')).toHaveAttribute('data-tone', 'compatible');
});

test('mixed aspect ratios stay in Remove Watermark and start individual editing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Mixed-ratio Remove Watermark batch');
  await page.goto('/remove-watermark/');
  const root = page.locator('[data-image-tool-app]');
  await uploadSyntheticBatch(page, [[360, 240], [240, 360], [320, 320]], 'mixed');
  await expect(root.locator('.gemini-file-card')).toHaveCount(3);
  await expect(root).toHaveAttribute('data-edit-mode', 'individual');
  await expect(root.locator('[data-role="batch-warning"]')).toHaveAttribute('data-tone', 'info');
  await expect(root.locator('[data-role="batch-warning-copy"]')).toContainText('selected automatically');
});

test('manual shared mask can become per-image copies and whole queue cards select images', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Shared to individual and card selection');
  await page.goto('/remove-watermark/');
  const root = page.locator('[data-image-tool-app]');
  await uploadSyntheticBatch(page, [[360, 240], [720, 480]], 'custom');
  await drawMask(page);
  await root.getByRole('radio', { name: /Edit individually/ }).click();
  await expect(root.locator('.gemini-mask-badge--shared')).toHaveCount(2);
  await moveSelectedMask(page);
  await expect(root.locator('.gemini-file-card.is-sample')).toContainText('Custom');
  const secondCard = root.locator('.gemini-file-card').nth(1);
  await secondCard.locator('.gemini-file-copy').click();
  await expect(secondCard).toHaveClass(/is-sample/);
  await expect(secondCard).toContainText('Shared copy');
});

test('Rectangle repair produces a full-resolution downloadable result', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Primary Remove Watermark repair');
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/remove-watermark/'); const root = page.locator('[data-image-tool-app]');
  await uploadSyntheticBatch(page, [[360, 240]], 'single'); await drawMask(page);
  await expect(root.locator('[data-role="remove"]')).toBeEnabled(); await root.locator('[data-role="remove"]').click();
  await expect(root.locator('[data-role="result-label"]')).toContainText('pixels repaired', { timeout: 20_000 });
  await expect(root.locator('[data-role="result-empty"]')).toBeHidden();
  const downloadPromise = page.waitForEvent('download'); await root.locator('[data-role="download"]').click(); const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('single-1-watermark-removed.png'); const path = await download.path(); expect(path).not.toBeNull();
  expect((await readFile(path!)).byteLength).toBeGreaterThan(200); expect(errors).toEqual([]);
});

test('Square and Diamond create constrained masks with Undo', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Shape geometry regression');
  await page.goto('/remove-watermark/'); const root = page.locator('[data-image-tool-app]'); await uploadSyntheticBatch(page, [[360, 240]], 'shape');
  await root.getByRole('button', { name: 'Square' }).click(); await drawMask(page, 0.72, 0.66, 0.88, 0.94); await expect(root.locator('[data-role="undo"]')).toBeEnabled(); await root.locator('[data-role="undo"]').click(); await expect(root.locator('[data-role="remove"]')).toBeDisabled();
  await root.getByRole('button', { name: 'Diamond' }).click(); await drawMask(page, 0.76, 0.66, 0.92, 0.92); await expect(root.locator('[data-role="remove"]')).toBeEnabled();
});

test('single-character Text mask auto-fits, reaches the bottom-right corner, and repairs solid glyph pixels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Compact solid text-mask regression');
  await page.goto('/remove-watermark/'); const root = page.locator('[data-image-tool-app]'); await uploadSyntheticBatch(page, [[480, 320]], 'text-seven');
  await root.getByRole('button', { name: 'Text' }).click(); const input = root.locator('[data-role="text-mask-input"]'); await input.fill('7');
  const initial = await maskAlphaBounds(page);
  expect(initial.width).toBeLessThan(initial.canvasWidth * 0.35);
  await dragRelative(page, [0.50, 0.50], [0.92, 0.90]);
  const moved = await maskAlphaBounds(page);
  expect(moved.maxX).toBeGreaterThan(moved.canvasWidth * 0.93);
  expect(moved.maxY).toBeGreaterThan(moved.canvasHeight * 0.88);
  await root.locator('[data-role="remove"]').click();
  await expect(root.locator('[data-role="batch-result-summary"]')).toContainText('1 repaired', { timeout: 20_000 });
  await expect(root.locator('[data-role="result-empty"]')).toBeHidden();
});

test('Text mask round handle rotates the visible footprint and worker repair accepts the rotation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Text mask rotation regression');
  await page.goto('/remove-watermark/'); const root = page.locator('[data-image-tool-app]'); await uploadSyntheticBatch(page, [[480, 320]], 'text-rotate');
  await root.getByRole('button', { name: 'Text' }).click(); await root.locator('[data-role="text-mask-input"]').fill('WATERMARK');
  const before = await maskAlphaBounds(page);
  const canvas = root.locator('[data-role="mask-canvas"]'); const box = await canvas.boundingBox(); expect(box).not.toBeNull();
  const textHeight = Math.max(48, Math.min(150, box!.height * 0.16));
  const startX = box!.x + box!.width * 0.5, startY = box!.y + box!.height * 0.5 - textHeight / 2 - 28;
  await page.mouse.move(startX, startY); await page.mouse.down(); await page.mouse.move(box!.x + box!.width * 0.66, box!.y + box!.height * 0.50, { steps: 10 }); await page.mouse.up();
  const after = await maskAlphaBounds(page);
  expect(after.height).toBeGreaterThan(before.height * 1.25);
  expect(after.width).toBeLessThan(before.width * 0.9);
  await root.locator('[data-role="remove"]').click();
  await expect(root.locator('[data-role="batch-result-summary"]')).toContainText('1 repaired', { timeout: 20_000 });
});

test('mixed individual batch can repair two prepared images and download ZIP', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Remove Watermark batch ZIP');
  await page.goto('/remove-watermark/'); const root = page.locator('[data-image-tool-app]'); await uploadSyntheticBatch(page, [[360, 240], [240, 360]], 'batch');
  await expect(root).toHaveAttribute('data-edit-mode', 'individual'); await drawMask(page); await root.locator('.gemini-file-card').nth(1).click(); await drawMask(page, 0.70, 0.79, 0.97, 0.94);
  await expect(root.locator('[data-role="prepared-summary"]')).toContainText('2/2 images have a mask'); await root.locator('[data-role="remove"]').click(); await expect(root.locator('[data-role="batch-result-summary"]')).toContainText('2 repaired', { timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download'); await root.locator('[data-role="download"]').click(); const download = await downloadPromise; expect(download.suggestedFilename()).toBe('watermark-removed-mixed-2-images.zip');
  const path = await download.path(); expect(path).not.toBeNull(); const zip = await JSZip.loadAsync(await readFile(path!)); expect(Object.keys(zip.files).sort()).toEqual(['batch-1-watermark-removed.png','batch-2-watermark-removed.png']);
});

test('Remove Watermark page, Image Tools hub, and guides expose release content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Image Tools content regression');
  await page.goto('/remove-watermark/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Remove watermarks from images.');
  await expect(page.getByRole('heading', { name: 'Move, resize, rotate' })).toBeVisible();
  await expect(page.getByText(/solid bold text-shaped mask/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Remove Watermark FAQ' })).toBeVisible();
  await page.goto('/image-tools/'); await expect(page.getByText('Rectangle, Circle, Square, Diamond, 4-Point Star, and Text masks')).toBeVisible();
  await page.goto('/guides/how-to-remove-text-watermark-from-image/'); await expect(page.getByText(/not OCR or automatic text detection/i)).toBeVisible(); await expect(page.getByRole('heading', { name: /Move, resize, and rotate/ })).toBeVisible();
});

test('Remove Watermark stays usable on mobile without horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile Remove Watermark regression');
  await page.goto('/remove-watermark/'); await uploadSyntheticBatch(page, [[180, 320], [320, 180]], 'mobile'); const root = page.locator('[data-image-tool-app]');
  await expect(root.locator('[data-role="editor"]')).toBeVisible(); await expect(root).toHaveAttribute('data-edit-mode', 'individual');
  const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, touchAction: getComputedStyle(document.querySelector<HTMLElement>('[data-role="mask-canvas"]')!).touchAction, queueOverflow: getComputedStyle(document.querySelector<HTMLElement>('.gemini-file-queue')!).overflowX }));
  expect(layout.touchAction).toBe('none'); expect(layout.queueOverflow).toBe('auto'); expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
});
