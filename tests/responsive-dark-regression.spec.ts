import { expect, test } from '@playwright/test';

function rgbLightness(value: string): number {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return 255;
  return (Number(match[1]) + Number(match[2]) + Number(match[3])) / 3;
}

test('homepage category switcher stays dark instead of reverting to a white scoped surface', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Dark switcher regression');
  await page.goto('/');

  const colors = await page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('.home-converter-category-bar')!;
    const tabs = document.querySelector<HTMLElement>('.home-converter-tabs')!;
    const active = document.querySelector<HTMLElement>('.home-converter-tab.is-active')!;
    return {
      bar: getComputedStyle(bar).backgroundColor,
      tabs: getComputedStyle(tabs).backgroundColor,
      active: getComputedStyle(active).backgroundColor,
    };
  });

  expect(rgbLightness(colors.bar)).toBeLessThan(90);
  expect(rgbLightness(colors.tabs)).toBeLessThan(90);
  expect(rgbLightness(colors.active)).toBeLessThan(110);
});

test('FAQ is one full-width column at tablet and phone widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Responsive FAQ breakpoint regression');

  for (const width of [820, 480]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/faq/');

    const faq = page.locator('.faq-block').first();
    await expect(faq).toBeVisible();

    const layout = await faq.evaluate((element) => {
      const heading = element.querySelector<HTMLElement>(':scope > .section-heading')!;
      const list = element.querySelector<HTMLElement>('.faq-list')!;
      const faqBox = element.getBoundingClientRect();
      const headingBox = heading.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      return {
        display: getComputedStyle(element).display,
        columns: getComputedStyle(element).gridTemplateColumns,
        headingPosition: getComputedStyle(heading).position,
        faqWidth: faqBox.width,
        headingWidth: headingBox.width,
        listWidth: listBox.width,
        listTop: listBox.top,
        headingBottom: headingBox.bottom,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });

    expect(layout.headingPosition).toBe('static');
    expect(layout.headingWidth).toBeGreaterThan(layout.faqWidth * 0.9);
    expect(layout.listWidth).toBeGreaterThan(layout.faqWidth * 0.9);
    expect(layout.listTop).toBeGreaterThanOrEqual(layout.headingBottom);
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    if (width > 680) expect(layout.columns.split(' ').length).toBe(1);
    if (width <= 680) expect(layout.display).toBe('block');
  }
});
