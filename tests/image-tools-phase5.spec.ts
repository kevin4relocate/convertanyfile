import { expect, test } from '@playwright/test';

test.describe('Image tools release surface', () => {
  test('Image Tools hub keeps experimental heavy tools out of the public release surface', async ({ page }) => {
    await page.goto('/image-tools/');
    await expect(page.locator('a[href="/remove-background/"]')).toHaveCount(0);
    await expect(page.locator('a[href="/remove-object/"]')).toHaveCount(0);
    await expect(page.getByText('Local AI background removal')).toHaveCount(0);
  });

  test('advanced watermark controls remain available while Gemini stays simplified', async ({ page }) => {
    await page.goto('/remove-watermark/');
    const watermark = page.locator('[data-image-tool-app]');
    await expect(watermark).toHaveAttribute('data-advanced-canvas', 'true');
    await expect(watermark.locator('[data-role="zoom-value"]')).toHaveText('100%');
    await expect(watermark.locator('[data-role="mask-padding"]')).toBeAttached();
    await expect(watermark.locator('[data-role="mask-feather"]')).toBeAttached();
    await expect(watermark.locator('[data-role="undo"]')).toBeAttached();
    await expect(watermark.locator('[data-role="redo"]')).toBeAttached();
    await expect(watermark.locator('[data-role="redo"]')).toBeDisabled();

    await page.goto('/gemini-ai-logo-remover/');
    const gemini = page.locator('[data-image-tool-app]');
    await expect(gemini).toHaveAttribute('data-advanced-canvas', 'false');
    await expect(gemini.locator('[data-role="mask-padding"]')).toHaveCount(0);
    await expect(gemini.locator('[data-role="mask-feather"]')).toHaveCount(0);
    await expect(gemini.locator('[data-role="redo"]')).toHaveCount(0);
  });
});
