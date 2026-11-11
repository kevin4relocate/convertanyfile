import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type ToolId = 'brightness-image' | 'contrast-image' | 'adjust-image-saturation' | 'pixelate-image';
const tools: ToolId[] = ['brightness-image', 'contrast-image', 'adjust-image-saturation', 'pixelate-image'];

async function makeFixture(page: Page, gradient: boolean): Promise<Buffer> {
  const result = await page.evaluate(async (makeGradient) => {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    if (makeGradient) {
      const pixels = context.createImageData(24, 24);
      for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
        const offset = (y * 24 + x) * 4;
        pixels.data[offset] = x * 10;
        pixels.data[offset + 1] = y * 10;
        pixels.data[offset + 2] = 40;
        pixels.data[offset + 3] = 255;
      }
      context.putImageData(pixels, 0, 0);
    } else {
      context.fillStyle = '#804020';
      context.fillRect(0, 0, 24, 24);
    }
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('Fixture PNG encoding failed')), 'image/png'
    ));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, gradient);
  return Buffer.from(result);
}

async function readPixelSamples(page: Page, bytes: Buffer): Promise<{ width: number; height: number; a: number[]; b: number[] }> {
  return page.evaluate(async data => {
    const png = new Blob([Uint8Array.from(data)], { type: 'image/png' });
    const bitmap = await createImageBitmap(png);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('2D unavailable');
      context.drawImage(bitmap, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        a: Array.from(context.getImageData(0, 0, 1, 1).data),
        b: Array.from(context.getImageData(8, 8, 1, 1).data),
      };
    } finally { bitmap.close(); }
  }, Array.from(bytes));
}

for (const toolId of tools) {
  test(`${toolId} transforms exported PNG pixels and keeps the source dimensions`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Pixel fidelity is tested in Chromium desktop');
    await page.goto(`/${toolId}/`);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true', { timeout: 60_000 });

    const fixture = await makeFixture(page, toolId === 'pixelate-image');
    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'source.png', mimeType: 'image/png', buffer: fixture,
    });
    const slider = app.locator(toolId === 'pixelate-image' ? '[data-setting="blockSize"]' : '[data-setting="level"]');
    await expect(slider).toBeVisible();

    const amount = toolId === 'pixelate-image' ? '24' : '200';
    await slider.evaluate((element: HTMLInputElement, value) => {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, amount);
    await expect(app.locator(toolId === 'pixelate-image' ? '[data-output-for="blockSize"]' : '[data-output-for="level"]'))
      .toHaveText(toolId === 'pixelate-image' ? '24 px' : '200%');

    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="batch-list"]')).toContainText('Done', { timeout: 30_000 });

    const downloadEvent = page.waitForEvent('download');
    await app.locator('[data-role="download-batch"]').click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toContain('source-');
    expect(download.suggestedFilename().endsWith('.png')).toBeTruthy();
    const filepath = await download.path();
    expect(filepath).not.toBeNull();
    const bytes = await readFile(filepath!);
    const { width, height, a, b } = await readPixelSamples(page, bytes);
    expect([width, height]).toEqual([24, 24]);
    const [red = 0, green = 0, blue = 0, alpha = 0] = a;
    expect(alpha).toBe(255);

    if (toolId === 'brightness-image') {
      expect(red).toBeGreaterThanOrEqual(250);
      expect(green).toBeGreaterThan(120);
      expect(blue).toBeGreaterThan(58);
    } else if (toolId === 'contrast-image') {
      expect(red).toBeGreaterThan(115);
      expect(red).toBeLessThan(145);
      expect(green).toBeLessThan(8);
      expect(blue).toBeLessThan(8);
    } else if (toolId === 'adjust-image-saturation') {
      expect(red).toBeGreaterThan(140);
      expect(blue).toBeLessThan(30);
    } else {
      expect(a).toEqual(b);
      expect(red).toBeGreaterThan(5);
      expect(red).toBeLessThan(230);
    }
  });
}

test('all four image adjustment pages are actual static editor routes', async ({ request }) => {
  for (const toolId of tools) {
    const response = await request.get(`/${toolId}/`);
    expect(response.ok(), `missing ${toolId}`).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(`data-tool-id="${toolId}"`);
    expect(html).toContain('How to use it');
    expect(html).toContain(toolId === 'pixelate-image' ? 'data-setting="blockSize"' : 'data-setting="level"');
  }
});
