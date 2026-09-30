import { expect, test, type Locator, type Page } from '@playwright/test';

async function readyImageTool(page: Page): Promise<Locator> {
  const app = await readyImageTool(page);
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  return app;
}

const PNG_2X2 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==','base64');
const png = (name:string) => ({ name, mimeType:'image/png', buffer:PNG_2X2 });

test.describe('Phase 4 image tools', () => {
  test('bulk rename keeps a shared pattern and supports individual filename overrides', async ({ page }) => {
    await page.goto('/bulk-rename-images/');
    const app = await readyImageTool(page);
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
    const app = await readyImageTool(page);
    await app.locator('[data-role="file-input"]').setInputFiles(png('this_is_a_very_long_source_filename_that_should_not_break_the_preview_layout.png'));
    const original = app.locator('[data-role="selected-original"]');
    await expect(original).toHaveCSS('white-space','nowrap');
    await expect(original).toHaveCSS('text-overflow','ellipsis');
  });

  test('metadata cleanup is a file utility with one batch setup and no image preview editor', async ({ page }) => {
    await page.goto('/remove-image-metadata/');
    const app = await readyImageTool(page);
    await expect(app).toHaveAttribute('data-tool-id','remove-image-metadata');
    await app.locator('[data-role="file-input"]').setInputFiles([png('meta-a.png'),png('meta-b.png')]);
    await expect(app.locator('[data-role="batch-count"]')).toHaveText('2');
    await expect(app.locator('.metadata-file-row')).toHaveCount(2);
    await expect(app.locator('[data-edit-scope]')).toHaveCount(0);
    await expect(app.locator('[data-role="source-preview"]')).toHaveCount(0);
    await expect(app.locator('[data-role="result-preview"]')).toHaveCount(0);

    await app.locator('[data-setting="format"]').selectOption('webp');
    await app.locator('[data-setting="quality"]').evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = '80';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(app.locator('[data-role="process-batch"]')).toBeEnabled();
  });
});
