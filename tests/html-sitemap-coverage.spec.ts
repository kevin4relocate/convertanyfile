import { expect, test } from '@playwright/test';
import { TEXT_TOOLS } from '../src/config/text-tools';
import { DATA_PROCESSING_TOOLS } from '../src/config/data-processing-tools';

test('HTML sitemap lists all 29 live text and data tools with crawlable links', async ({ request }) => {
  expect(TEXT_TOOLS).toHaveLength(14);
  expect(DATA_PROCESSING_TOOLS).toHaveLength(15);
  const html = await (await request.get('/sitemap/')).text();
  expect(html).toContain('href="/text-tools/"');
  expect(html).toContain('href="/data-tools/"');
  for (const tool of TEXT_TOOLS) {
    expect(html, 'Text tool not linked from HTML sitemap: '+tool.slug).toContain('href="/text/'+tool.slug+'/"');
  }
  for (const tool of DATA_PROCESSING_TOOLS) {
    expect(html, 'Data tool not linked from HTML sitemap: '+tool.id).toContain('href="/data/'+tool.id+'/"');
  }
});

test('sitemap routes are indexable and present in canonical XML sitemap', async ({ request }) => {
  const sitemap = await request.get('/sitemap-0.xml');
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  const samples = [
    '/text-tools/',
    '/data-tools/',
    ...TEXT_TOOLS.map(tool=>'/text/'+tool.slug+'/'),
    ...DATA_PROCESSING_TOOLS.map(tool=>'/data/'+tool.id+'/'),
  ];
  for (const path of samples) {
    const canonical='https://convertanyfile.net'+path;
    expect(xml,'Missing sitemap XML route: '+path).toContain('<loc>'+canonical+'</loc>');
  }
});
