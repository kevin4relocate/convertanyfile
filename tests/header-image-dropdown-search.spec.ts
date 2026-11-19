import { expect, test } from '@playwright/test';
import { IMAGE_TOOL_MANIFEST } from '../src/config/image-tools';

test('Image Tools header catalog includes a search field and every live image tool', async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  const header = html.slice(html.indexOf('<header class="site-header"'), html.indexOf('</header>'));
  expect(header).toContain('Search Image Tools');
  expect(header).toContain('data-nav-search');
  expect(header).toContain('All Image Tools');
  for (const entry of IMAGE_TOOL_MANIFEST.filter((item) => item.tool.status === 'live')) {
    expect(header).toContain(`href="/${entry.tool.slug}/"`);
  }
});

test('Image Tools nav search filters by label or description, resets, and shows empty state', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop dropdown search; mobile uses the expandable list');
  await page.goto('/image-tools/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const section = nav.locator('details.nav-dropdown').filter({
    has: page.locator('summary').filter({ hasText: 'Image Tools' }),
  });
  await section.locator('summary').click();
  const input = section.getByRole('searchbox', { name: 'Search Image Tools' });
  await expect(input).toBeVisible();
  const all = section.locator('[data-nav-item]');
  expect(await all.count()).toBeGreaterThan(10);
  await input.fill('collage');
  await expect(section.getByRole('link', { name: /Image Collage Maker/ })).toBeVisible();
  await expect(section.getByRole('link', { name: /App Icon Generator/ })).toBeHidden();
  await input.fill('not-a-real-tool-zzzz');
  await expect(section.locator('[data-nav-empty]')).toBeVisible();
  await expect(section.locator('[data-nav-item]:visible')).toHaveCount(0);
  await input.fill('');
  await expect(section.locator('[data-nav-empty]')).toBeHidden();
  await expect(section.getByRole('link', { name: /App Icon Generator/ })).toBeVisible();
  await expect(section.getByRole('link', { name: 'All Image Tools' })).toHaveAttribute('href', '/image-tools/');
});
