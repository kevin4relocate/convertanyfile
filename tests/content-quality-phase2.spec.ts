import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { TEXT_TOOLS } from '../src/config/text-tools';
import { DATA_PROCESSING_TOOLS } from '../src/config/data-processing-tools';
import { TEXT_TOOL_EXAMPLES, DATA_TOOL_EXAMPLES } from '../src/content/tool-worked-examples';
import { IMAGE_FORMAT_WORKFLOWS } from '../src/content/format-workflows';

test('every live Text and Data tool has a distinct, crawlable worked example', async ({ request }) => {
  test.setTimeout(120_000);
  expect(Object.keys(TEXT_TOOL_EXAMPLES).sort()).toEqual(TEXT_TOOLS.map(tool => tool.id).sort());
  expect(Object.keys(DATA_TOOL_EXAMPLES).sort()).toEqual(DATA_PROCESSING_TOOLS.map(tool => tool.id).sort());

  const routes = [
    ...TEXT_TOOLS.map(tool => ({ path: '/text/' + tool.slug + '/', example: TEXT_TOOL_EXAMPLES[tool.id] })),
    ...DATA_PROCESSING_TOOLS.map(tool => ({ path: '/data/' + tool.id + '/', example: DATA_TOOL_EXAMPLES[tool.id] })),
  ];
  for (const route of routes) {
    const example = route.example;
    if (!example) throw new Error('Missing editorial example for ' + route.path);
    const res = await request.get(route.path);
    expect(res.status(), route.path).toBe(200);
    const html = await res.text();
    expect(html, route.path).toContain('<link rel="canonical" href="https://convertanyfile.net' + route.path + '"');
    expect(html, route.path).toContain('<meta name="robots" content="index,follow');
    expect(html, route.path).toContain('id="worked-example"');
    expect(html, route.path).toContain('Practical walkthrough');
    expect(html, route.path).toContain('Expected behavior');
    expect(html, route.path).toContain(example.title);
    expect(html, route.path).toContain('href="' + example.relatedHref + '"');
    expect((html.match(/<h1\b/g) ?? []).length, route.path).toBe(1);
    expect((html.match(/id="worked-example"/g) ?? []).length, route.path).toBe(1);
  }
});

test('curated tool examples are explanatory rather than repeated generic SEO text', () => {
  const examples = [...Object.values(TEXT_TOOL_EXAMPLES), ...Object.values(DATA_TOOL_EXAMPLES)];
  expect(examples).toHaveLength(29);
  const uniqueTitles = new Set(examples.map(x => x.title));
  const uniqueScenarios = new Set(examples.map(x => x.scenario));
  expect(uniqueTitles.size).toBe(examples.length);
  expect(uniqueScenarios.size).toBe(examples.length);
  for (const example of examples) {
    expect(example.scenario.length).toBeGreaterThan(45);
    expect(example.expected.length).toBeGreaterThan(40);
    expect(example.caution.length).toBeGreaterThan(35);
    expect(example.input.length).toBeGreaterThan(0);
    expect(example.relatedHref).toMatch(/^\/[a-z0-9/-]+\/$/);
  }
});

test('priority image conversions show different workflow-specific decisions', async ({ request }) => {
  test.setTimeout(90_000);
  const entries = Object.entries(IMAGE_FORMAT_WORKFLOWS);
  expect(entries.length).toBe(6);
  for (const [slug, workflow] of entries) {
    const path = '/' + slug + '/';
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    const html = await res.text();
    expect(html, path).toContain('id="real-world-example"');
    expect(html, path).toContain(workflow.heading);
    expect(html, path).toContain('When to keep the original format');
    expect(html, path).toContain('id="preflight"');
    expect((html.match(/id="real-world-example"/g) ?? []).length, path).toBe(1);
  }
});

test('new editorial examples do not change a running conversion flow', async ({ page }) => {
  await page.goto('/text/json-formatter/');
  await expect(page.getByRole('heading', { name: 'Make an API response readable' })).toBeVisible();
  await page.locator('[data-tool-run]').click();
  await expect(page.locator('[data-tool-output]')).not.toHaveValue('');
  await page.goto('/data/csv-duplicate-remover/');
  await expect(page.getByRole('heading', { name: 'Keep the first copy of repeated export rows' })).toBeVisible();
  await page.locator('[data-data-run]').click();
  await expect(page.locator('[data-data-output]')).not.toHaveValue('');
});

test('format pair template prints the decision paragraph once, not in two sections', async () => {
  const template = await readFile('src/pages/[slug].astro', 'utf8');
  expect(template.match(/<p>\{content\?\.when\}<\/p>/g)).toHaveLength(1);
  expect(template).toContain('id="preflight"');
  expect(template).toContain('formatWorkflow &&');
});
