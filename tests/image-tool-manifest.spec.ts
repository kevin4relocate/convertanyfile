import { expect, test } from '@playwright/test';
import {
  IMAGE_TOOL_MANIFEST,
  IMAGE_TOOL_ROADMAP,
  IMAGE_TOOL_DIRECTORY_SECTIONS,
  imageToolIdsForGroup,
} from '../src/config/image-tools';

test('Image Tools manifest has unique identities, valid runtime metadata and real routes', async ({ request }) => {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const groups = new Set(IMAGE_TOOL_DIRECTORY_SECTIONS.map((section) => section.id));
  const listed = new Map(IMAGE_TOOL_ROADMAP.map((tool) => [tool.id, tool]));

  expect(IMAGE_TOOL_MANIFEST.length).toBeGreaterThanOrEqual(11);
  expect(listed.size).toBe(IMAGE_TOOL_MANIFEST.length);

  for (const entry of IMAGE_TOOL_MANIFEST) {
    const { tool, runtime, directoryGroup, navigationHint, summary } = entry;
    expect(ids.has(tool.id), `duplicate tool ID: ${tool.id}`).toBeFalsy();
    expect(slugs.has(tool.slug), `duplicate slug: ${tool.slug}`).toBeFalsy();
    expect(tool.id).toBe(tool.slug);
    expect(groups.has(directoryGroup), `undefined directory group: ${directoryGroup}`).toBeTruthy();
    expect(runtime.trim()).toBeTruthy();
    expect(navigationHint.length).toBeGreaterThan(2);
    expect(summary.length).toBeGreaterThan(20);
    expect(tool.title.length).toBeGreaterThan(20);
    expect(tool.description.length).toBeGreaterThan(20);
    expect(tool.maxFileBytes).toBeGreaterThan(0);
    expect(tool.maxPixels).toBeGreaterThan(0);
    expect(tool.maxDimension).toBeGreaterThan(0);
    expect(tool.acceptedExtensions.length).toBeGreaterThan(0);

    ids.add(tool.id);
    slugs.add(tool.slug);
    expect(listed.get(tool.id)?.href).toBe(`/${tool.slug}/`);
    expect(listed.get(tool.id)?.status).toBe(tool.status);

    const response = await request.get(`/${tool.slug}/`);
    expect(response.ok(), `${tool.slug} should have a real page`).toBeTruthy();
    const html = await response.text();
    expect(html, `${tool.slug} must mount an implemented tool`).toContain(`data-tool-id="${tool.id}"`);
    expect(html.match(/<title>(.*?)<\\/title>/s)?.[1]?.trim().length).toBeGreaterThan(10);
    if (tool.status === 'preview') expect(html).toMatch(/<meta name="robots" content="noindex/);
  }

  for (const section of IMAGE_TOOL_DIRECTORY_SECTIONS) {
    expect(imageToolIdsForGroup(section.id).length, `empty tool group: ${section.id}`).toBeGreaterThan(0);
  }
});

test('Image Tools directory exposes every released tool and hides preview tools from navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Catalog navigation smoke test');
  await page.goto('/image-tools/');
  for (const entry of IMAGE_TOOL_MANIFEST) {
    const href = `/${entry.tool.slug}/`;
    await expect(page.locator(`.image-tool-grid .image-tool-card-link[href="${href}"]`), href).toHaveCount(1);
    const mainNav = page.locator(`.main-nav .nav-submenu--image-tools a[href="${href}"]`);
    await expect(mainNav).toHaveCount(entry.tool.status === 'live' ? 1 : 0);
  }
});

for (const entry of IMAGE_TOOL_MANIFEST) {
  test(`${entry.tool.id} mounts its registered editor`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'One browser suffices for catalog registration');
    await page.goto(`/${entry.tool.slug}/`);
    const editor = page.locator(`[data-image-tool-app][data-tool-id="${entry.tool.id}"]`);
    await expect(editor).toHaveCount(1);
    await expect(editor).toHaveAttribute('data-image-tool-ready', 'true', { timeout: 60_000 });
  });
}
