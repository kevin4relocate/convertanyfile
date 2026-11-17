import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuides, publicationPlan, vietnamDate } from '../scripts/seo-publication-plan.mjs';
import { verifiesGuideHtml, extractSitemapUrls, isGuideInSitemap } from '../scripts/verify-live-seo-publication.mjs';

const catalog = await loadGuides();

test('all 90 scheduled SEO guides have an increasing unique publication day', () => {
  const first = publicationPlan('2026-11-17', catalog);
  const last = publicationPlan('2027-02-14', catalog);
  assert.equal(catalog.length, 90);
  assert.equal(first.total, 90);
  assert.equal(first.due, true);
  assert.equal(first.slug, 'format-json-without-changing-data');
  assert.equal(first.first, '2026-11-17');
  assert.equal(last.last, '2027-02-14');
  assert.equal(last.due, true);
  assert.equal(last.slug, 'guide-zip-to-tar-workflow');
  assert.match(first.canonical, /^https:\/\/convertanyfile.net\/guides\/tool\/.+\/$/);
});

test('no build is needed before/after the 90-day calendar', () => {
  assert.equal(publicationPlan('2026-11-16', catalog).due, false);
  assert.equal(publicationPlan('2027-02-15', catalog).due, false);
});

test('there is exactly one article per scheduled day including month boundaries', () => {
  for (const date of ['2026-11-30','2026-12-01','2026-12-31','2027-01-01','2027-01-31','2027-02-01']) {
    assert.equal(publicationPlan(date, catalog).due, true, date);
    assert.equal(catalog.filter(g => g.publishDate === date).length, 1, date);
  }
});

test('Vietnam-local day is correctly derived from UTC even across midnight', () => {
  assert.equal(vietnamDate(new Date('2026-11-16T16:59:59Z')), '2026-11-16');
  assert.equal(vietnamDate(new Date('2026-11-16T17:00:00Z')), '2026-11-17');
  assert.equal(vietnamDate(new Date('2026-12-31T17:30:00Z')), '2027-01-01');
});

test('impossible calendar dates are refused, not silently normalized', () => {
  for (const date of ['2026-02-30','2026-13-01','2026-2-3','invalid']) {
    assert.throws(() => publicationPlan(date, catalog), /calendar date/);
  }
});

test('production verifier requires canonical, heading and publication metadata', () => {
  const plan=publicationPlan('2026-11-17',catalog);
  const html='<html><head><link rel="canonical" href="'+plan.canonical+'"></head>' +
    '<body><h1>Formatting JSON</h1><time datetime="'+plan.date+'">Date</time>' +
    '<script type="application/ld+json">{"datePublished":"'+plan.date+'"}</script></body></html>';
  assert.equal(verifiesGuideHtml(html,plan),true);
  assert.equal(verifiesGuideHtml(html.replace(plan.canonical,'https://other.example/'),plan),false);
  assert.equal(verifiesGuideHtml(html.replace('datePublished','dateModified'),plan),false);
});

test('XML sitemap check requires the exact canonical, not a matching substring', () => {
  const plan=publicationPlan('2026-11-17',catalog);
  const sitemap='<urlset><url><loc>'+plan.canonical+'</loc></url></urlset>';
  assert.deepEqual(extractSitemapUrls(sitemap),[plan.canonical]);
  assert.equal(isGuideInSitemap(sitemap,plan),true);
  assert.equal(isGuideInSitemap('<urlset><url><loc>'+plan.canonical+'extra</loc></url></urlset>',plan),false);
});
