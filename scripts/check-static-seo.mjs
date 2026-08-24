import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url);
const ORIGIN = 'https://convertanyfile.net';
const HIDDEN_TOOL_PATHS = ['/remove-object/', '/remove-background/'];

async function walk(dir, predicate) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full, predicate));
    else if (predicate(full)) files.push(full);
  }
  return files;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? '';
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function metaContent(html, key, value) {
  const tag = tags(html, 'meta').find((candidate) => attr(candidate, key).toLowerCase() === value.toLowerCase());
  return tag ? attr(tag, 'content') : '';
}

function canonicalHref(html) {
  const tag = tags(html, 'link').find((candidate) => attr(candidate, 'rel').toLowerCase().split(/\s+/).includes('canonical'));
  return tag ? attr(tag, 'href') : '';
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function titleText(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  return decodeHtml((match?.[1] ?? '').replace(/<[^>]+>/g, '').trim());
}

function routeFor(file, distPath) {
  const rel = relative(distPath, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function fail(errors, route, message) {
  errors.push(`${route}: ${message}`);
}

const distPath = DIST.pathname;
const htmlFiles = await walk(distPath, (file) => file.endsWith('.html'));
if (!htmlFiles.length) throw new Error('SEO audit found no built HTML files in dist/.');

const errors = [];
const indexablePages = [];
const titleOwners = new Map();
const descriptionOwners = new Map();

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const route = routeFor(file, distPath);
  const title = titleText(html);
  const description = decodeHtml(metaContent(html, 'name', 'description')).trim();
  const robots = metaContent(html, 'name', 'robots').toLowerCase();
  const canonical = canonicalHref(html);
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const noindex = robots.includes('noindex');

  if (title.length < 10 || title.length > 120) fail(errors, route, `title length is ${title.length}; expected 10–120 characters`);
  if (description.length < 20 || description.length > 240) fail(errors, route, `meta description length is ${description.length}; expected 20–240 characters`);
  if (!canonical) fail(errors, route, 'missing canonical link');
  if (!robots) fail(errors, route, 'missing robots meta tag');
  if (h1Count !== 1) fail(errors, route, `expected exactly one H1, found ${h1Count}`);

  if (!noindex) {
    const expectedCanonical = `${ORIGIN}${route}`;
    if (canonical !== expectedCanonical) fail(errors, route, `canonical is ${canonical || '(missing)'}, expected ${expectedCanonical}`);
    if (!robots.includes('index')) fail(errors, route, `indexable page robots value is ${robots || '(missing)'}`);

    const ogTitle = metaContent(html, 'property', 'og:title');
    const ogDescription = metaContent(html, 'property', 'og:description');
    const ogUrl = metaContent(html, 'property', 'og:url');
    const twitterCard = metaContent(html, 'name', 'twitter:card');
    if (!ogTitle || !ogDescription || !ogUrl) fail(errors, route, 'missing Open Graph title, description or URL');
    if (ogUrl && ogUrl !== canonical) fail(errors, route, `og:url does not match canonical (${ogUrl} vs ${canonical})`);
    if (!twitterCard) fail(errors, route, 'missing Twitter card metadata');

    if (titleOwners.has(title)) fail(errors, route, `duplicate title also used by ${titleOwners.get(title)}`);
    else titleOwners.set(title, route);
    if (descriptionOwners.has(description)) fail(errors, route, `duplicate meta description also used by ${descriptionOwners.get(description)}`);
    else descriptionOwners.set(description, route);

    indexablePages.push({ route, canonical });
  }

  for (const hiddenPath of HIDDEN_TOOL_PATHS) {
    if (html.includes(`href="${hiddenPath}"`) || html.includes(`href='${hiddenPath}'`)) {
      fail(errors, route, `contains a public link to hidden experimental tool ${hiddenPath}`);
    }
  }
}

const sitemapFiles = await walk(distPath, (file) => /sitemap.*\.xml$/i.test(file));
if (!sitemapFiles.length) {
  errors.push('sitemap: no sitemap XML generated');
} else {
  const sitemapText = (await Promise.all(sitemapFiles.map((file) => readFile(file, 'utf8')))).join('\n');
  for (const page of indexablePages) {
    if (!sitemapText.includes(`<loc>${page.canonical}</loc>`)) {
      errors.push(`sitemap: missing indexable canonical ${page.canonical}`);
    }
  }
  for (const hiddenPath of HIDDEN_TOOL_PATHS) {
    if (sitemapText.includes(`${ORIGIN}${hiddenPath}`)) errors.push(`sitemap: hidden experimental tool is still indexed: ${ORIGIN}${hiddenPath}`);
  }
}

const robots = await readFile(join(distPath, 'robots.txt'), 'utf8').catch(() => '');
if (!robots.includes(`Sitemap: ${ORIGIN}/sitemap-index.xml`)) errors.push('robots.txt: missing canonical sitemap declaration');

if (errors.length) {
  console.error(`Static SEO audit failed with ${errors.length} issue${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`Static SEO audit passed for ${htmlFiles.length} HTML pages (${indexablePages.length} indexable).`);
