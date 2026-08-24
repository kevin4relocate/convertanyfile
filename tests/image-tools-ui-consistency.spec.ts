import { expect, test, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==', 'base64');
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG_2X2 });

const DETERMINISTIC_ROUTES = [
  '/resize-image/',
  '/compress-image/',
  '/rotate-flip-image/',
  '/crop-image/',
  '/blur-image/',
] as const;

const MASK_ROUTES = [
  '/remove-watermark/',
  '/gemini-ai-logo-remover/',
] as const;

async function expectEdgeToEdgeTopbar(page: Page): Promise<void> {
  const card = page.locator('[data-image-tool-app]');
  const topbar = card.locator('.image-editor-topbar');
  const cardBox = await card.boundingBox();
  const topbarBox = await topbar.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(topbarBox).not.toBeNull();
  expect(Math.abs(topbarBox!.x - cardBox!.x)).toBeLessThan(2);
  expect(Math.abs(topbarBox!.width - cardBox!.width)).toBeLessThan(3);
}

async function expectWatermarkStyleHeaderActions(page: Page, visible = true): Promise<void> {
  const add = page.locator('[data-image-tool-app] [data-role="add-more"]');
  if (visible) await expect(add).toBeVisible();
  const border = await add.evaluate((element) => getComputedStyle(element).borderTopWidth);
  expect(border).toBe('0px');
}

async function expectStableScope(page: Page): Promise<void> {
  const options = page.locator('[data-role="edit-scope-switch"] .image-edit-scope__options');
  const before = await options.boundingBox();
  await page.locator('[data-edit-scope="individual"]').click();
  const after = await options.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
  expect(Math.abs(after!.width - before!.width)).toBeLessThan(2);
}

async function uploadPair(page: Page, prefix: string): Promise<void> {
  await page.locator('[data-image-tool-app] [data-role="file-input"]').setInputFiles([
    png(`${prefix}-one.png`),
    png(`${prefix}-two.png`),
  ]);
}

test.describe('Image Tools watermark visual standard', () => {
  for (const route of MASK_ROUTES) {
    test(`${route} keeps the watermark-family shell`, async ({ page }) => {
      await page.goto(route);
      const app = page.locator('[data-image-tool-app]');
      await expectEdgeToEdgeTopbar(page);
      await app.locator('[data-role="file-input"]').setInputFiles(png('mask.png'));
      await expectWatermarkStyleHeaderActions(page);
      await expect(app.locator('[data-role="batch-list"]')).toHaveCSS('display', 'flex');
      await expect(app.locator('[data-role="edit-scope-switch"]')).toBeVisible();
      if (route !== '/gemini-ai-logo-remover/') {
        await expect(app).toHaveAttribute('data-advanced-canvas', 'true');
      }
    });
  }

  for (const route of DETERMINISTIC_ROUTES) {
    test(`${route} uses the watermark-standard linear workspace`, async ({ page }) => {
      await page.goto(route);
      const app = page.locator('[data-image-tool-app]');
      await expectEdgeToEdgeTopbar(page);
      await uploadPair(page, 'deterministic');
      await expectWatermarkStyleHeaderActions(page);
      await expect(app.locator('.image-batch-shell')).toHaveClass(/image-batch-shell--linear/);
      await expect(app.locator('[data-role="edit-scope-switch"]')).toHaveClass(/image-edit-scope--standard/);
      await expect(app.locator('[data-role="batch-list"]')).toHaveCSS('display', 'flex');
      await expect(app.locator('[data-role="preview-panel"] .image-tool-preview-panel')).toHaveCount(2);
      await expectStableScope(page);
    });
  }

  test('metadata cleanup keeps the shared topbar but uses a file-utility layout without previews', async ({ page }) => {
    await page.goto('/remove-image-metadata/');
    const app = page.locator('[data-image-tool-app]');
    await expectEdgeToEdgeTopbar(page);
    await uploadPair(page, 'metadata');
    await expectWatermarkStyleHeaderActions(page);
    await expect(app.locator('.metadata-file-row')).toHaveCount(2);
    await expect(app.locator('[data-role="edit-scope-switch"]')).toHaveCount(0);
    await expect(app.locator('[data-role="preview-panel"]')).toHaveCount(0);
  });

  test('bulk rename follows the watermark filmstrip and CTA hierarchy', async ({ page }) => {
    await page.goto('/bulk-rename-images/');
    const app = page.locator('[data-image-tool-app]');
    await expectEdgeToEdgeTopbar(page);
    await uploadPair(page, 'rename');
    await expectWatermarkStyleHeaderActions(page);
    await expect(app.locator('.image-batch-shell')).toHaveClass(/image-batch-shell--linear/);
    await expect(app.locator('[data-role="edit-scope-switch"]')).toHaveClass(/image-edit-scope--standard/);
    await expect(app.locator('[data-role="batch-list"]')).toHaveCSS('display', 'flex');
    await expect(app.locator('[data-role="process-batch"]')).toHaveText('Rename files');
    await expect(app.locator('[data-role="download-batch"]')).toHaveText('Download ZIP');
    const heights = await app.locator('.image-tool-cta').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    expect(new Set(heights.map(Math.round)).size).toBe(1);
    await expectStableScope(page);
  });
});
