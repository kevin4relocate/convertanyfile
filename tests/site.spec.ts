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

const extractLocs = (xml: string): string[] => Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) => match[1]!).filter(Boolean);
const localPath = (absoluteUrl: string): string => {
  const url = new URL(absoluteUrl);
  return `${url.pathname}${url.search}`;
};

function extractInternalLinks(html: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*\bhref=(['"])(.*?)\1/gi)) {
    const href = match[2];
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    const url = new URL(href, 'https://convertanyfile.net');
    if (url.origin !== 'https://convertanyfile.net') continue;
    links.add(`${url.pathname}${url.search}`);
  }
  return [...links];
}

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

test('generated sitemap pages keep valid canonicals, unique titles, descriptions, and internal links', async ({ request }) => {
  const indexResponse = await request.get('/sitemap-index.xml');
  expect(indexResponse.ok()).toBeTruthy();
  const sitemapUrls = extractLocs(await indexResponse.text());
  expect(sitemapUrls.length).toBeGreaterThan(0);

  const pagePaths = new Set<string>();
  for (const sitemapUrl of sitemapUrls) {
    const response = await request.get(localPath(sitemapUrl));
    expect(response.ok(), `${sitemapUrl} should return 2xx`).toBeTruthy();
    for (const pageUrl of extractLocs(await response.text())) pagePaths.add(localPath(pageUrl));
  }
  expect(pagePaths.size).toBeGreaterThan(10);

  const titles = new Set<string>();
  const internalLinks = new Set<string>();
  for (const path of pagePaths) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should return 2xx`).toBeTruthy();
    const html = await response.text();

    const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
    expect(canonical, `${path} should expose a canonical URL`).toBe(new URL(path, 'https://convertanyfile.net').toString());

    const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim();
    expect(title, `${path} should have a title`).toBeTruthy();
    expect(titles.has(title!), `Duplicate title: ${title}`).toBeFalsy();
    titles.add(title!);

    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]?.trim();
    expect(description, `${path} should have a meta description`).toBeTruthy();

    for (const link of extractInternalLinks(html)) internalLinks.add(link);
  }

  for (const link of internalLinks) {
    const response = await request.get(link);
    expect(response.ok(), `Internal link ${link} should return 2xx`).toBeTruthy();
  }
});

test('desktop homepage keeps hero compact, drop zone above fold, and Converters anchor at the section heading', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop layout regression');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  const heroTitle = page.locator('.hero h1');
  const converter = page.locator('.hero-converter .converter-card');
  const dropZone = page.locator('.hero-converter [data-role="drop-zone"]');
  const choose = page.getByText('Choose files', { exact: true });
  const privacyHint = page.getByText('Files stay on your device during conversion', { exact: true });

  await expect(heroTitle).toHaveText('Convert files fast. Keep them private.');
  const heroTitleBox = await heroTitle.boundingBox();
  expect(heroTitleBox).not.toBeNull();
  expect(heroTitleBox!.height).toBeLessThan(70);

  await expect(converter).toBeVisible();
  await expect(dropZone).toBeVisible();
  await expect(choose).toBeVisible();
  await expect(privacyHint).toBeVisible();

  const converterBox = await converter.boundingBox();
  const dropBox = await dropZone.boundingBox();
  expect(converterBox).not.toBeNull();
  expect(dropBox).not.toBeNull();
  expect(converterBox!.y).toBeLessThan(400);
  expect(dropBox!.y + dropBox!.height).toBeLessThanOrEqual(900);

  await page.getByRole('link', { name: 'Converters', exact: true }).click();
  await expect(page).toHaveURL(/#converters$/);
  await page.waitForFunction(() => {
    const section = document.querySelector('#converters');
    if (!section) return false;
    const top = section.getBoundingClientRect().top;
    return top >= 64 && top <= 100;
  });
  await expect(page.getByRole('heading', { name: 'One interface. Multiple file categories.' })).toBeVisible();

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
