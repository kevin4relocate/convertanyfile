import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const PUBLISHER = 'ca-pub-4046271575630296';
const SELLER = 'google.com, pub-4046271575630296, DIRECT, f08c47fec0942fa0';
const META = '<meta name="google-adsense-account" content="' + PUBLISHER + '"';

async function getHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await getHtmlFiles(file));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}
const adsTxt = (await readFile(join(ROOT, 'ads.txt'), 'utf8')).trim();
if (adsTxt !== SELLER) {
  throw new Error('ads.txt must contain only the verified AdSense publisher declaration for this release.');
}
const pages = await getHtmlFiles(ROOT);
if (pages.length < 40) throw new Error('Expected static generated website pages were not built.');
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const publisherMetaCount = html.split(META).length - 1;
  if (publisherMetaCount !== 1) {
    throw new Error(page + ': Expected exactly one Google AdSense ownership meta tag.');
  }
  if (!html.includes("analytics_storage: 'denied'") || !html.includes("ad_storage: 'denied'")) {
    throw new Error(page + ': Analytics and ad consent defaults must remain denied.');
  }
  if (/pagead\/js\/adsbygoogle\.js|<ins\b[^>]*\badsbygoogle\b|enable_page_level_ads\s*:\s*true/i.test(html)) {
    throw new Error(page + ': AdSense JavaScript, ad units and Auto Ads are prohibited in metadata-only site verification.');
  }
}
console.log('AdSense metadata-only verification passed for ' + pages.length + ' generated HTML pages and ads.txt, with no ad loader.');
