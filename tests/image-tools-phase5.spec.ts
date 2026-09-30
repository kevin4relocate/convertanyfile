import { expect, test, type Locator, type Page } from '@playwright/test';

async function readyImageTool(page: Page): Promise<Locator> {
  const app = page.locator('[data-image-tool-app]');
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  return app;
}

test.describe('Image tools release surface', () => {
  test('Image Tools hub keeps experimental heavy tools out of the public release surface', async ({ page }) => {
    await page.goto('/image-tools/');
    await expect(page.locator('a[href="/remove-background/"]')).toHaveCount(0);
    await expect(page.locator('a[href="/remove-object/"]')).toHaveCount(0);
    await expect(page.getByText('Local AI background removal')).toHaveCount(0);
  });

  test('advanced watermark controls remain available while Gemini stays simplified', async ({ page }) => {
    await page.goto('/remove-watermark/');
    const watermark = await readyImageTool(page);
    await expect(watermark).toHaveAttribute('data-advanced-canvas', 'true');
    await expect(watermark.locator('[data-role="zoom-value"]')).toHaveText('100%');
    await expect(watermark.locator('[data-role="mask-padding"]')).toBeAttached();
    await expect(watermark.locator('[data-role="mask-feather"]')).toBeAttached();
    await expect(watermark.locator('[data-role="undo"]')).toBeAttached();
    await expect(watermark.locator('[data-role="redo"]')).toBeAttached();
    await expect(watermark.locator('[data-role="redo"]')).toBeDisabled();

    await page.goto('/gemini-ai-logo-remover/');
    const gemini = await readyImageTool(page);
    await expect(gemini).toHaveAttribute('data-advanced-canvas', 'false');
    await expect(gemini.locator('[data-role="mask-padding"]')).toHaveCount(0);
    await expect(gemini.locator('[data-role="mask-feather"]')).toHaveCount(0);
    await expect(gemini.locator('[data-role="redo"]')).toHaveCount(0);
  });
});
