import { expect, test, type Locator, type Page } from '@playwright/test';

async function readyTool(page: Page, toolId: string): Promise<Locator> {
  const app = page.locator(`[data-image-tool-app][data-tool-id="${toolId}"]`);
  await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
  return app;
}

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);
const PNG_4X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAE0lEQVR42mP8z8DwnwEJMDGgAQA/JwICXm3wVAAAAABJRU5ErkJggg==',
  'base64',
);
const PNG_2X4 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAAECAYAAACk7+45AAAAFklEQVR42mP8z8Dwn4GBgYGJAQowGQBDcQIGRy9a5gAAAABJRU5ErkJggg==',
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
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Run core image platform coverage once in Chromium');
    await page.goto(path);
    const app = page.locator(`[data-image-tool-app][data-tool-id="${toolId}"]`);
    await expect(app).toHaveAttribute('data-image-tool-ready', 'true');
    await expect(app).toHaveAttribute('data-platform-runtime', 'batch-v1');
    await expect(app.locator('[data-role="batch-dropzone"]')).toBeVisible();
    await expect(app.locator('[data-edit-scope="shared"]')).toBeAttached();
    await expect(app.locator('[data-edit-scope="individual"]')).toBeAttached();
    await expect(app.locator('[data-role="batch-dropzone"]')).toContainText('10 MB each');
    await expect(app.locator('[data-role="edit-mode-copy"]')).toContainText('Start with one shared setup');
  });
}

test('resize supports shared and per-image overrides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run core image interaction coverage once in Chromium');
  await page.goto('/resize-image/');
  const app = await readyTool(page, 'resize-image');
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

test('locked shared resize preserves each image ratio in a mixed batch', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run mixed-ratio resize coverage once in Chromium');
  await page.goto('/resize-image/');
  const app = await readyTool(page, 'resize-image');
  await app.locator('[data-role="file-input"]').setInputFiles([
    { name: 'wide.png', mimeType: 'image/png', buffer: PNG_4X2 },
    { name: 'tall.png', mimeType: 'image/png', buffer: PNG_2X4 },
  ]);
  await expect(app.locator('.deterministic-file-card')).toHaveCount(2);

  await app.locator('[data-setting="width"]').fill('8');
  await expect(app.locator('[data-setting="height"]')).toHaveValue('4');

  await app.locator('.deterministic-file-card').nth(1).click();
  await expect(app.locator('[data-setting="width"]')).toHaveValue('8');
  await expect(app.locator('[data-setting="height"]')).toHaveValue('16');
  await expect(app.locator('[data-role="preview-meta"]')).toContainText('8 × 16 preview');
});

test('resize rejects unsafe output canvas dimensions before processing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run resize safety coverage once in Chromium');
  await page.goto('/resize-image/');
  const app = await readyTool(page, 'resize-image');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: PNG_4X2 });
  await app.locator('[data-setting="width"]').fill('12000');
  await expect(app.locator('[data-role="preview-meta"]')).toContainText('safety limit');
});

test('compress keeps output quality as an individual override', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run core image interaction coverage once in Chromium');
  await page.goto('/compress-image/');
  const app = await readyTool(page, 'compress-image');
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

test('explicit PNG output disables meaningless quality controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run output control coverage once in Chromium');

  await page.goto('/compress-image/');
  const compress = await readyTool(page, 'compress-image');
  await compress.locator('[data-role="file-input"]').setInputFiles({ name: 'compress.png', mimeType: 'image/png', buffer: PNG_2X2 });
  await expect(compress).toHaveAttribute('data-has-items', 'true');
  const embeddedFormat = compress.locator('[data-setting="format"]');
  const embeddedQuality = compress.locator('[data-setting="quality"]');
  await embeddedFormat.selectOption('png');
  await expect(embeddedQuality).toBeDisabled();
  await embeddedFormat.selectOption('webp');
  await expect(embeddedQuality).toBeEnabled();

  await page.goto('/rotate-flip-image/');
  const rotate = await readyTool(page, 'rotate-flip-image');
  await rotate.locator('[data-role="file-input"]').setInputFiles({ name: 'rotate.png', mimeType: 'image/png', buffer: PNG_2X2 });
  await expect(rotate).toHaveAttribute('data-has-items', 'true');
  const outputFormat = rotate.locator('[data-role="output-format"]');
  const outputQuality = rotate.locator('[data-role="output-quality"]');
  await outputFormat.selectOption('png');
  await expect(outputQuality).toBeDisabled();
  await outputFormat.selectOption('webp');
  await expect(outputQuality).toBeEnabled();
});

test('crop and blur expose geometry-specific controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run core geometry control coverage once in Chromium');
  await page.goto('/crop-image/');
  const crop = await readyTool(page, 'crop-image');
  await crop.locator('[data-role="file-input"]').setInputFiles({ name: 'crop.png', mimeType: 'image/png', buffer: PNG_2X2 });
  await expect(crop).toHaveAttribute('data-has-items', 'true');
  await expect(page.locator('[data-setting="aspect"]')).toContainText('16:9');
  await expect(page.locator('[data-setting="width"]')).toHaveValue('100');

  await page.goto('/blur-image/');
  const blur = await readyTool(page, 'blur-image');
  await blur.locator('[data-role="file-input"]').setInputFiles({ name: 'blur.png', mimeType: 'image/png', buffer: PNG_2X2 });
  await expect(blur).toHaveAttribute('data-has-items', 'true');
  await blur.locator('[data-setting="scope"]').selectOption('region');
  await expect(blur.locator('[data-setting-group="region"]').first()).toBeVisible();
});

test('core tool can process a local image end-to-end', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Run one deterministic processing smoke in Chromium');
  await page.goto('/rotate-flip-image/');
  const app = await readyTool(page, 'rotate-flip-image');
  await app.locator('[data-role="file-input"]').setInputFiles({ name: 'rotate.png', mimeType: 'image/png', buffer: PNG_2X2 });
  await app.locator('[data-setting="rotation"]').selectOption('90');
  await expect(app.locator('[data-role="process-batch"]')).toBeEnabled();
  await app.locator('[data-role="process-batch"]').click();
  await expect(app.locator('[data-role="progress-label"]')).toContainText('1 completed');
  await expect(app.locator('[data-role="download-batch"]')).toBeEnabled();
});
