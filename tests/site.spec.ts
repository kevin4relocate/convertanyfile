import { expect, test } from '@playwright/test';

const STATIC_ROUTES = [
  '/',
  '/image-converter/',
  '/heic-to-jpg/',
  '/webp-to-png/',
  '/png-to-webp/',
  '/avif-to-jpg/',
  '/formats/',
  '/faq/',
  '/guides/',
  '/guides/jpg-vs-png/',
  '/about/',
  '/privacy/',
  '/terms/',
  '/robots.txt',
  '/sitemap-index.xml',
];

test('shared site shell and static SEO routes are healthy', async ({ page, request }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Convert files fast/i })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ConvertAnyFile home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Formats' }).first()).toBeVisible();
  await expect(page.locator('footer')).toContainText('ConvertAnyFile');
  await expect(page.locator('footer')).toContainText('Privacy');
  await expect(page.locator('footer')).toContainText('Terms');

  for (const path of STATIC_ROUTES) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should return 2xx`).toBeTruthy();
  }

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('https://convertanyfile.net/sitemap-index.xml');

  const sitemap = await (await request.get('/sitemap-index.xml')).text();
  expect(sitemap).toContain('convertanyfile.net');
});

test('desktop converter is actionable above the fold and content uses 1080px grid', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop layout regression');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const choose = page.getByText('Choose files', { exact: true });
  await expect(choose).toBeVisible();
  const chooseBox = await choose.boundingBox();
  expect(chooseBox).not.toBeNull();
  expect(chooseBox!.y + chooseBox!.height).toBeLessThanOrEqual(900);

  await page.goto('/about/');
  const content = page.locator('.page-hero .site-container');
  const box = await content.boundingBox();
  expect(box).not.toBeNull();
  expect(Math.round(box!.width)).toBe(1080);
});

test('mobile shell remains usable without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile layout regression');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Convert files fast/i })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.getByText('Choose files', { exact: true })).toBeVisible();
});
