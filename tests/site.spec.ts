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
});

test('publish-quality content pages use the shared 1080px grid with readable article columns', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop content regression');
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const path of ['/about/', '/guides/jpg-vs-png/', '/privacy/', '/terms/']) {
    await page.goto(path);
    const hero = page.locator('.page-hero .site-container');
    const grid = page.locator('.content-article-grid');
    const article = page.locator('.content-article');
    const heroBox = await hero.boundingBox();
    const gridBox = await grid.boundingBox();
    const articleBox = await article.boundingBox();
    expect(heroBox, `${path} hero should exist`).not.toBeNull();
    expect(gridBox, `${path} content grid should exist`).not.toBeNull();
    expect(articleBox, `${path} article should exist`).not.toBeNull();
    expect(Math.round(heroBox!.width)).toBe(1080);
    expect(Math.round(gridBox!.width)).toBe(1080);
    expect(articleBox!.width).toBeGreaterThan(700);
    expect(articleBox!.width).toBeLessThan(780);
    expect(await article.locator('h2').count()).toBeGreaterThanOrEqual(4);
    expect((await article.innerText()).length).toBeGreaterThan(1100);
  }

  await page.goto('/guides/jpg-vs-png/');
  await expect(page.getByText('On this page', { exact: true })).toBeVisible();
  await expect(page.locator('.comparison-table')).toBeVisible();
  await expect(page.getByText('Quick answer', { exact: true })).toBeVisible();

  await page.goto('/heic-to-jpg/');
  await expect(page.locator('.content-article-grid')).toBeVisible();
  await expect(page.locator('.comparison-table')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Understand the source and the output' })).toBeVisible();
});

test('desktop article right navigation stays visible after deep anchor jumps', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop sticky-navigation regression');
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const path of ['/guides/webp-vs-avif/', '/guides/jpg-vs-png/']) {
    await page.goto(path);
    const tocLinks = page.locator('.toc-card a');
    const count = await tocLinks.count();
    expect(count, `${path} should expose article navigation`).toBeGreaterThanOrEqual(4);

    const deepLink = tocLinks.nth(3);
    const href = await deepLink.getAttribute('href');
    expect(href, `${path} deep navigation link should have an anchor`).toMatch(/^#/);
    await deepLink.click();

    await page.waitForFunction((selector) => {
      const target = document.querySelector(selector);
      if (!target) return false;
      const top = target.getBoundingClientRect().top;
      return top >= 70 && top <= 130;
    }, href!);

    const sticky = page.locator('.content-aside-sticky');
    await expect(sticky).toBeVisible();
    await expect(page.getByText('On this page', { exact: true })).toBeVisible();
    const stickyBox = await sticky.boundingBox();
    expect(stickyBox, `${path} sticky navigation should remain in the viewport`).not.toBeNull();
    expect(stickyBox!.y).toBeGreaterThanOrEqual(86);
    expect(stickyBox!.y).toBeLessThanOrEqual(90);
    expect(stickyBox!.y + stickyBox!.height).toBeLessThanOrEqual(900);
  }
});

test('wide content hubs use the 1080px grid and meaningful internal navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Desktop content regression');
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ['/formats/', '/faq/', '/guides/', '/image-converter/']) {
    await page.goto(path);
    const container = page.locator('.content-wide-section .site-container').first();
    const box = await container.boundingBox();
    expect(box, `${path} wide content container should exist`).not.toBeNull();
    expect(Math.round(box!.width)).toBe(1080);
  }
  await page.goto('/formats/');
  await expect(page.locator('.comparison-table')).toBeVisible();
  await expect(page.getByRole('link', { name: /JPG vs PNG guide/i })).toBeVisible();
});

test('mobile shell remains usable without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile layout regression');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Convert files fast/i })).toBeVisible();
  let dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.getByText('Choose files', { exact: true })).toBeVisible();

  await page.goto('/guides/jpg-vs-png/');
  dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.locator('.content-article')).toBeVisible();
});
