import { expect, test, type Page } from '@playwright/test';

type EffectId = 'grayscale-image' | 'sepia-image' | 'invert-image';

const effects: EffectId[] = ['grayscale-image', 'sepia-image', 'invert-image'];

async function solidRedPng(page: Page): Promise<Buffer> {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Unable to encode fixture')), 'image/png');
    });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  return Buffer.from(bytes);
}

async function previewPixel(page: Page): Promise<number[]> {
  const preview = page.locator('[data-image-tool-app] [data-role="result-preview"]');
  await expect(preview).toBeVisible();
  return preview.evaluate(async (node) => {
    const image = node as HTMLImageElement;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot inspect preview');
    context.drawImage(image, 0, 0);
    return Array.from(context.getImageData(0, 0, 1, 1).data);
  });
}

for (const toolId of effects) {
  test(`${toolId} processes real pixels with adjustable strength and downloads a result`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Pixel output regression is covered in Chromium desktop.');
    await page.goto(`/${toolId}/`);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true', { timeout: 60_000 });
    expect(await page.title()).toMatch(/ConvertAnyFile/);

    const bytes = await solidRedPng(page);
    await app.locator('[data-role="file-input"]').setInputFiles({
      name: 'sample-red.png', mimeType: 'image/png', buffer: bytes,
    });
    const strength = app.locator('[data-setting="intensity"]');
    await expect(strength).toHaveValue('100');

    await expect.poll(async () => {
      const [red = 0, green = 0, blue = 0] = await previewPixel(page);
      if (toolId === 'grayscale-image') return Math.abs(red - green) <= 3 && Math.abs(green - blue) <= 3;
      if (toolId === 'sepia-image') return red > green && green > blue && blue > 15;
      return red < 12 && green > 245 && blue > 245;
    }, { timeout: 20_000 }).toBeTruthy();

    await strength.evaluate((input: HTMLInputElement) => { input.value = '0'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await expect(app.locator('[data-output-for="intensity"]')).toHaveText('0%');
    await expect.poll(async () => {
      const [red = 0, green = 0, blue = 0] = await previewPixel(page);
      return red > 245 && green < 12 && blue < 12;
    }, { timeout: 20_000 }).toBeTruthy();

    await strength.evaluate((input: HTMLInputElement) => { input.value = '100'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="batch-list"]')).toContainText('Done', { timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download');
    await app.locator('[data-role="download-batch"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/sample-red-(grayscale|sepia|inverted)\.png$/);
  });
}

test('color effect pages expose correct routes and source-readable instructions', async ({ request }) => {
  for (const toolId of effects) {
    const response = await request.get(`/${toolId}/`);
    expect(response.ok(), `${toolId} should be a real built route`).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(`data-tool-id="${toolId}"`);
    expect(html).toContain('data-setting="intensity"');
    expect(html).toContain('How to use it');
  }
});
