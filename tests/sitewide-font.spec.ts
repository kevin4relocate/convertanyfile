import { expect, test } from '@playwright/test';

const pages = ['/', '/text/uuid-generator/', '/data-tools/', '/image-tools/', '/format-converters/'];

for (const route of pages) {
  test(`sitewide font is consistent on ${route}`, async ({ page }) => {
    await page.goto(route);
    const fonts = await page.locator('body').evaluate((body) => {
      const elements = [body, ...Array.from(body.querySelectorAll(
        'h1, h2, h3, p, a, button, input, select, textarea, label, summary, .brand'
      ))].filter((el) => el.getClientRects().length > 0);
      return [...new Set(elements.map((el) => getComputedStyle(el).fontFamily))];
    });
    expect(fonts).toEqual(['system-ui']);
  });
}

test('UUID tool buttons and count selector share the page font', async ({ page }) => {
  await page.goto('/text/uuid-generator/');
  const fonts = await page.locator('body').evaluate((body) => {
    const selectors = ['h1', 'button', 'select', 'textarea', '.main-nav'];
    return selectors.map((selector) => {
      const element = body.querySelector(selector);
      return element ? getComputedStyle(element).fontFamily : null;
    }).filter(Boolean);
  });
  expect(fonts.length).toBeGreaterThan(2);
  expect(new Set(fonts).size).toBe(1);
});
