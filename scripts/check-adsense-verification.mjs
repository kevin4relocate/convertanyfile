import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const PUBLISHER = 'ca-pub-4046271575630296';
const SELLER = 'google.com, pub-4046271575630296, DIRECT, f08c47fec0942fa0';
const ADS_SRC = 'pagead/js/adsbygoogle.js?client=' + PUBLISHER;
const META = '<meta name="google-adsense-account" content="' + PUBLISHER + '"';
const PAUSE = 'pauseAdRequests = 1';

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
  const scriptCount = html.split(ADS_SRC).length - 1;
  const pausedIndex = html.indexOf(PAUSE);
  const scriptIndex = html.indexOf(ADS_SRC);
  const consentIndex = html.indexOf("analytics_storage: 'denied'");
  if (publisherMetaCount !== 1 || scriptCount !== 1) {
    throw new Error(page + ': Expected one AdSense account meta tag and one site verification script.');
  }
  if (pausedIndex < 0 || pausedIndex > scriptIndex || consentIndex < 0 || consentIndex > scriptIndex) {
    throw new Error(page + ': Ad requests must be paused, and Consent Mode must default to denied before loading the verification script.');
  }
  if (/<ins\b[^>]*\badsbygoogle\b/i.test(html) || /enable_page_level_ads\s*:\s*true/i.test(html)) {
    throw new Error(page + ': No ad units or Auto Ads activation are permitted in site-verification phase.');
  }
}
console.log('AdSense site verification guard passed for ' + pages.length + ' generated HTML pages, ads.txt and paused delivery.');
