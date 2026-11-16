import { expect, test } from '@playwright/test';
import { TOOL_SEO_GUIDES, todayInVietnam } from '../src/content/tool-seo-guides';

test('tool SEO publication dates expose only due articles in the guides directory', async ({ request }) => {
  const html = await (await request.get('/guides/')).text();
  const today = todayInVietnam();
  for (const guide of TOOL_SEO_GUIDES) {
    const path = `/guides/tool/${guide.slug}/`;
    if (guide.publishDate <= today) expect(html, `due article ${guide.slug} not listed`).toContain(path);
    else expect(html, `future article ${guide.slug} must be hidden`).not.toContain(path);
  }
  expect(html).not.toContain('/gemini-ai-logo-remover/');
});

test('published guides contain descriptive image, caption, canonical, schema and tool links', async ({ request }) => {
  const today = todayInVietnam();
  for (const guide of TOOL_SEO_GUIDES) {
    const path=`/guides/tool/${guide.slug}/`;
    const res=await request.get(path);
    if(guide.publishDate > today){expect(res.status(),`future article ${guide.slug} is leaked`).toBe(404);continue;}
    expect(res.ok()).toBeTruthy();
    const html=await res.text();
    expect(html).toContain(`https://convertanyfile.net${path}`);
    expect(html).toContain('datePublished');
    expect(html).toContain('<figcaption');
    expect(html).toContain(guide.image);
    expect(html).toContain(guide.toolHref);
    expect(html).toContain('og:image');
    expect((html.match(/<h1\b/g)||[]).length).toBe(1);
  }
});
