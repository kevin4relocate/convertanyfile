import { expect, test } from '@playwright/test';

const PNG_SQUARE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);
const PNG_WIDE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAIAAAASFvFNAAAAEElEQVR4nGP8zwAFTDAGAwATKQED8NgHhAAAAABJRU5ErkJggg==',
  'base64',
);

const tools = [
  { name: 'Remove Watermark', path: '/remove-watermark/', maskCount: 6, hasText: true },
  { name: 'Gemini AI Logo Remover', path: '/gemini-ai-logo-remover/', maskCount: 2, hasText: false },
] as const;

for (const tool of tools) {
  test(`${tool.name} mounts through the shared batch platform without losing mask behavior`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run the mask platform contract once in Chromium');

    await page.goto(tool.path);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-platform-runtime', 'batch-v1');
    await expect(app.locator('[data-platform-shell="batch-v1"]')).toHaveCount(1);
    await expect(app.locator('[data-tool-mode]')).toHaveCount(tool.maskCount);
    await expect(app.locator('[data-role="text-mask-control"]')).toHaveCount(tool.hasText ? 1 : 0);

    await app.locator('[data-role="file-input"]').setInputFiles([
      { name: 'same-a.png', mimeType: 'image/png', buffer: PNG_SQUARE },
      { name: 'same-b.png', mimeType: 'image/png', buffer: PNG_SQUARE },
    ]);

    await expect(app.locator('[data-role="editor"]')).toBeVisible();
    await expect(app.locator('[data-role="batch-count"]')).toHaveText('2');
    await expect(app.locator('.gemini-file-card')).toHaveCount(2);
    await expect(app.locator('[data-edit-mode="shared"]')).toHaveAttribute('aria-checked', 'true');
    await expect(app).toHaveAttribute('data-platform-scope', 'shared');

    await app.locator('[data-edit-mode="individual"]').click();
    await expect(app.locator('[data-edit-mode="individual"]')).toHaveAttribute('aria-checked', 'true');
    await expect(app).toHaveAttribute('data-platform-scope', 'individual');

    await app.locator('[data-edit-mode="shared"]').click();
    await expect(app.locator('[data-edit-mode="shared"]')).toHaveAttribute('aria-checked', 'true');
    await expect(app).toHaveAttribute('data-platform-scope', 'shared');

    await expect(app.locator('[data-output-value]')).toHaveCount(4);
    await expect(app.locator('[data-role="quality"]')).toHaveValue('96');
    await expect(app.locator('[data-role="remove"]')).toBeDisabled();
    await expect(app.locator('[data-role="download"]')).toBeDisabled();
  });

  test(`${tool.name} keeps the mixed-ratio automatic individual recommendation`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run the mask platform contract once in Chromium');

    await page.goto(tool.path);
    const app = page.locator('[data-image-tool-app]');
    await expect(app).toHaveAttribute('data-platform-runtime', 'batch-v1');

    await app.locator('[data-role="file-input"]').setInputFiles([
      { name: 'square.png', mimeType: 'image/png', buffer: PNG_SQUARE },
      { name: 'wide.png', mimeType: 'image/png', buffer: PNG_WIDE },
    ]);

    await expect(app.locator('[data-role="batch-count"]')).toHaveText('2');
    await expect(app.locator('[data-edit-mode="individual"]')).toHaveAttribute('aria-checked', 'true');
    await expect(app).toHaveAttribute('data-platform-scope', 'individual');
    await expect(app.locator('[data-role="batch-warning"]')).toBeVisible();
    await expect(app.locator('[data-role="batch-warning-title"]')).toContainText('Mixed aspect ratios');
  });
}
