import { expect, test } from '@playwright/test';

test('Fade Image Edges is isolated in the Preview section', async ({ page }) => {
  await page.goto('/image-tools/');
  await expect(page.getByRole('heading', { name: 'Try new image workflows before they move to Live.' })).toBeVisible();
  const previewLink = page.locator('a[href="/fade-image-edges/"]').first();
  await expect(previewLink).toBeVisible();
  await expect(previewLink).toContainText('Preview');
});

test('Fade Image Edges exposes subtitle-safe fade controls and stays noindex while in Preview', async ({ page }) => {
  const response = await page.goto('/fade-image-edges/');
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole('heading', { level: 1, name: 'Fade image edges for subtitles and text.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('[data-tool-id="fade-image-edges"]')).toHaveAttribute('data-image-tool-ready', 'true');

  await expect(page.locator('[data-setting="direction"]')).toHaveValue('bottom');
  await expect(page.locator('[data-setting="style"]')).toHaveValue('organic');
  await expect(page.locator('[data-setting="depth"]')).toHaveValue('30');
  await expect(page.locator('[data-setting="radius"]')).toHaveValue('20');
  await expect(page.locator('[data-setting="softness"]')).toHaveValue('72');
  await expect(page.locator('[data-setting="texture"]')).toHaveValue('28');
});
