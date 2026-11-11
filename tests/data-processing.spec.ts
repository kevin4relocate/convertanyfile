import {test,expect,type Page} from '@playwright/test';
import {DATA_PROCESSING_TOOLS} from '../src/config/data-processing-tools';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';

async function visit(page:Page,slug:string){
 await page.goto('/data/'+slug+'/');
 await expect(page.locator('[data-data-workbench]')).toHaveAttribute('data-tool-id',slug);
}
const text=(page:Page)=>page.locator('[data-data-output]');
async function execute(page:Page){
 await page.locator('[data-data-run]').click();
 await expect(page.locator('[data-data-error]')).toBeHidden();
 await expect(page.locator('[data-data-download]')).toBeEnabled();
}
test('15 unique data processing SEO routes and complete discovery hub',async({request})=>{
 expect(DATA_PROCESSING_TOOLS).toHaveLength(15);
 expect(new Set(DATA_PROCESSING_TOOLS.map(t=>t.id)).size).toBe(15);
 const hub=await request.get('/data-tools/');
 expect(hub.ok()).toBeTruthy();
 const html=await hub.text();
 for(const tool of DATA_PROCESSING_TOOLS){
  const route='/data/'+tool.id+'/';
  expect(html).toContain('href="'+route+'"');
  const response=await request.get(route);
  expect(response.ok(),route).toBeTruthy();
  const body=await response.text();
  expect(body).toContain('data-tool-id="'+tool.id+'"');
  expect(body).toContain('https://convertanyfile.net'+route);
  expect(body).toContain('name="description"');
 }
});

test('all data tool buttons mount without JavaScript errors',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','One full functional browser pass');
 for(const tool of DATA_PROCESSING_TOOLS){
  await visit(page,tool.id);
  await expect(page.locator('[data-data-run]')).toBeVisible();
  await expect(page.locator('[data-data-download]')).toBeDisabled();
  await expect(page.locator('[data-data-input]')).not.toBeEmpty();
 }
});
test('JSON Schema detects valid, invalid and malicious external refs',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','JSON Schema engine');
 await visit(page,'json-schema-validator');
 await execute(page);
 await expect(text(page)).toHaveValue(/Valid: JSON matches/);
 await page.locator('[data-data-input]').fill('{"name":"Alice","score":-1}');
 await execute(page);
 await expect(text(page)).toHaveValue(/Invalid:.*issue/);
 await expect(text(page)).toHaveValue(/minimum/);
 await page.locator('[data-data-secondary]').fill('{"$ref":"https://example.com/schema"}');
 await page.locator('[data-data-run]').click();
 await expect(page.locator('[data-data-error]')).toContainText('Only local JSON Schema references');
 await page.locator('[data-data-secondary]').fill('{"enum":[{"a":1,"b":2}]}');
 await page.locator('[data-data-input]').fill('{"b":2,"a":1}');
 await execute(page);
 await expect(text(page)).toHaveValue(/Valid: JSON matches/);
 await page.locator('[data-data-secondary]').fill('{"type":"array","uniqueItems":true}');
 await page.locator('[data-data-input]').fill('[{"a":1,"b":2},{"b":2,"a":1}]');
 await execute(page);
 await expect(text(page)).toHaveValue(/unique/);
});
test('JSONPath returns matched values and rejects code execution',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','JSONPath engine');
 await visit(page,'jsonpath-tester');
 await execute(page);
 await expect(text(page)).toHaveValue(/\[\s*"editor",\s*"viewer"\s*\]/);
 await page.locator('[data-data-option="path"]').fill('$..name');
 await execute(page);
 await expect(text(page)).toHaveValue(/\[\s*"Alice"\s*\]/);
 await page.locator('[data-data-option="path"]').fill('$.roles[?(@.x>0)]');
 await page.locator('[data-data-run]').click();
 await expect(page.locator('[data-data-error]')).toContainText('Unsupported JSONPath bracket');
});

test('typed JSON ↔ XML round trip keeps arrays, booleans and strings',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','XML conversion');
 const original='{"name":"Alice","score":30,"enabled":true,"roles":["editor","viewer"],"empty":null}';
 await visit(page,'json-to-xml');
 await page.locator('[data-data-input]').fill(original);
 await execute(page);
 const xml=await text(page).inputValue();
 expect(xml).toContain('<data type="object">');
 expect(xml).toContain('<entry key="enabled"><data type="boolean">true</data></entry>');
 await visit(page,'xml-to-json');
 await page.locator('[data-data-input]').fill(xml);
 await execute(page);
 expect(JSON.parse(await text(page).inputValue())).toEqual(JSON.parse(original));
 await page.locator('[data-data-input]').fill('<!DOCTYPE root [<!ENTITY x SYSTEM "file:///etc/passwd">]><root>&x;</root>');
 await page.locator('[data-data-run]').click();
 await expect(page.locator('[data-data-error]')).toContainText('DTD and custom entities');
});

test('CSV sort, filter, dedupe and select/reorder columns preserve quoted values',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','CSV transforms');
 await visit(page,'csv-row-sorter');
 await execute(page);
 await expect(text(page)).toHaveValue(/Bob,Saigon,15[\s\S]*Alice,Hanoi,30/);
 await visit(page,'csv-row-filter');
 await execute(page);
 await expect(text(page)).toHaveValue('name,city,score\nAlice,Hanoi,30\nAlice,Hanoi,30');
 await visit(page,'csv-duplicate-remover');
 await execute(page);
 await expect(text(page)).toHaveValue('name,city,score\nAlice,Hanoi,30\nBob,Saigon,15');
 await visit(page,'csv-column-selector');
 await execute(page);
 await expect(text(page)).toHaveValue('name,score\nAlice,30\nBob,15\nAlice,30');
 await visit(page,'csv-column-reorderer');
 await execute(page);
 await expect(text(page)).toHaveValue('score,name,city\n30,Alice,Hanoi\n15,Bob,Saigon\n30,Alice,Hanoi');
 await visit(page,'csv-find-replace');
 await execute(page);
 await expect(text(page)).toHaveValue(/Alice,Da Nang,30/);
});

test('CSV merger aligns different headers; strict mode rejects incompatible files',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','CSV merge');
 await visit(page,'csv-file-merger');
 await execute(page);
 await expect(text(page)).toHaveValue('name,city,score\nAlice,Hanoi,\nBob,Saigon,15');
 await page.locator('[data-data-option="mode"]').selectOption('strict');
 await page.locator('[data-data-run]').click();
 await expect(page.locator('[data-data-error]')).toContainText('Strict mode');
});

test('CSV splitter downloads a valid ZIP containing header-per-part CSV',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','ZIP output');
 await visit(page,'csv-file-splitter');
 await execute(page);
 await expect(text(page)).toHaveValue(/Created 2 CSV part/);
 const downloadPromise=page.waitForEvent('download');
 await page.locator('[data-data-download]').click();
 const downloaded=await downloadPromise;
 expect(downloaded.suggestedFilename()).toBe('csv-file-splitter-result.zip');
 const zipPath=info.outputPath('data-split.zip');
 await downloaded.saveAs(zipPath);
 const zip=await JSZip.loadAsync(await readFile(zipPath));
 expect(Object.keys(zip.files)).toEqual(['part-001.csv','part-002.csv']);
 expect(await zip.file('part-001.csv')!.async('string')).toBe('name,city,score\nAlice,Hanoi,30\nBob,Saigon,15');
 expect(await zip.file('part-002.csv')!.async('string')).toBe('name,city,score\nAlice,Hanoi,30');
});
test('CSV to SQL and SQL to CSV roundtrip quoted apostrophes without executing SQL',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','SQL grammar');
 await visit(page,'csv-to-sql-insert');
 await page.locator('[data-data-input]').fill('name,code\nO\'Neil,001\nAlice,002');
 await execute(page);
 const sql=await text(page).inputValue();
 expect(sql).toContain("'O''Neil'");
 await visit(page,'sql-insert-to-csv');
 await page.locator('[data-data-input]').fill(sql);
 await execute(page);
 await expect(text(page)).toHaveValue('name,code\nO\'Neil,001\nAlice,002');
 await page.locator('[data-data-input]').fill('DELETE FROM people;');
 await page.locator('[data-data-run]').click();
 await expect(page.locator('[data-data-error]')).toContainText('Expected INSERT');
});
test('CSV profiler counts rows and missing values accurately',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Dataset profiling');
 await visit(page,'csv-data-profiler');
 await execute(page);
 await expect(text(page)).toHaveValue(/Rows: 3/);
 await expect(text(page)).toHaveValue(/Unique raw values: 2/);
});
test('local file upload and directory search work on mobile without overflow',async({page},info)=>{
 test.skip(info.project.name!=='chromium-mobile','Mobile smoke');
 await page.goto('/data-tools/');
 await page.locator('[data-data-search]').fill('JSONPath');
 await expect(page.locator('[data-data-card]:visible')).toHaveCount(1);
 await page.goto('/data/csv-row-filter/');
 const bytes=Buffer.from('name,city\nAn,"Da Nang"\nLan,Hue');
 await page.locator('[data-data-upload]').setInputFiles({name:'sample.csv',mimeType:'text/csv',buffer:bytes});
 await expect(page.locator('[data-data-input]')).toHaveValue('name,city\nAn,"Da Nang"\nLan,Hue');
 const sizes=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
 expect(sizes.scroll).toBeLessThanOrEqual(sizes.viewport+1);
});
