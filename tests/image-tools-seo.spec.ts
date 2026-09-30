import { expect, test } from '@playwright/test';

const routes = [
  { path: '/image-tools/', title: /Image Tools/i, h1: /image tools/i },
  { path: '/resize-image/', title: /Resize Images/i, h1: /Resize images/i },
  { path: '/compress-image/', title: /Compress Images/i, h1: /Compress images/i },
  { path: '/rotate-flip-image/', title: /Rotate|Flip/i, h1: /Rotate|flip/i },
  { path: '/crop-image/', title: /Crop Images/i, h1: /Crop images/i },
  { path: '/blur-image/', title: /Blur Image/i, h1: /Blur images/i },
  { path: '/bulk-rename-images/', title: /Bulk Rename Images/i, h1: /Bulk rename/i },
  { path: '/remove-image-metadata/', title: /Remove Image Metadata/i, h1: /metadata/i },
  { path: '/remove-watermark/', title: /Watermark Remover/i, h1: /watermarks/i },
  { path: '/gemini-ai-logo-remover/', title: /Gemini Watermark Remover/i, h1: /Gemini watermark/i },
] as const;

const hiddenExperimentalRoutes = ['/remove-object/', '/remove-background/'] as const;

test.describe('Image Tools SEO', () => {
  test('all public image tool routes have unique titles and meta descriptions', async ({ page }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();

    for (const route of routes) {
      await page.goto(route.path);
      const title = await page.title();
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(title).toMatch(route.title);
      expect(title.length).toBeGreaterThan(20);
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(70);
      expect(titles.has(title)).toBeFalsy();
      expect(descriptions.has(description!)).toBeFalsy();
      titles.add(title);
      descriptions.add(description!);
    }
  });

  for (const route of routes) {
    test(`${route.path} is indexable with canonical and one clear H1`, async ({ page }) => {
      await page.goto(route.path);
      const expectedCanonical = `https://convertanyfile.net${route.path}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', expectedCanonical);
      await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/i);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText(route.h1);
    });
  }

  test('core Image Tools contain useful how-to, FAQ and related internal links', async ({ page }) => {
    for (const path of ['/resize-image/','/compress-image/','/crop-image/','/remove-image-metadata/']) {
      await page.goto(path);
      await expect(page.locator('.steps-grid .step-card')).toHaveCount(4);
      expect(await page.locator('.faq-list details').count()).toBeGreaterThanOrEqual(4);
      expect(await page.locator('.image-tool-grid a[href]').count()).toBeGreaterThanOrEqual(3);
    }
  });

  test('Image Tools hub exposes collection and item-list structured data', async ({ page }) => {
    await page.goto('/image-tools/');
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(jsonLd.some((value) => value.includes('CollectionPage'))).toBeTruthy();
    expect(jsonLd.some((value) => value.includes('ItemList'))).toBeTruthy();
  });

  test('experimental heavy tools are not linked from public Image Tools surfaces', async ({ page }) => {
    for (const path of ['/','/image-tools/']) {
      await page.goto(path);
      for (const hiddenPath of hiddenExperimentalRoutes) {
        await expect(page.locator(`a[href="${hiddenPath}"]`)).toHaveCount(0);
      }
    }
  });
});
