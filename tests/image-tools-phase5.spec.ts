import { expect, test } from '@playwright/test';

test.describe('Final image tools expansion', () => {
  test('remove background mounts its isolated segmentation runtime without eager inference', async ({ page }) => {
    const runtimeRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/runtime/background-removal/')) runtimeRequests.push(request.url());
    });

    await page.goto('/remove-background/');
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-tool-id', 'remove-background');
    await expect(app).toHaveAttribute('data-platform-runtime', 'background-v1');
    await expect(app).toHaveAttribute('data-platform-scope', 'shared');
    await expect(app.locator('[data-role="model-status"]')).toContainText('Local AI runtime loads on first use');
    await expect(app.locator('[data-setting="threshold"]')).toHaveValue('50');
    await expect(app.locator('[data-setting="feather"]')).toHaveValue('8');
    await expect(app.locator('[data-setting="background"]')).toHaveValue('transparent');
    await expect(app.locator('[data-role="process-batch"]')).toBeDisabled();
    await expect(page.getByText('Output: PNG')).toBeVisible();
    expect(runtimeRequests).toEqual([]);
  });

  test('image tools hub exposes Remove Background as a preview route', async ({ page }) => {
    await page.goto('/image-tools/');
    await expect(page.getByRole('link', { name: /Remove Background/i })).toHaveAttribute('href', '/remove-background/');
    await expect(page.getByText('Local AI background removal')).toBeVisible();
    await expect(page.getByText('Phase 5 preview')).toHaveCount(0);
  });

  test('advanced mask controls expose visible undo and redo while Gemini stays simplified', async ({ page }) => {
    await page.goto('/remove-watermark/');
    const watermark = page.locator('[data-image-tool-app]');
    await expect(watermark).toHaveAttribute('data-advanced-canvas', 'true');
    await expect(watermark.locator('[data-role="zoom-value"]')).toHaveText('100%');
    await expect(watermark.locator('[data-role="mask-padding"]')).toBeAttached();
    await expect(watermark.locator('[data-role="mask-feather"]')).toBeAttached();
    await expect(watermark.locator('[data-role="undo"]')).toBeAttached();
    await expect(watermark.locator('[data-role="redo"]')).toBeAttached();
    await expect(watermark.locator('[data-role="redo"]')).toBeDisabled();

    await page.goto('/remove-object/');
    const objectTool = page.locator('[data-image-tool-app]');
    await expect(objectTool.locator('[data-role="redo"]')).toBeAttached();

    await page.goto('/gemini-ai-logo-remover/');
    const gemini = page.locator('[data-image-tool-app]');
    await expect(gemini).toHaveAttribute('data-advanced-canvas', 'false');
    await expect(gemini.locator('[data-role="mask-padding"]')).toHaveCount(0);
    await expect(gemini.locator('[data-role="mask-feather"]')).toHaveCount(0);
    await expect(gemini.locator('[data-role="redo"]')).toHaveCount(0);
  });
});
