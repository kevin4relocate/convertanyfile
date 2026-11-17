import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGuides, publicationPlan, vietnamDate } from './seo-publication-plan.mjs';

const ORIGIN = 'https://convertanyfile.net';
const sleep = ms => new Promise(done => setTimeout(done, ms));

export function verifiesGuideHtml(html, plan) {
  return Boolean(html.includes('<h1') &&
    html.includes('href="' + plan.canonical + '"') &&
    html.includes('datePublished') &&
    html.includes('datetime="' + plan.date + '"'));
}

export function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m =>
    m[1].replace(/&amp;/g, '&').trim());
}

export function isGuideInSitemap(xml, plan) {
  return extractSitemapUrls(xml).includes(plan.canonical);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {'Cache-Control': 'no-cache', 'Pragma': 'no-cache'},
    cache: 'no-store',
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw Error('HTTP ' + response.status + ' at ' + url);
  return response.text();
}

export async function verifyProductionOnce(plan, origin = ORIGIN) {
  const canonical = new URL(plan.canonical);
  const url = new URL(origin);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') throw Error('Origin must use HTTPS.');
  const pageUrl = new URL(canonical.pathname, url);
  pageUrl.searchParams.set('publication-check', plan.date);

  const html = await fetchText(pageUrl);
  if (!verifiesGuideHtml(html, {...plan, canonical: new URL(canonical.pathname, url).href})) {
    throw Error('New guide is not yet visible with correct canonical and publication metadata.');
  }

  const indexUrl = new URL('/sitemap-index.xml', url);
  const indexXml = await fetchText(indexUrl);
  const sitemapUrls = extractSitemapUrls(indexXml);
  if (!sitemapUrls.length) throw Error('Sitemap index does not list any sitemap files.');

  let found = false;
  for (const sitemap of sitemapUrls) {
    const target = new URL(sitemap);
    if (target.origin !== url.origin) throw Error('Unexpected sitemap origin ' + target.origin);
    const xml = await fetchText(target);
    if (isGuideInSitemap(xml, {...plan, canonical: new URL(canonical.pathname, url).href})) {
      found = true;
      break;
    }
  }
  if (!found) throw Error('Guide missing from the deployed XML sitemap.');
  return {page: new URL(canonical.pathname, url).href, sitemapFound: found};
}

export async function verifyProductionWithRetries(plan, {attempts = 20, intervalMs = 20000, origin = ORIGIN} = {}) {
  if (!plan.due) throw Error('Cannot verify a day without a scheduled guide.');
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await verifyProductionOnce(plan, origin);
      console.log('Production guide and XML sitemap verified:', JSON.stringify(result));
      return result;
    } catch (error) {
      lastError = error;
      console.error('Publication check ' + attempt + '/' + attempts + ': ' + error.message);
      if (attempt !== attempts) await sleep(intervalMs);
    }
  }
  throw Error('Cloudflare production verification failed after ' + attempts +
    ' checks. Configure CLOUDFLARE_DEPLOY_HOOK or inspect Pages deployment logs. Last error: ' +
    lastError?.message);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const date = process.argv.find(arg => arg.startsWith('--date='))?.slice('--date='.length) ?? vietnamDate();
  const plan = publicationPlan(date, await loadGuides());
  if (!plan.due) {
    console.log('No guide is due on ' + date + ', skipping production verification.');
  } else {
    await verifyProductionWithRetries(plan);
  }
}
