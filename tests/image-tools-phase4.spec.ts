import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==','base64');
const png = (name:string) => ({ name, mimeType:'image/png', buffer:PNG_2X2 });

test.describe('Phase 4 image tools', () => {
  test('bulk rename keeps a shared pattern and supports individual filename overrides', async ({ page }) => {
    await page.goto('/bulk-rename-images/');
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-tool-id','bulk-rename-images');
    await expect(app).toHaveAttribute('data-platform-runtime','batch-v1');
    await app.locator('[data-role="file-input"]').setInputFiles([png('first.png'),png('second.png')]);
    await expect(app.locator('[data-role="batch-count"]')).toHaveText('2');
    await expect(app.locator('[data-role="batch-list"]')).toContainText('image-001.png');
    await app.locator('[data-edit-scope="individual"]').click();
    await expect(app).toHaveAttribute('data-platform-scope','individual');
    await app.locator('[data-role="custom-name"]').fill('hero-image');
    await expect(app.locator('[data-role="selected-result"]')).toHaveText('hero-image.png');
    await expect(app.locator('[data-role="batch-list"]')).toContainText('CUSTOM');

    await app.locator('[data-role="custom-name"]').fill('hero-image.jpg');
    await expect(app.locator('[data-role="selected-result"]')).toHaveText('hero-image.png');

    await app.locator('[data-role="process-batch"]').click();
    await expect(app.locator('[data-role="download-batch"]')).toBeEnabled();
  });

  test('bulk rename keeps long desktop preview filenames on one aligned row', async ({ page }) => {
    await page.goto('/bulk-rename-images/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles(png('this_is_a_very_long_source_filename_that_should_not_break_the_preview_layout.png'));
    const original = app.locator('[data-role="selected-original"]');
    await expect(original).toHaveCSS('white-space','nowrap');
    await expect(original).toHaveCSS('text-overflow','ellipsis');
  });

  test('metadata tool exposes clean-output settings and per-image overrides', async ({ page }) => {
    await page.goto('/remove-image-metadata/');
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-tool-id','remove-image-metadata');
    await expect(app).toHaveAttribute('data-platform-runtime','batch-v1');
    await app.locator('[data-role="file-input"]').setInputFiles([png('meta-a.png'),png('meta-b.png')]);
    await app.locator('[data-edit-scope="individual"]').click();
    await app.locator('[data-setting="format"]').selectOption('webp');
    await app.locator('[data-setting="quality"]').evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '80';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(app.locator('[data-role="batch-list"]')).toContainText('CUSTOM');
  });

  test('remove object uses object copy and advanced canvas controls', async ({ page }) => {
    await page.goto('/remove-object/');
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-tool-id','remove-object');
    await expect(app).toHaveAttribute('data-advanced-canvas','true');
    await expect(app.locator('[data-role="zoom-value"]')).toHaveText('100%');
    await expect(app.locator('[data-role="mask-padding"]')).toHaveValue('4');
    await expect(app.locator('[data-role="mask-feather"]')).toHaveValue('4');
    await app.locator('[data-role="file-input"]').setInputFiles(png('object.png'));
    await expect(app.locator('[data-role="selection-status"]')).toContainText('object');
    await app.locator('[data-role="zoom-in"]').click();
    await expect(app.locator('[data-role="zoom-value"]')).toHaveText('125%');
  });

  test('mask scope controls stay fixed when switching shared and individual modes', async ({ page }) => {
    await page.goto('/remove-object/');
    const app = page.locator('[data-image-tool-app]');
    await app.locator('[data-role="file-input"]').setInputFiles(png('object.png'));
    const options = app.locator('.gemini-edit-mode-options');
    const before = await options.boundingBox();
    expect(before).not.toBeNull();
    await app.locator('[data-edit-mode="individual"]').click();
    await expect(app.locator('[data-edit-mode="individual"]')).toHaveAttribute('aria-checked','true');
    const after = await options.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(1.5);
    expect(Math.abs((after?.width ?? 0) - (before?.width ?? 0))).toBeLessThan(1.5);
  });
});
