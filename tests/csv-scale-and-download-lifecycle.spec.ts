import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

function chromiumOnly(project: string) {
  test.skip(project !== 'chromium-desktop', 'Large-data and asynchronous lifecycle regressions run on desktop Chromium');
}

async function makePng(page: Page): Promise<Buffer> {
  const base64=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=90;canvas.height=90;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#ff0000';ctx.fillRect(0,0,90,90);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  return Buffer.from(base64,'base64');
}

test('CSV converter handles 160,000 short rows without argument-count overflow', async ({page},info)=>{
  chromiumOnly(info.project.name);
  await page.goto('/csv-to-json/');
  const app=page.locator('[data-converter-app]');
  await expect(app).toHaveAttribute('data-initialized','true');
  const csv='code\\n'+Array.from({length:160000},(_,i)=>String(i)).join('\\n');
  await app.locator('[data-role="file-input"]').setInputFiles({
    name:'many-rows.csv',mimeType:'text/csv',buffer:Buffer.from(csv),
  });
  await app.locator('[data-role="convert-all"]').click();
  await expect(app.locator('[data-role="result-summary]')).toContainText('1/1 converted',{timeout:60000});
  const downloadPromise=page.waitForEvent('download');
  await app.getByRole('button',{name:'Download',exact:true}).click();
  const file=await downloadPromise;
  expect(file.suggestedFilename()).toBe('many-rows.json');
  const path=await file.path();
  const rows=JSON.parse(await readFile(path!,'utf8')) as Array<{code:string}>;
  expect(rows).toHaveLength(160000);
  expect(rows[0]?.code).toBe('0');
  expect(rows[159999]?.code).toBe('159999');
});

test('wide CSV merger aligns reordered column headers and preserves all records',async({page},info)=>{
  chromiumOnly(info.project.name);
  await page.goto('/data/csv-file-merger/');
  const cols=Array.from({length:200},(_,i)=>'c'+i);
  const backwards=[...cols].reverse();
  const first=[cols.join(','),...Array.from({length:400},()=>Array(200).fill('a').join(','))].join('\\n');
  const second=[backwards.join(','),backwards.map((_,i)=>'v'+i).join(','),
    ...Array.from({length:399},()=>Array(200).fill('b').join(','))].join('\\n');
  await page.locator('[data-data-input]').fill(first);
  await page.locator('[data-data-secondary]').fill(second);
  await page.locator('[data-data-run]').click();
  await expect(page.locator('[data-data-error]')).toBeHidden();
  const output=await page.locator('[data-data-output]').inputValue();
  const lines=output.split('\\n');
  expect(lines).toHaveLength(801);
  expect(lines[0]).toBe(cols.join(','));
  expect(lines[401]).toBe(cols.map((_,i)=>'v'+(199-i)).join(','));
  expect(lines[800]).toBe(Array(200).fill('b').join(','));
});

test('late file reads cannot repopulate Data Tools after Clear',async({page},info)=>{
  chromiumOnly(info.project.name);
  await page.addInitScript(()=>{
    const original=Blob.prototype.arrayBuffer;
    const control=window as Window & {__pendingReads?:Array<()=>void>};
    Blob.prototype.arrayBuffer=function(){
      const source=this;
      return new Promise<ArrayBuffer>((resolve,reject)=>{
        (control.__pendingReads??=[]).push(()=>{
          original.call(source).then(resolve,reject);
        });
      });
    };
  });
  await page.goto('/data/csv-row-filter/');
  await page.locator('[data-data-upload]').setInputFiles({
    name:'delayed.csv',mimeType:'text/csv',buffer:Buffer.from('name\\nAlice'),
  });
  await expect.poll(()=>page.evaluate(()=>
    (window as Window & {__pendingReads?:Array<()=>void>}).__pendingReads?.length??0)).toBe(1);
  await page.locator('[data-data-clear]').click();
  await page.evaluate(()=>{
    const control=window as Window & {__pendingReads?:Array<()=>void>};
    control.__pendingReads!.shift()!();
  });
  await expect(page.locator('[data-data-input]')).toHaveValue('');
  await expect(page.locator('[data-data-summary]')).toHaveText('Ready');
  await expect(page.locator('[data-data-error]')).toBeHidden();
});

test('editing CSV while ZIP encodes does not re-enable or download an obsolete result',async({page},info)=>{
  chromiumOnly(info.project.name);
  await page.goto('/data/csv-file-splitter/');
  await page.locator('[data-data-run]').click();
  await expect(page.locator('[data-data-download]')).toBeEnabled();
  let downloads=0;
  page.on('download',()=>{downloads+=1;});
  await page.evaluate(()=>{
    const button=document.querySelector<HTMLButtonElement>('[data-data-download]')!;
    button.click();
    const input=document.querySelector<HTMLTextAreaElement>('[data-data-input]')!;
    input.value='name\\nChanged';
    input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('[data-data-download]')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('[data-data-download]')).toBeDisabled();
  await expect(page.locator('[data-data-output]')).toHaveValue('');
  await expect(page.locator('[data-data-summary]')).toHaveText('Ready');
  expect(downloads).toBe(0);
});

test('editing Advanced Image settings during ZIP encoding never restores stale output',async({page},info)=>{
  chromiumOnly(info.project.name);
  await page.goto('/split-image-into-grid/');
  const editor=page.locator('[data-image-tool-app]');
  await expect(editor).toHaveAttribute('data-image-tool-ready','true');
  await page.locator('[data-role="file-input"]').setInputFiles({
    name:'grid.png',mimeType:'image/png',buffer:await makePng(page),
  });
  await expect(page.locator('[data-advanced-process]')).toBeEnabled();
  await page.locator('[data-advanced-process]').click();
  await expect(page.locator('[data-advanced-results-count]')).toContainText('9 PNG');
  await expect(page.locator('[data-advanced-download]')).toBeEnabled();
  let downloads=0;
  page.on('download',()=>{downloads+=1;});
  await page.evaluate(()=>{
    const button=document.querySelector<HTMLButtonElement>('[data-advanced-download]')!;
    button.click();
    const setting=document.querySelector<HTMLInputElement>('[data-advanced-param="columns"]')!;
    setting.value='2';
    setting.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await expect(page.locator('[data-advanced-download]')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('[data-advanced-download]')).toBeDisabled();
  await expect(page.locator('[data-advanced-preview]')).toBeHidden();
  await expect(page.locator('[data-advanced-status]')).toHaveText('Settings changed. Generate a new preview.');
  expect(downloads).toBe(0);
});
