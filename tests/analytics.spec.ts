import { expect, test } from '@playwright/test';

test('local browser tests never initialize Google Analytics', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Analytics host guard regression');

  const analyticsRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('googletagmanager.com') || url.includes('google-analytics.com')) {
      analyticsRequests.push(url);
    }
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  expect(analyticsRequests).toEqual([]);
  expect(
    await page.evaluate(() => ({
      hasDataLayer: Object.prototype.hasOwnProperty.call(window, 'dataLayer'),
      hasGtag: Object.prototype.hasOwnProperty.call(window, 'gtag'),
    })),
  ).toEqual({ hasDataLayer: false, hasGtag: false });
});
