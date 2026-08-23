import { expect, test } from '@playwright/test';

const PNG_4X3 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7l3MRAAAAFUlEQVR4nGP8z8DAwMDAxMDAwMAAAA8AAWgmWQ0AAAAASUVORK5CYII=', 'base64');

test.describe('Crop Image direct manipulation', () => {
  test('offers rectangle, square and circle presets with a draggable crop box', async ({ page }) => {
    await page.goto('/crop-image/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles({ name: 'crop.png', mimeType: 'image/png', buffer: PNG_4X3 });

    await expect(app.locator('[data-crop-preset="rectangle"]')).toBeVisible();
    await expect(app.locator('[data-crop-preset="square"]')).toBeVisible();
    await expect(app.locator('[data-crop-preset="circle"]')).toBeVisible();
    await expect(app.locator('[data-role="crop-selection"]')).toBeVisible();
    await expect(app.locator('[data-crop-handle]')).toHaveCount(4);
    await expect(app.locator('.crop-advanced summary')).toHaveText('Advanced coordinates');

    await app.locator('[data-crop-preset="square"]').click();
    await expect(app.locator('[data-setting="aspect"]')).toHaveValue('1:1');
    await expect(app.locator('[data-setting="shape"]')).toHaveValue('rect');

    await app.locator('[data-crop-preset="circle"]').click();
    await expect(app.locator('[data-setting="shape"]')).toHaveValue('circle');
    await expect(app.locator('[data-role="crop-selection"]')).toHaveClass(/is-circle/);
    await expect(app.locator('[data-role="output-format"]')).toHaveValue('png');
    await expect(app.locator('[data-role="output-format"]')).toBeDisabled();

    await app.locator('[data-crop-preset="rectangle"]').click();
    await expect(app.locator('[data-setting="shape"]')).toHaveValue('rect');
    await expect(app.locator('[data-setting="aspect"]')).toHaveValue('free');
    await expect(app.locator('[data-role="output-format"]')).toBeEnabled();
  });

  test('moving the crop box updates normalized coordinates', async ({ page }) => {
    await page.goto('/crop-image/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles({ name: 'crop.png', mimeType: 'image/png', buffer: PNG_4X3 });
    const selection = app.locator('[data-role="crop-selection"]');
    const beforeX = Number(await app.locator('[data-setting="x"]').inputValue());
    const box = await selection.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 12, box!.y + box!.height / 2 + 5);
    await page.mouse.up();
    const afterX = Number(await app.locator('[data-setting="x"]').inputValue());
    expect(afterX).toBeGreaterThan(beforeX);
  });
});
