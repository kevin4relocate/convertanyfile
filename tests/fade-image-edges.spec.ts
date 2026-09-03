import { expect, test } from '@playwright/test';

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
  await expect(page.locator('[data-tool-id="fade-image-edges"]')).toHaveAttribute('data-image-tool-ready', 'true');

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
  const root = page.locator('[data-tool-id="fade-image-edges"]');
  const compactGrid = root.locator('.edge-fade-v2-grid--compact');
  const advanced = root.locator('.edge-fade-advanced');

  await expect(compactGrid).toBeVisible();
  await expect(advanced).not.toHaveAttribute('open', '');
  await expect(advanced.locator('summary')).toHaveText('More controls');
  await expect(advanced.locator('[data-setting="effectMode"]')).toHaveCount(1);
  await expect(advanced.locator('[data-setting="style"]')).toHaveCount(1);
  await expect(compactGrid.locator('> .edge-fade-compact-preset [data-setting="preset"]')).toHaveCount(1);
  await expect(compactGrid.locator('> .edge-fade-compact-edge [data-setting="direction"]')).toHaveCount(1);
  await expect(compactGrid.locator('> .edge-fade-compact-slider')).toHaveCount(3);
  await expect(compactGrid.locator('> .setting-note:not(details)')).toHaveCount(0);
});

test('subtitle safe-zone boundary can be dragged to change Fade depth', async ({ page }) => {
  await page.goto('/fade-image-edges/');
  const depth = page.locator('[data-setting="depth"]');
  const host = page.locator('.edge-fade-guide-host');
  const bottomHandle = page.locator('[data-guide-edge="bottom"]');

  await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('.edge-fade-guide-host');
    const handle = document.querySelector<HTMLElement>('[data-guide-edge="bottom"]');
    if (!host || !handle) throw new Error('Safe-zone drag controls are missing.');
    host.hidden = false;
    host.style.left = '100px';
    host.style.top = '100px';
    host.style.width = '400px';
    host.style.height = '240px';
    handle.hidden = false;
    handle.style.top = '99px';
  });

  const box = await bottomHandle.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 45, { steps: 5 });
  await page.mouse.up();

  await expect(depth).not.toHaveValue('55');
  await expect(page.locator('[data-setting="preset"]')).toHaveValue('custom');
  const value = Number(await depth.inputValue());
  expect(value).toBeGreaterThan(55);
});
