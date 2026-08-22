import { expect, test, type Page } from '@playwright/test';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAD0lEQVR4nGP4z8DAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64',
);

const imageFile = { name: 'tiny.png', mimeType: 'image/png', buffer: tinyPng };

async function addTinyImage(page: Page, name = 'tiny.png') {
  await page.locator('[data-role="file-input"]').setInputFiles({ name, mimeType: 'image/png', buffer: tinyPng });
  await expect(page.locator('[data-role="summary"]')).toContainText('1 image');
}

async function expectDone(page: Page) {
  await expect(page.locator('.image-utility-row-status')).toHaveText('Done', { timeout: 60_000 });
  await expect(page.locator('.image-utility-row-actions button').first()).toHaveText('Download');
}

test('Resize Image admits and resizes a local PNG', async ({ page }) => {
  await page.goto('/resize-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Resize images online');
  await addTinyImage(page);
  await page.locator('[data-role="width"]').fill('10');
  await page.locator('[data-role="height"]').fill('10');
  await page.locator('[data-role="run"]').click();
  await expectDone(page);
  await expect(page.locator('.image-utility-row-copy span')).toContainText('10×10');
});

test('Resize Image reports duplicate admissions instead of silently skipping them', async ({ page }) => {
  await page.goto('/resize-image/');
  await page.locator('[data-role="file-input"]').setInputFiles([imageFile, imageFile]);
  await expect(page.locator('[data-role="summary"]')).toContainText('1 image');
  await expect(page.locator('[data-role="notice"]')).toContainText('duplicate');
});

test('Compress Image admits and recompresses a local PNG', async ({ page }) => {
  await page.goto('/compress-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Compress images online');
  await addTinyImage(page);
  await page.locator('[data-role="output"]').selectOption('webp');
  await page.locator('[data-role="run"]').click();
  await expectDone(page);
});

test('Rotate Image runs a real 90 degree worker transform', async ({ page }) => {
  await page.goto('/rotate-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rotate and flip images online');
  await addTinyImage(page);
  await page.locator('[data-role="rotation"]').selectOption('90');
  await page.locator('[data-role="run"]').click();
  await expectDone(page);
});

test('Crop Image positions an exact crop with the interactive batch anchor', async ({ page }) => {
  await page.goto('/crop-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Crop images online');
  await addTinyImage(page);
  await expect(page.locator('[data-role="crop-interactive"]')).toBeVisible();
  await page.locator('[data-role="crop-mode"]').selectOption('exact');
  await page.locator('[data-role="crop-width"]').fill('1');
  await page.locator('[data-role="crop-height"]').fill('1');
  await page.locator('[data-crop-anchor="bottom-right"]').click();
  await expect(page.locator('[data-role="crop-position-label"]')).toContainText('Bottom Right');
  await page.locator('[data-role="run"]').click();
  await expectDone(page);
  await expect(page.locator('.image-utility-row-copy span')).toContainText('1×1');
});

test('Image Background runs a custom solid-background worker transform', async ({ page }) => {
  await page.goto('/image-background/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Add a background color');
  await addTinyImage(page);
  await page.locator('[data-role="background-hex"]').fill('#111827');
  await page.locator('[data-role="background-hex"]').blur();
  await page.locator('[data-role="output"]').selectOption('png');
  await page.locator('[data-role="run"]').click();
  await expectDone(page);
});

test('Image Background preserve mode prevents JPG transparency output', async ({ page }) => {
  await page.goto('/image-background/');
  await addTinyImage(page);
  await page.locator('[data-role="output"]').selectOption('jpg');
  await page.locator('[data-role="background-mode"]').selectOption('preserve');
  await expect(page.locator('[data-role="output"]')).toHaveValue('png');
  await expect(page.locator('[data-role="output"] option[value="jpg"]')).toBeDisabled();
});

test('Blur Image runs a real Gaussian blur worker transform', async ({ page }) => {
  await page.goto('/blur-image/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Blur images locally');
  await addTinyImage(page);
  await page.locator('[data-role="blur-strength"]').evaluate((node) => {
    const input = node as HTMLInputElement;
    input.value = '4';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('[data-role="blur-value"]')).toHaveText('4');
  await page.locator('[data-role="run"]').click();
  await expectDone(page);
});

test('Image Metadata inspects and creates a cleaned copy', async ({ page }) => {
  await page.goto('/image-metadata/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('View and remove image metadata locally');
  await page.locator('[data-role="file-input"]').setInputFiles(imageFile);
  await expect(page.locator('[data-role="dimensions"]')).toHaveText('2×2', { timeout: 60_000 });
  await page.locator('[data-role="clean"]').click();
  await expect(page.locator('[data-role="result"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('[data-role="download"]')).toBeVisible();
});

test('Bulk Rename previews deterministic safe filenames without processing pixels', async ({ page }) => {
  await page.goto('/bulk-rename-images/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bulk rename image files');
  await page.locator('[data-role="file-input"]').setInputFiles([
    { name: 'First Photo.png', mimeType: 'image/png', buffer: tinyPng },
    { name: 'Second Photo.png', mimeType: 'image/png', buffer: tinyPng },
  ]);
  await expect(page.locator('[data-role="summary"]')).toContainText('2 images');
  await page.locator('[data-role="pattern"]').fill('gallery-{n}');
  await expect(page.locator('.rename-row-copy span').nth(0)).toContainText('gallery-001.png');
  await expect(page.locator('.rename-row-copy span').nth(1)).toContainText('gallery-002.png');
  await expect(page.locator('[data-role="preview-summary"]')).toContainText('original file bytes are unchanged');
});
