import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

type ToolId = 'sharpen-image' | 'add-image-border' | 'rounded-corners-image';
const toolIds: ToolId[] = ['sharpen-image', 'add-image-border', 'rounded-corners-image'];

async function imageFixture(page: Page, toolId: ToolId): Promise<Buffer> {
  const raw = await page.evaluate(async (id) => {
    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    if (id === 'sharpen-image') {
      ctx.fillStyle = 'rgb(100,100,100)';
      ctx.fillRect(0, 0, 10, 16);
      ctx.fillStyle = 'rgb(130,130,130)';
      ctx.fillRect(10, 0, 10, 16);
    } else {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, 20, 16);
    }
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Cannot encode fixture PNG')), 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, toolId);
  return Buffer.from(raw);
}

async function inspectPng(page: Page, bytes: Buffer): Promise<{ width: number; height: number; samples: Record<string, number[]> }> {
  return page.evaluate(async (data) => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(data)], { type: 'image/png' }));
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(image, 0, 0);
      const sample = (x: number, y: number): number[] => Array.from(ctx.getImageData(x, y, 1, 1).data);
      return {
        width: image.width, height: image.height,
        samples: {
          corner: sample(0, 0),
          center: sample(Math.floor(image.width / 2), Math.floor(image.height / 2)),
          sourceInsideBorder: sample(7, 7),
          leftEdge: sample(9, 8),
          rightEdge: sample(10, 8),
        },
      };
    } finally { image.close(); }
  }, Array.from(bytes));
}

for (const toolId of toolIds) {
  test(`${toolId} creates correctly transformed PNG output, not just a preview`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Pixel output fidelity is tested in desktop Chromium');
    await page.goto(`/${toolId}/`);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true', { timeout: 60_000 });
    const bytes = await imageFixture(page, toolId);
    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'fixture.png', mimeType: 'image/png', buffer: bytes,
    });
    if (toolId === 'sharpen-image') {
      await app.locator('[data-setting="amount"]').evaluate((element: HTMLInputElement) => {
        element.value = '1.2';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await expect(app.locator('[data-output-for="amount"]')).toHaveText('1.2×');
    }
    if (toolId === 'add-image-border') {
      await app.locator('[data-setting="thickness"]').evaluate((element: HTMLInputElement) => {
        element.value = '6';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await app.locator('[data-setting="color"]').evaluate((element: HTMLInputElement) => {
        element.value = '#0000ff';
        element.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await expect(app.locator('[data-output-for="thickness"]')).toHaveText('6 px');
    }
    if (toolId === 'rounded-corners-image') {
      await app.locator('[data-setting="radiusPercent"]').evaluate((element: HTMLInputElement) => {
        element.value = '50';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await expect(app.locator('[data-output-for="radiusPercent"]')).toHaveText('50%');
      await expect(app.locator('[data-role="output-format"]')).toBeDisabled();
      await expect(app.locator('[data-role="output-format"]')).toHaveValue('png');
    }

    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="batch-list"]')).toContainText('Done', { timeout: 30_000 });
    const startDownload = page.waitForEvent('download');
    await app.locator('[data-role="download-batch"]').click();
    const download = await startDownload;
    expect(download.suggestedFilename()).toMatch(/fixture-(sharpened|bordered|rounded)\.png$/);
    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const result = await readFile(filePath!);
    expect(Array.from(result.subarray(0, 8))).toEqual([137,80,78,71,13,10,26,10]);
    const decoded = await inspectPng(page, result);
    const rgba = (name: string) => decoded.samples[name] ?? [];
    if (toolId === 'add-image-border') {
      expect([decoded.width, decoded.height]).toEqual([32, 28]);
      expect(rgba('corner')).toEqual([0, 0, 255, 255]);
      expect(rgba('sourceInsideBorder')).toEqual([255, 0, 0, 255]);
    } else if (toolId === 'rounded-corners-image') {
      expect([decoded.width, decoded.height]).toEqual([20, 16]);
      expect(rgba('corner')[3]).toBe(0);
      expect(rgba('center')).toEqual([255, 0, 0, 255]);
    } else {
      expect([decoded.width, decoded.height]).toEqual([20, 16]);
      expect(rgba('leftEdge')[0]).toBeLessThan(100);
      expect(rgba('rightEdge')[0]).toBeGreaterThan(130);
      expect(rgba('center')[3]).toBe(255);
    }
  });
}

test('border processing rejects output dimensions over the configured limit', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Boundary test is sufficient on one browser');
  await page.goto('/add-image-border/');
  const app = page.locator('[data-image-tool-app]');
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true', { timeout: 60_000 });
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 11990;
    canvas.height = 1;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Cannot create PNG')), 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await app.locator('[data-role="file-input"]').setInputFiles({
    name: 'near-limit.png', mimeType: 'image/png', buffer: Buffer.from(bytes),
  });
  await app.locator('[data-setting="thickness"]').evaluate((element: HTMLInputElement) => {
    element.value = '80';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await app.locator('[data-role="process-batch"]').click();
  await expect(app.locator('[data-role="batch-list"]')).toContainText('exceeds', { timeout: 30_000 });
  await expect(app.locator('[data-role="notice"]')).toContainText('failed');
});

test('sharpen border and rounded-corner pages have real static routes and input controls', async ({ request }) => {
  for (const id of toolIds) {
    const response = await request.get(`/${id}/`);
    expect(response.ok(), `Missing route ${id}`).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(`data-tool-id="${id}"`);
    expect(html).toContain('How to use it');
    expect(html).toContain(id === 'sharpen-image' ? 'data-setting="amount"' : id === 'add-image-border' ? 'data-setting="thickness"' : 'data-setting="radiusPercent"');
  }
});
