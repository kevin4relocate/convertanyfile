import { readFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const BATCHES = [
  ['src/content/tool-seo-guides.ts', 'BATCH_01_TOOL_SEO_GUIDES'],
  ...Array.from({length: 6}, (_, i) => [
    'src/content/tool-seo-guides-batch-' + String(i + 2).padStart(2, '0') + '.ts',
    'BATCH_' + String(i + 2).padStart(2, '0') + '_TOOL_SEO_GUIDES'
  ])
];

export function vietnamDate(instant = new Date()) {
  // Vietnam has UTC+07:00 throughout the year, with no daylight-saving changes.
  return new Date(instant.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

export async function loadGuides(root = process.cwd()) {
  const guides = [];
  for (const [path, declaration] of BATCHES) {
    const source = await readFile(resolve(root, path), 'utf8');
    const prefix = 'const ' + declaration + ': readonly ToolSeoGuide[] = ';
    const start = source.indexOf(prefix);
    if (start < 0) throw Error('Missing SEO catalog declaration: ' + path);
    const arrayStart = source.indexOf('[', start + prefix.length);
    const end = source.indexOf('\n];', arrayStart);
    if (arrayStart < 0 || end < 0) throw Error('Unparseable SEO catalog: ' + path);
    guides.push(...JSON.parse(source.slice(arrayStart, end + 2)));
  }
  return guides;
}

export function publicationPlan(date, guides) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + 'T00:00:00Z')) ||
      new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) {
    throw Error('Publication date must be a real YYYY-MM-DD calendar date.');
  }

  const slugs = new Set();
  const days = new Set();
  let previous = '';
  for (const guide of guides) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(guide.slug)) throw Error('Invalid guide slug: ' + guide.slug);
    if (slugs.has(guide.slug) || days.has(guide.publishDate)) throw Error('Duplicate guide slug/date: ' + guide.slug);
    if (guide.publishDate <= previous) throw Error('SEO publication queue must be in increasing date order.');
    slugs.add(guide.slug); days.add(guide.publishDate); previous = guide.publishDate;
  }

  const due = guides.find(guide => guide.publishDate === date);
  return {
    date,
    due: Boolean(due),
    slug: due?.slug ?? '',
    canonical: due ? 'https://convertanyfile.net/guides/tool/' + due.slug + '/' : '',
    title: due?.h1 ?? '',
    total: guides.length,
    first: guides[0]?.publishDate ?? '',
    last: guides.at(-1)?.publishDate ?? ''
  };
}

export function resolvePlan({date = vietnamDate(), guides}) {
  return publicationPlan(date, guides);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dateFlag = process.argv.find(arg => arg.startsWith('--date='));
  const date = dateFlag ? dateFlag.slice('--date='.length) : vietnamDate();
  const plan = publicationPlan(date, await loadGuides());
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,
      ['due=' + String(plan.due), 'date=' + plan.date, 'slug=' + plan.slug,
       'canonical=' + plan.canonical].join('\n') + '\n');
  }
  console.log(JSON.stringify(plan, null, 2));
}
