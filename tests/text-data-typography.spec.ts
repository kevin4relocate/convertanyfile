import { expect, test } from '@playwright/test';

test('Text and Data tool pages use matching heading typography', async ({ page }) => {
  const styles = [];
  for (const route of ['/text/uuid-generator/', '/data/jsonpath-tester/']) {
    await page.goto(route);
    const typography = await page.locator('.converter-page-hero h1').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        letterSpacing: style.letterSpacing,
      };
    });
    styles.push(typography);
  }
  expect(styles).toHaveLength(2);
  const [textHeading, dataHeading] = styles;
  expect(textHeading).toBeDefined();
  expect(dataHeading).toBeDefined();
  expect(textHeading!).toEqual(dataHeading);
  expect(textHeading!.fontWeight).toBe('700');
});

test('Text tool buttons and selector match Data tool action typography', async ({ page }) => {
  await page.goto('/data/jsonpath-tester/');
  const reference = await page.locator('.data-workbench-actions button').first().evaluate((el) => {
    const style = getComputedStyle(el);
    return { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
  });
  await page.goto('/text/uuid-generator/');
  const controls = await page.locator('.text-tool-controls button, .text-tool-controls select').evaluateAll((els) => els.map((el) => {
    const style = getComputedStyle(el);
    return { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
  }));
  expect(controls.length).toBeGreaterThan(1);
  for (const style of controls) expect(style).toEqual(reference);
});
