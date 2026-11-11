import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const toolIds = ['hue-rotate-image', 'posterize-image', 'threshold-image', 'adjust-image-opacity'] as const;
type ToolId = (typeof toolIds)[number];

async function createSourcePng(page: Page, toolId: ToolId): Promise<Buffer> {
  const bytes = await page.evaluate(async (id) => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 12;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    if (id === 'posterize-image' || id === 'threshold-image') {
      context.fillStyle = 'rgb(100,100,100)';
      context.fillRect(0, 0, 8, canvas.height);
      context.fillStyle = 'rgb(220,220,220)';
      context.fillRect(8, 0, 8, canvas.height);
    } else {
      context.fillStyle = '#ff0000';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png');
    });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, toolId);
  return Buffer.from(bytes);
}

async function inspectOutput(page: Page, buffer: Buffer): Promise<{
  width: number; height: number; left: number[]; right: number[];
}> {
  return page.evaluate(async (bytes) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(bytes)], { type: 'image/png' }));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas 2D unavailable for inspection');
      context.drawImage(image, 0, 0);
      return {
        width: image.width,
        height: image.height,
        left: Array.from(context.getImageData(2, 2, 1, 1).data),
        right: Array.from(context.getImageData(12, 2, 1, 1).data),
      };
    } finally { image.close(); }
  }, Array.from(buffer));
}

for (const toolId of toolIds) {
  test(`${toolId} processes real pixels and exports a valid PNG`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Pixel fidelity test runs once in Chromium desktop');
    await page.goto(`/${toolId}/`);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true', { timeout: 60_000 });

    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'color-sample.png',
      mimeType: 'image/png',
      buffer: await createSourcePng(page, toolId),
    });

    const key = toolId === 'hue-rotate-image' ? 'degrees'
      : toolId === 'posterize-image' ? 'levels'
        : toolId === 'threshold-image' ? 'cutoff' : 'opacityPercent';
    const slider = app.locator(`[data-setting="${key}"]`);
    await expect(slider).toBeVisible();
    const value = toolId === 'hue-rotate-image' ? '180'
      : toolId === 'posterize-image' ? '2'
        : toolId === 'threshold-image' ? '160' : '35';
    await slider.evaluate((element: HTMLInputElement, next) => {
      element.value = next;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    const text = toolId === 'hue-rotate-image' ? '180°'
      : toolId === 'posterize-image' ? '2 levels'
        : toolId === 'threshold-image' ? '160' : '35%';
    await expect(app.locator(`[data-output-for="${key}"]`)).toHaveText(text);

    if (toolId === 'adjust-image-opacity') {
      await expect(app.locator('[data-role="output-format"]')).toHaveValue('png');
      await expect(app.locator('[data-role="output-format"]')).toBeDisabled();
    }

    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="batch-list"]')).toContainText('Done', { timeout: 30_000 });
    const pending = page.waitForEvent('download');
    await app.locator('[data-role="download-batch"]').click();
    const download = await pending;
    expect(download.suggestedFilename()).toMatch(/color-sample-(hue-rotated|posterized|threshold|opacity-adjusted)\.png$/);
    const saved = await download.path();
    expect(saved).not.toBeNull();
    const buffer = await readFile(saved!);
    expect(Array.from(buffer.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

    const { width, height, left, right } = await inspectOutput(page, buffer);
    expect([width, height]).toEqual([16, 12]);
    if (toolId === 'hue-rotate-image') {
      // 180-degree browser hue rotation changes the red sample toward cyan.
      expect(left[0]).toBeLessThan(60);
      expect(left[1]).toBeGreaterThan(50);
      expect(left[2]).toBeGreaterThan(50);
      expect(left[3]).toBe(255);
    } else if (toolId === 'posterize-image') {
      expect(left.slice(0, 4)).toEqual([0, 0, 0, 255]);
      expect(right.slice(0, 4)).toEqual([255, 255, 255, 255]);
    } else if (toolId === 'threshold-image') {
      expect(left.slice(0, 4)).toEqual([0, 0, 0, 255]);
      expect(right.slice(0, 4)).toEqual([255, 255, 255, 255]);
    } else {
      expect(left[0]).toBeGreaterThan(245);
      expect(left[1]).toBeLessThan(10);
      expect(left[2]).toBeLessThan(10);
      expect(left[3]).toBeGreaterThanOrEqual(87);
      expect(left[3]).toBeLessThanOrEqual(91);
    }
  });
}

test('new color lab tools have crawlable pages and real interactive controls', async ({ request }) => {
  for (const id of toolIds) {
    const response = await request.get(`/${id}/`);
    expect(response.ok(), `${id} should be a real Astro page`).toBeTruthy();
    const html = await response.text();
    const key = id === 'hue-rotate-image' ? 'degrees'
      : id === 'posterize-image' ? 'levels'
        : id === 'threshold-image' ? 'cutoff' : 'opacityPercent';
    expect(html).toContain(`data-tool-id="${id}"`);
    expect(html).toContain(`data-setting="${key}"`);
    expect(html).toContain('How to use it');
    expect(html).toContain('<title>');
  }
});
