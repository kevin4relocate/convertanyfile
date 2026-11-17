import { expect, test } from '@playwright/test';

test('image tools finder keeps readable dark surfaces and controls', async ({ page }) => {
  await page.goto('/image-tools/');
  const panel = page.locator('.directory-discovery-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Find the right image tool.' })).toBeVisible();
  const colors = await page.evaluate(() => {
    const color = (selector: string, property: 'color' | 'backgroundColor') => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing selector: ${selector}`);
      return getComputedStyle(element)[property];
    };
    return {
      panel: color('.directory-discovery-panel', 'backgroundColor'),
      heading: color('.directory-discovery-heading h2', 'color'),
      search: color('.directory-search-control', 'backgroundColor'),
      input: color('.directory-search-control input', 'color'),
      filter: color('.directory-filter-row button:not(.is-active)', 'backgroundColor'),
    };
  });
  expect(colors.panel).toBe('rgb(18, 26, 40)');
  expect(colors.heading).toBe('rgb(242, 244, 250)');
  expect(colors.search).toBe('rgb(11, 19, 33)');
  expect(colors.input).toBe('rgb(243, 245, 251)');
  expect(colors.filter).toBe('rgb(27, 38, 56)');
  await page.locator('[data-directory-search-input]').fill('resize');
  await expect(page.locator('[data-directory-count]')).toContainText('Showing');
  await page.locator('[data-directory-search-input]').fill('no-such-image-tool-0000000');
  await expect(page.locator('[data-directory-empty]')).toBeVisible();
  await expect(page.locator('.directory-empty-inner')).toHaveCSS('background-color', 'rgb(20, 30, 46)');
});
