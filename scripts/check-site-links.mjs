/**
 * Build-time internal link audit for SSR-less Astro pages.
 *
 * Checks real <a href> navigation instead of relying on artificial
 * keyword-density or word-count requirements.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const ORIGIN = 'https://convertanyfile.net';

async function walk(directory) {
  const names = await readdir(directory, { withFileTypes: true });
  const paths = [];
  for (const item of names) {
    const path = join(directory, item.name);
    if (item.isDirectory()) paths.push(...await walk(path));
    else if (item.isFile()) paths.push(path);
  }
  return paths;
}

function routeFromFile(file) {
  const pathname = relative(DIST, file).split(sep).join('/');
  if (pathname === 'index.html') return '/';
  if (pathname.endsWith('/index.html')) return '/' + pathname.slice(0, -'index.html'.length);
  return '/' + pathname;
}

function decodeEntities(value) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([a-f\d]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

const files = await walk(DIST);
const staticFiles = new Set(files.map(path => '/' + relative(DIST, path).split(sep).join('/')));
const pages = files.filter(path => path.endsWith('.html'));
const validHtmlRoutes = new Set(pages.map(routeFromFile));
const broken = new Set();
let linksChecked = 0;
let externalLinks = 0;

for (const page of pages) {
  const route = routeFromFile(page);
  const html = await readFile(page, 'utf8');
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = match[0].match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if (href === undefined) continue;
    const raw = decodeEntities(href).trim();
    if (!raw || raw.startsWith('#')) continue;
    let url;
    try { url = new URL(raw, ORIGIN + route); }
    catch {
      broken.add(route + ' -> invalid href: ' + raw);
      continue;
    }
    if (url.origin !== ORIGIN && url.origin !== 'https://www.convertanyfile.net') {
      externalLinks++;
      continue;
    }
    linksChecked++;
    const path = url.pathname;
    if (path === route || (path === route.replace(/\/$/, '') && route !== '/')) continue;
    const htmlRoute = path.endsWith('/') ? path : path + '/';
    if (validHtmlRoutes.has(path) || validHtmlRoutes.has(htmlRoute)) continue;
    if (staticFiles.has(path)) continue;
    broken.add(route + ' -> ' + raw);
  }
}

if (broken.size) {
  console.error('Broken internal navigation links ('+broken.size+')');
  for (const entry of [...broken].sort()) console.error(' - '+entry);
  process.exit(1);
}
console.log('Internal link audit passed: '+linksChecked+' local links, '+externalLinks+' external links across '+pages.length+' generated HTML pages.');
