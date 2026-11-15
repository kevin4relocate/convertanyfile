import { expect, test } from '@playwright/test';

test('contact page and permanent privacy controls are discoverable', async ({ page, request }) => {
  const contact = await request.get('/contact/');
  expect(contact.status()).toBe(200);
  await page.goto('/contact/');
  await expect(page.getByRole('heading', { name: 'Help us improve ConvertAnyFile.' })).toBeVisible();
  await expect(page.locator('footer a[href="/contact/"]')).toBeVisible();
  await expect(page.locator('footer [data-open-privacy-preferences]')).toBeVisible();
  await expect(page.locator('[data-privacy-preferences]')).toBeVisible();
  await page.locator('[data-analytics-reject]').click();
  await expect(page.locator('[data-privacy-preferences]')).toBeHidden();
  await page.locator('[data-open-privacy-preferences]').click();
  await expect(page.locator('[data-privacy-preferences]')).toBeVisible();
  await expect(page.locator('[data-privacy-close]')).toBeVisible();
  await page.locator('[data-privacy-close]').click();
  await expect(page.locator('[data-privacy-preferences]')).toBeHidden();
});

test('consent defaults to no analytics, and rejection remains after reload', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', req => {
    if (/googletagmanager\.com|google-analytics\.com/.test(req.url())) googleRequests.push(req.url());
  });
  await page.goto('/');
  await expect(page.locator('[data-privacy-preferences]')).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('convertanyfile-analytics-consent-v1'))).toBeNull();
  await page.locator('[data-analytics-reject]').click();
  await page.reload();
  await expect(page.locator('[data-privacy-preferences]')).toBeHidden();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('convertanyfile-analytics-consent-v1'))).toBe('denied');
  expect(googleRequests).toEqual([]);
});

test('user can opt in and revoke consent without enabling ads', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-analytics-accept]').click();
  expect(await page.evaluate(() => window.localStorage.getItem('convertanyfile-analytics-consent-v1'))).toBe('granted');
  await page.reload();
  await expect(page.locator('[data-privacy-preferences]')).toBeHidden();
  await page.locator('[data-open-privacy-preferences]').click();
  await page.locator('[data-analytics-reject]').click();
  expect(await page.evaluate(() => window.localStorage.getItem('convertanyfile-analytics-consent-v1'))).toBe('denied');
  await page.reload();
  await expect(page.locator('[data-privacy-preferences]')).toBeHidden();
  await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  // A site-verification snippet exists, but no ad slots or requests are enabled.
  await expect(page.locator('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')).toHaveCount(1);
  const headHtml = await page.locator('head').innerHTML();
  expect(headHtml).toContain('pauseAdRequests = 1');
  expect(headHtml.indexOf('pauseAdRequests = 1')).toBeLessThan(headHtml.indexOf('adsbygoogle.js?client=ca-pub-4046271575630296'));
});

test('AdSense account is verifiable while ad requests remain paused', async ({ request }) => {
  const [index, contact, privacy, adsTxt] = await Promise.all([
    request.get('/'), request.get('/contact/'), request.get('/privacy/'), request.get('/ads.txt'),
  ]);
  expect(index.status()).toBe(200);
  expect(contact.status()).toBe(200);
  expect(privacy.status()).toBe(200);
  expect(adsTxt.status()).toBe(200);
  expect((await adsTxt.text()).trim()).toBe('google.com, pub-4046271575630296, DIRECT, f08c47fec0942fa0');
  const html = await index.text();
  expect(html).toContain('<meta name="google-adsense-account" content="ca-pub-4046271575630296"');
  expect(html).toContain('pagead/js/adsbygoogle.js?client=ca-pub-4046271575630296');
  expect(html).toContain('crossorigin="anonymous"');
  expect(html.indexOf('pauseAdRequests = 1')).toBeLessThan(html.indexOf('adsbygoogle.js?client=ca-pub-4046271575630296'));
  expect(html).not.toContain('data-ad-slot=');
  expect(html).toContain('convertanyfile-analytics-consent-v1');
  expect(await privacy.text()).toContain('All AdSense ad requests are paused');
});
