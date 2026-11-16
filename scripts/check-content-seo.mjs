import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const readCatalog = async (filePath, declaration) => {
  const source = await readFile(join(root,filePath),'utf8');
  const prefix = `const ${declaration}: readonly ToolSeoGuide[] = `;
  const start = source.indexOf(prefix);
  if (start < 0) throw new Error(`Catalog declaration missing in ${filePath}`);
  const arrayStart = source.indexOf('[',start+prefix.length);
  const end = source.indexOf(';',arrayStart);
  if (arrayStart < 0 || end < 0) throw new Error(`Catalog array malformed: ${filePath}`);
  return JSON.parse(source.slice(arrayStart,end));
};
const guides = [
  ...await readCatalog('src/content/tool-seo-guides.ts','BATCH_01_TOOL_SEO_GUIDES'),
  ...await readCatalog('src/content/tool-seo-guides-batch-02.ts','BATCH_02_TOOL_SEO_GUIDES'),
];
const coverage = (await readFile(join(root,'docs/tool-guide-coverage.csv'),'utf8')).trim().split('\n');
const rows = coverage.slice(1).map(line=>line.split(','));
const errors = [];
if (rows.length !== 151) errors.push(`Coverage inventory unexpectedly changed: ${rows.length} entries (re-audit rather than silently reducing coverage)`);
if (new Set(rows.map(r=>r[2])).size !== rows.length) errors.push('Duplicate tool paths in coverage audit');
if (rows.some(row=>row[2].includes('gemini-ai-logo-remover'))) errors.push('Hidden Gemini tool must not be included');
if (rows.filter(row=>row[3]==='scheduled').length !== guides.length) errors.push('Scheduled coverage count does not match published content queue');
if (guides.length !== 20) errors.push(`Expected 20 independently reviewed guides across two batches; found ${guides.length}`);
const titleSet=new Set(), slugSet=new Set(),dateSet=new Set();
for (const [index,g] of guides.entries()) {
  if (g.publishDate !== new Date(Date.UTC(2026,10,17+index)).toISOString().slice(0,10)) errors.push(`Unexpected publication date: ${g.slug}`);
  if (dateSet.has(g.publishDate)) errors.push(`Multiple articles scheduled on ${g.publishDate}`);
  dateSet.add(g.publishDate);
  if (slugSet.has(g.slug)||titleSet.has(g.title)) errors.push(`Duplicate slug/title: ${g.slug}`);
  slugSet.add(g.slug); titleSet.add(g.title);
  if (g.publishDate !== new Date(Date.UTC(2026,10,17+index)).toISOString().slice(0,10)) errors.push(`Sequence mismatch at ${g.slug}`);
  const row=rows.find(r=>r[2]===g.toolHref);
  if (!row||row[3]!=='scheduled'||row[4]!==`/guides/tool/${g.slug}/`||row[5]!==g.publishDate) errors.push(`Tool coverage mapping wrong: ${g.slug}`);
  if (!g.image.endsWith(`${g.slug}.svg`)||!g.imageAlt||!g.caption) errors.push(`Missing unique SEO image description: ${g.slug}`);
  try {const svg=await readFile(join(root,'public',g.image),'utf8');if(!svg.includes('<svg')||!svg.includes('<title')||!svg.includes('<desc'))errors.push(`SVG accessibility markup missing: ${g.slug}`);}catch{errors.push(`SVG asset missing: ${g.image}`);}
  const words=[g.heroIntro,g.quickAnswer,...g.sections.flatMap(s=>[s.heading,...s.paragraphs,...(s.bullets??[])]),...g.faq.map(f=>f.answer)].join(' ').trim().split(/\s+/).length;
  if (words<260) errors.push(`Editorial copy too thin: ${g.slug} (${words} words)`);
  if (g.sections.length<4||g.faq.length<2||g.related.length<2) errors.push(`Sections, FAQs or links missing: ${g.slug}`);
  if (g.related.some(r=>/gemini-ai-logo-remover/.test(r.href))) errors.push(`Disabled tool linked: ${g.slug}`);
}
if (rows.filter(r=>r[3]==='covered').length!==19 ||rows.filter(r=>r[3]==='scheduled').length!==20 ||rows.filter(r=>r[3]==='missing').length!==112) errors.push('Inventory status totals unexpected');
const date=new Date(Date.now()+7*3600000).toISOString().slice(0,10);
for(const g of guides){
 const page=join(root,'dist/guides/tool',g.slug,'index.html');
 const live=g.publishDate<=date;
 try {
  await access(page);
  if(!live) errors.push(`Future page leaked in static build: ${g.slug}`);
  if(live){
   const html=await readFile(page,'utf8');
   if(!html.includes(g.image)||!html.includes('<img')||!html.includes('alt=')||!html.includes('datePublished')||!html.includes('figcaption'))errors.push(`Published article missing image, caption or metadata: ${g.slug}`);
  }
 }catch{if(live) errors.push(`Due article missing from static build: ${g.slug}`);}
}
if(errors.length){for(const error of errors)console.error('SEO CONTENT:',error);process.exit(1);}
console.log(`Tool SEO audit passed: 151 tools, 19 existing guides, 20 scheduled articles, 112 remaining; ${guides.filter(g=>g.publishDate<=date).length} published on ${date} VN.`);
