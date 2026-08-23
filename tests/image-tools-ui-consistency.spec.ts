import { expect, test, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==', 'base64');
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG_2X2 });

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

async function expectWatermarkStyleHeaderActions(page: Page): Promise<void> {
  const add = page.locator('[data-image-tool-app] [data-role="add-more"]');
  await expect(add).toBeVisible();
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

test.describe('Image Tools watermark visual standard', () => {
  test('remove watermark remains the reference layout', async ({ page }) => {
    await page.goto('/remove-watermark/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles(png('watermark.png'));
    await expectEdgeToEdgeTopbar(page);
    await expectWatermarkStyleHeaderActions(page);
    await expect(page.locator('.gemini-file-queue')).toHaveCSS('display', 'flex');
    await expectStableScope(page);
  });

  test('deterministic tools use linear flow, filmstrip, standard scope and preview cards', async ({ page }) => {
    await page.goto('/resize-image/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles([png('one.png'), png('two.png')]);
    await expectEdgeToEdgeTopbar(page);
    await expectWatermarkStyleHeaderActions(page);
    await expect(app.locator('.image-batch-shell')).toHaveClass(/image-batch-shell--linear/);
    await expect(app.locator('[data-role="edit-scope-switch"]')).toHaveClass(/image-edit-scope--standard/);
    await expect(app.locator('[data-role="batch-list"]')).toHaveCSS('display', 'flex');
    await expect(app.locator('[data-role="preview-panel"] .image-tool-preview-panel')).toHaveCount(2);
    await expectStableScope(page);
  });

  test('bulk rename follows the same filmstrip and CTA hierarchy', async ({ page }) => {
    await page.goto('/bulk-rename-images/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles([png('first.png'), png('second.png')]);
    await expectEdgeToEdgeTopbar(page);
    await expectWatermarkStyleHeaderActions(page);
    await expect(app.locator('.image-batch-shell')).toHaveClass(/image-batch-shell--linear/);
    await expect(app.locator('[data-role="batch-list"]')).toHaveCSS('display', 'flex');
    await expect(app.locator('[data-role="process-batch"]')).toHaveText('Rename files');
    await expect(app.locator('[data-role="download-batch"]')).toHaveText('Download ZIP');
    const heights = await app.locator('.image-tool-cta').evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    expect(new Set(heights.map(Math.round)).size).toBe(1);
  });

  test('background remover follows the same shell while keeping AI-specific settings', async ({ page }) => {
    await page.goto('/remove-background/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles(png('subject.png'));
    await expectEdgeToEdgeTopbar(page);
    await expectWatermarkStyleHeaderActions(page);
    await expect(app.locator('.image-batch-shell')).toHaveClass(/image-batch-shell--linear/);
    await expect(app.locator('[data-role="batch-list"]')).toHaveCSS('display', 'flex');
    await expect(app.locator('[data-role="preview-panel"] .image-tool-preview-panel')).toHaveCount(2);
    await expect(app.locator('[data-role="model-status"]')).toContainText('Local AI runtime');
    await expectStableScope(page);
  });
});
