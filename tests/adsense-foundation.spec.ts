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
  await expect(page.locator('script[src*="pagead2.googlesyndication.com"]')).toHaveCount(0);
});

test('CSP is prepared for AdSense but no publisher ID is deployed', async ({ request }) => {
  const [index, contact, privacy] = await Promise.all([
    request.get('/'), request.get('/contact/'), request.get('/privacy/'),
  ]);
  expect(index.status()).toBe(200);
  expect(contact.status()).toBe(200);
  expect(privacy.status()).toBe(200);
  const html = await index.text();
  expect(html).not.toMatch(/ca-pub-\d{16}/);
  expect(html).toContain('convertanyfile-analytics-consent-v1');
  expect(await privacy.text()).toContain('Advertising is not currently active');
});
