import { expect, test } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

const TOOLS = [
  ['/resize-image/', 'resize-image'],
  ['/compress-image/', 'compress-image'],
  ['/rotate-flip-image/', 'rotate-flip-image'],
  ['/crop-image/', 'crop-image'],
  ['/blur-image/', 'blur-image'],
] as const;

for (const [path, toolId] of TOOLS) {
  test(`${toolId} mounts on the shared batch platform`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run Phase 3 platform coverage once in Chromium');
    await page.goto(path);
    const app = page.locator(`[data-image-tool-app][data-tool-id="${toolId}"]`);
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
    await expect(app).toHaveAttribute('data-platform-runtime', 'batch-v1');
    await expect(app.locator('[data-role="batch-dropzone"]')).toBeVisible();
    await expect(app.locator('[data-edit-scope="shared"]')).toBeAttached();
    await expect(app.locator('[data-edit-scope="individual"]')).toBeAttached();
  });
}

test('resize supports shared and per-image overrides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run Phase 3 interaction coverage once in Chromium');
  await page.goto('/resize-image/');
  const app = page.locator('[data-tool-id="resize-image"]');
  await app.locator('[data-role="file-input"]').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: PNG_2X2 },
    { name: 'two.png', mimeType: 'image/png', buffer: PNG_2X2 },
  ]);
  await expect(app).toHaveAttribute('data-has-items', 'true');
  await expect(app.locator('.deterministic-file-card')).toHaveCount(2);
  await app.locator('[data-edit-scope="individual"]').click();
  await expect(app).toHaveAttribute('data-platform-scope', 'individual');
  await app.locator('[data-setting="width"]').fill('4');
  await expect(app.locator('.deterministic-file-card').first()).toContainText('CUSTOM');
  await app.locator('.deterministic-file-card').nth(1).click();
  await expect(app.locator('[data-setting="width"]')).toHaveValue('1920');
});

test('compress keeps output quality as an individual override', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run Phase 3 interaction coverage once in Chromium');
  await page.goto('/compress-image/');
  const app = page.locator('[data-tool-id="compress-image"]');
  await app.locator('[data-role="file-input"]').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: PNG_2X2 },
    { name: 'two.png', mimeType: 'image/png', buffer: PNG_2X2 },
  ]);
  await app.locator('[data-edit-scope="individual"]').click();
  await app.locator('[data-setting="quality"]').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '55';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(app.locator('.deterministic-file-card').first()).toContainText('CUSTOM');
  await app.locator('.deterministic-file-card').nth(1).click();
  await expect(app.locator('[data-setting="quality"]')).toHaveValue('82');
});

test('crop and blur expose geometry-specific controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run Phase 3 control coverage once in Chromium');
  await page.goto('/crop-image/');
  await expect(page.locator('[data-setting="aspect"]')).toContainText('16:9');
  await expect(page.locator('[data-setting="width"]')).toHaveValue('100');

  await page.goto('/blur-image/');
  const blur = page.locator('[data-tool-id="blur-image"]');
  await blur.locator('[data-setting="scope"]').selectOption('region');
  await expect(blur.locator('[data-setting-group="region"]').first()).toBeVisible();
});

test('core tool can process a local image end-to-end', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run one deterministic processing smoke in Chromium');
  await page.goto('/rotate-flip-image/');
  const app = page.locator('[data-tool-id="rotate-flip-image"]');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'rotate.png', mimeType: 'image/png', buffer: PNG_2X2 });
  await app.locator('[data-setting="rotation"]').selectOption('90');
  await expect(app.locator('[data-role="process-batch"]')).toBeEnabled();
  await app.locator('[data-role="process-batch"]').click();
  await expect(app.locator('[data-role="progress-label"]')).toContainText('1 completed');
  await expect(app.locator('[data-role="download-batch"]')).toBeEnabled();
});
