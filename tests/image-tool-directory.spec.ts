import { expect, test } from '@playwright/test';
import { IMAGE_TOOL_MANIFEST, IMAGE_TOOL_DIRECTORY_SECTIONS } from '../src/config/image-tools';

test('directory keeps real tool links and headings in server-rendered HTML', async ({ request }) => {
  const response = await request.get('/image-tools/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();

  expect(html).toContain('Search image tools');
  expect(html).toContain('data-image-tools-directory');
  expect(html).toContain('data-directory-results');
  for (const { tool } of IMAGE_TOOL_MANIFEST) {
    expect(html, `${tool.id} must be discoverable without JavaScript`).toContain(`href="/${tool.slug}/"`);
  }
  for (const section of IMAGE_TOOL_DIRECTORY_SECTIONS) {
    expect(html).toContain(`data-directory-section="${section.id}"`);
  }
});

test('search filters SSR cards by tool name, description, and keywords without navigation', async ({ page }) => {
  await page.goto('/image-tools/');
  const directory = page.locator('[data-image-tools-directory]');
  await expect(directory).toHaveAttribute('data-directory-ready', 'true');
  const search = page.getByRole('searchbox', { name: 'Search image tools' });
  const cards = directory.locator('[data-directory-tool]');

  await expect(cards).toHaveCount(IMAGE_TOOL_MANIFEST.length);
  await expect(cards.filter({ visible: true })).toHaveCount(IMAGE_TOOL_MANIFEST.length);

  await search.fill('EXIF');
  await expect(cards.filter({ visible: true })).toHaveCount(2);
  await expect(directory.locator('[data-directory-tool]:visible[href="/remove-image-metadata/"]')).toHaveCount(1);
  await expect(directory.locator('[data-directory-tool]:visible[href="/exif-metadata-viewer/"]')).toHaveCount(1);
  await expect(directory.locator('[data-directory-count]')).toHaveText(`Showing 2 of ${IMAGE_TOOL_MANIFEST.length} tools`);
  await expect(directory.locator('[data-directory-section="everyday"]')).toBeHidden();

  await search.fill('watermark');
  await expect(directory.locator('[data-directory-tool]:visible')).toHaveCount(3);
  await expect(page).toHaveURL(/\/image-tools\/$/);

  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(cards.filter({ visible: true })).toHaveCount(IMAGE_TOOL_MANIFEST.length);
});

test('category buttons, empty state, clear and reset work without losing link targets', async ({ page }) => {
  await page.goto('/image-tools/');
  const directory = page.locator('[data-image-tools-directory]');
  await expect(directory).toHaveAttribute('data-directory-ready', 'true');
  const search = page.getByRole('searchbox', { name: 'Search image tools' });

  const preview = directory.getByRole('button', { name: /Preview/ });
  await preview.click();
  await expect(preview).toHaveAttribute('aria-pressed', 'true');
  await expect(directory.locator('[data-directory-tool]:visible')).toHaveCount(1);
  await expect(directory.locator('[data-directory-tool]:visible')).toHaveAttribute('href', '/fade-image-edges/');
  await expect(directory.locator('[data-directory-section="watermarks"]')).toBeHidden();

  await search.fill('no-such-tool-xyz');
  await expect(directory.locator('[data-directory-tool]:visible')).toHaveCount(0);
  await expect(directory.locator('[data-directory-empty]')).toBeVisible();
  await expect(directory.locator('[data-directory-count]')).toContainText('Showing 0');

  await directory.getByRole('button', { name: 'Show all image tools' }).click();
  await expect(search).toHaveValue('');
  await expect(directory.getByRole('button', { name: /All tools/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(directory.locator('[data-directory-tool]:visible')).toHaveCount(IMAGE_TOOL_MANIFEST.length);
  await expect(directory.locator('[data-directory-empty]')).toBeHidden();

  await search.fill('resize');
  await expect(directory.locator('[data-directory-clear]')).toBeVisible();
  await directory.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(directory.locator('[data-directory-clear]')).toBeHidden();
});

test('mobile layout exposes search and category filters without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile layout regression');
  await page.goto('/image-tools/');
  const directory = page.locator('[data-image-tools-directory]');
  await expect(directory.locator('[data-directory-search-input]')).toBeVisible();
  await expect(directory.getByRole('button', { name: /Cleanup/ })).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 1);
});
