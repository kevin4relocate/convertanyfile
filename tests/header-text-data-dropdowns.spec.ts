import { expect, test } from '@playwright/test';
import { TEXT_TOOLS } from '../src/config/text-tools';
import { DATA_PROCESSING_TOOLS } from '../src/config/data-processing-tools';

test('header includes every live text and data utility without inventing paths', async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  const header = html.slice(html.indexOf('<header class="site-header"'), html.indexOf('</header>'));
  expect(header).toContain('All Text Tools');
  expect(header).toContain('All Data Tools');
  for (const tool of TEXT_TOOLS) expect(header).toContain(`href="/text/${tool.slug}/"`);
  for (const tool of DATA_PROCESSING_TOOLS) expect(header).toContain(`href="/data/${tool.id}/"`);
  expect(header).not.toContain('gemini-ai-logo-remover');
});

test('desktop dropdowns open with accessible summaries and navigate to tool pages', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Desktop hover navigation has a mobile accordion equivalent');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const textSection = nav.locator('details.nav-dropdown').filter({ has: page.locator('summary').filter({ hasText: 'Text Tools' }) });
  const dataSection = nav.locator('details.nav-dropdown').filter({ has: page.locator('summary').filter({ hasText: 'Data Tools' }) });
  await textSection.locator('summary').click();
  await expect(textSection).toHaveAttribute('open', '');
  await expect(textSection.getByRole('link', { name: /JSON Formatter/ })).toBeVisible();
  await dataSection.locator('summary').click();
  await expect(textSection).not.toHaveAttribute('open', '');
  await expect(dataSection.getByRole('link', { name: /JSON Schema Validator/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dataSection).not.toHaveAttribute('open', '');
});

test('mobile menu provides separate expandable Text and Data sections', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile accordion test');
  await page.goto('/');
  // Dismiss the consent overlay as a real visitor would, so it cannot cover menu rows.
  const rejectAnalytics = page.locator('[data-analytics-reject]');
  if (await rejectAnalytics.isVisible()) await rejectAnalytics.click();
  const menu = page.locator('details.mobile-nav');
  await menu.locator(':scope > summary').click();
  const textSection = menu.locator('details.mobile-menu-section').filter({ has: page.locator('summary').filter({ hasText: 'Text Tools' }) });
  const dataSection = menu.locator('details.mobile-menu-section').filter({ has: page.locator('summary').filter({ hasText: 'Data Tools' }) });
  await textSection.locator('summary').click();
  await expect(textSection.getByRole('link', { name: 'JSON Formatter' })).toBeVisible();
  await dataSection.locator('summary').click();
  await expect(textSection).not.toHaveAttribute('open', '');
  await expect(dataSection.getByRole('link', { name: 'CSV Row Sorter' })).toBeVisible();
});
