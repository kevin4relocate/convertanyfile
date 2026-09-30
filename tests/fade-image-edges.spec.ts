import { expect, test, type Locator, type Page } from '@playwright/test';

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

async function readyFadeTool(page: Page, withImage = false): Promise<Locator> {
  const root = page.locator('[data-image-tool-app][data-tool-id="fade-image-edges"]');
  await expect(root).toHaveAttribute('data-image-tool-ready', 'true');
  if (withImage) {
    await root.locator('[data-role="file-input"]').setInputFiles({
      name: 'fade-test.png',
      mimeType: 'image/png',
      buffer: PNG_2X2,
    });
    await expect(root).toHaveAttribute('data-has-items', 'true');
  }
  return root;
}

test('Fade Image Edges is isolated in the Preview section', async ({ page }) => {
  await page.goto('/image-tools/');
  await expect(page.getByRole('heading', { name: 'Try new image workflows before they move to Live.' })).toBeVisible();
  const previewLink = page.locator('a[href="/fade-image-edges/"]').first();
  await expect(previewLink).toBeVisible();
  await expect(previewLink).toContainText('Preview');
});

test('Fade Image Edges v2 exposes subtitle-safe presets and stays noindex while in Preview', async ({ page }) => {
  const response = await page.goto('/fade-image-edges/');
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole('heading', { level: 1, name: 'Fade image edges for subtitles and text.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await readyFadeTool(page, true);

  await expect(page.locator('[data-setting="effectMode"]')).toHaveValue('subtitle-safe');
  await expect(page.locator('[data-setting="preset"]')).toHaveValue('subtitle-strong');
  await expect(page.locator('[data-setting="direction"]')).toHaveValue('bottom');
  await expect(page.locator('[data-setting="style"]')).toHaveValue('smooth');
  await expect(page.locator('[data-setting="depth"]')).toHaveValue('55');
  await expect(page.locator('[data-setting="radius"]')).toHaveValue('85');
  await expect(page.locator('[data-setting="wash"]')).toHaveValue('35');
  await expect(page.locator('[data-setting="softness"]')).toHaveValue('50');
  await expect(page.locator('[data-setting="contrast"]')).toHaveValue('45');
  await expect(page.locator('[data-setting="washColor"]')).toHaveValue('dark');
  await expect(page.locator('[data-setting="showGuide"]')).toBeChecked();

  await page.locator('[data-setting="preset"]').selectOption('paper-wash');
  await expect(page.locator('[data-setting="style"]')).toHaveValue('organic');
  await expect(page.locator('[data-setting="texture"]')).toHaveValue('25');
  await expect(page.locator('[data-setting="washColor"]')).toHaveValue('light');

  await page.locator('[data-setting="depth"]').fill('80');
  await expect(page.locator('[data-setting="preset"]')).toHaveValue('custom');
});

test('Fade Image Edges keeps the default settings compact and moves secondary controls under More controls', async ({ page }) => {
  await page.goto('/fade-image-edges/');
  const root = await readyFadeTool(page, true);
  const compactGrid = root.locator('.edge-fade-v2-grid--compact');
  const advanced = root.locator('.edge-fade-advanced');

  await expect(compactGrid).toBeVisible();
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(advanced.locator('summary')).toHaveText('More controls');
  await expect(advanced.locator('[data-setting="effectMode"]')).toHaveCount(1);
  await expect(advanced.locator('[data-setting="style"]')).toHaveCount(1);
  await expect(compactGrid.locator(':scope > .edge-fade-compact-preset [data-setting="preset"]')).toHaveCount(1);
  await expect(compactGrid.locator(':scope > .edge-fade-compact-edge [data-setting="direction"]')).toHaveCount(1);
  await expect(compactGrid.locator(':scope > .edge-fade-compact-slider')).toHaveCount(3);
  await expect(compactGrid.locator(':scope > .setting-note:not(details)')).toHaveCount(0);
});

test('subtitle safe-zone boundary control changes Fade depth', async ({ page }) => {
  await page.goto('/fade-image-edges/');
  await readyFadeTool(page, true);
  const depth = page.locator('[data-setting="depth"]');
  const bottomHandle = page.locator('[data-guide-edge="bottom"]');

  await expect(bottomHandle).toBeVisible();
  await bottomHandle.focus();
  await bottomHandle.press('ArrowUp');

  await expect(depth).toHaveValue('56');
  await expect(page.locator('[data-setting="preset"]')).toHaveValue('custom');
  await expect(bottomHandle).toHaveAttribute('aria-valuenow', '56');
});
