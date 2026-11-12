import {expect,test,type Page,type TestInfo} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';
import {ADVANCED_IMAGE_TOOLS} from '../src/config/image-advanced-tools';
import {IMAGE_TOOL_MANIFEST} from '../src/config/image-tools';

async function fixture(page:Page,name:string,width:number,height:number,style:'red'|'blue'|'checker'|'background'|'gradient'='red'){
 const base64=await page.evaluate(({width,height,style})=>{
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=style==='blue'?'#0000ff':style==='background'?'#ffffff':'#ff0000';
  ctx.fillRect(0,0,width,height);
  if(style==='background'){ctx.fillStyle='#ff0000';ctx.fillRect(width/4,height/4,width/2,height/2);}
  if(style==='checker'){
   ctx.fillStyle='#000000';ctx.fillRect(0,0,width/2,height);
   ctx.fillStyle='#ffffff';ctx.fillRect(width/2,0,width/2,height);
  }
  if(style==='gradient'){
   const gradient=ctx.createLinearGradient(0,0,width,0);
   gradient.addColorStop(0,'#323232');gradient.addColorStop(1,'#ababab');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  }
  return canvas.toDataURL('image/png').split(',')[1]!;
 },{width,height,style});
 return {name,mimeType:'image/png',buffer:Buffer.from(base64,'base64')};
}
async function visit(page:Page,id:string){
 await page.goto('/'+id+'/');
 const app=page.locator('[data-image-tool-app][data-tool-id="'+id+'"]');
 await expect(app).toHaveAttribute('data-image-tool-ready','true',{timeout:60000});
 return app;
}
async function upload(page:Page,files:Awaited<ReturnType<typeof fixture>>|Awaited<ReturnType<typeof fixture>>[]){
 const list=Array.isArray(files)?files:[files];
 await page.locator('[data-role="file-input"]').setInputFiles(list);
 await expect(page.locator('.advanced-file')).toHaveCount(list.length);
 await expect(page.locator('[data-advanced-process]')).toBeEnabled();
}
async function run(page:Page,count=1){
 await page.locator('[data-advanced-process]').click();
 await expect(page.locator('[data-advanced-preview]')).toBeVisible();
 await expect(page.locator('[data-advanced-results-count]')).toContainText(count+' PNG');
 await expect(page.locator('[data-advanced-download]')).toBeEnabled();
}
async function pngSize(page:Page){
 return page.evaluate(async()=>{
  const img=document.querySelector<HTMLImageElement>('[data-advanced-preview]')!;
  await img.decode();
  return {width:img.naturalWidth,height:img.naturalHeight};
 });
}
async function pixels(page:Page,coordinates:readonly [number,number][]){
 return page.evaluate(async(coords)=>{
  const img=document.querySelector<HTMLImageElement>('[data-advanced-preview]')!;
  await img.decode();
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
  return coords.map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data));
 },coordinates);
}
test('13 unique and live Advanced Image Tools are indexed and rendered with correct SEO',async({request})=>{
 expect(ADVANCED_IMAGE_TOOLS).toHaveLength(13);
 expect(new Set(ADVANCED_IMAGE_TOOLS.map(t=>t.id)).size).toBe(13);
 for(const item of ADVANCED_IMAGE_TOOLS){
  const found=IMAGE_TOOL_MANIFEST.find(entry=>entry.tool.id===item.id);
  expect(found?.runtime).toBe('advanced');
  expect(found?.directoryGroup).toBe('advanced');
  expect(item.status).toBe('live');
  const response=await request.get('/'+item.slug+'/');
  expect(response.ok(),item.slug).toBeTruthy();
  const html=await response.text();
  expect(html).toContain('data-tool-id="'+item.id+'"');
  expect(html).toContain('https://convertanyfile.net/'+item.id+'/');
 }
});

test('all advanced workbenches mount with meaningful controls',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Advanced image editor mount test');
 for(const tool of ADVANCED_IMAGE_TOOLS){
  await visit(page,tool.id);
  await expect(page.locator('[data-advanced-param]')).toHaveCount(tool.controls.length);
  await expect(page.locator('[data-advanced-process]')).toBeDisabled();
 }
});

test('collage exports real PNG composed from two photos',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Collage binary test');
 await visit(page,'image-collage-maker');
 const red=await fixture(page,'red.png',80,60),blue=await fixture(page,'blue.png',60,80,'blue');
 await upload(page,[red,blue]);
 await page.locator('[data-advanced-param="columns"]').fill('2');
 await page.locator('[data-advanced-param="tileSize"]').fill('160');
 await page.locator('[data-advanced-param="gap"]').fill('10');
 await run(page);
 expect(await pngSize(page)).toEqual({width:350,height:180});
 const downloadEvent=page.waitForEvent('download');
 await page.locator('[data-advanced-download]').click();
 const download=await downloadEvent;
 expect(download.suggestedFilename()).toBe('image-collage.png');
 const path=info.outputPath('collage.png');await download.saveAs(path);
 const bytes=await readFile(path);
 expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect(bytes.readUInt32BE(16)).toBe(350);
 expect(bytes.readUInt32BE(20)).toBe(180);
});

test('grid splitter creates a ZIP of all numbered tiles without losing edges',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Grid tiles verification');
 await visit(page,'split-image-into-grid');
 await upload(page,await fixture(page,'tile.png',11,9));
 await page.locator('[data-advanced-param="columns"]').fill('3');
 await page.locator('[data-advanced-param="rows"]').fill('2');
 await run(page,6);
 const dl=page.waitForEvent('download');
 await page.locator('[data-advanced-download]').click();
 const file=await dl;
 expect(file.suggestedFilename()).toBe('advanced-split-image-into-grid.zip');
 const dest=info.outputPath('grid.zip');await file.saveAs(dest);
 const zip=await JSZip.loadAsync(await readFile(dest));
 expect(Object.keys(zip.files)).toHaveLength(6);
 const bytes=await zip.file('tile-row-02-col-03.png')!.async('nodebuffer');
 expect(bytes.readUInt32BE(16)).toBe(4);
 expect(bytes.readUInt32BE(20)).toBe(5);
});

test('strip slicer exports correctly sized horizontal strips',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Strip tiles verification');
 await visit(page,'image-strip-slicer');
 await upload(page,await fixture(page,'strip.png',12,11));
 await page.locator('[data-advanced-param="count"]').fill('4');
 await run(page,4);
 expect(await pngSize(page)).toEqual({width:12,height:2});
 const dl=page.waitForEvent('download');await page.locator('[data-advanced-download]').click();
 const file=await dl;const path=info.outputPath('slices.zip');await file.saveAs(path);
 const zip=await JSZip.loadAsync(await readFile(path));
 expect(Object.keys(zip.files)).toHaveLength(4);
 const last=await zip.file('strip-strip-04.png')!.async('nodebuffer');
 expect(last.readUInt32BE(16)).toBe(12);expect(last.readUInt32BE(20)).toBe(3);
});

test('caption and speech bubble render nontrivial text overlays into PNG',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Canvas text rendering');
 const picture=await fixture(page,'caption.png',420,260);
 for(const tool of ['add-text-to-image','speech-bubble-maker']){
  await visit(page,tool);await upload(page,picture);
  await run(page);
  const sampled=await pixels(page,tool==='speech-bubble-maker'?[[50,35],[210,130]]:[[210,225],[210,130]]);
  expect(sampled.some(p=>p[1]!==0||p[2]!==0),tool+' must alter source RGB').toBeTruthy();
 }
});

test('duotone, vignette, temperature, gamma and channel mixer transform actual RGB values',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Pixel effects');
 const red=await fixture(page,'effects.png',96,64);
 for(const tool of ['duotone-image-effect','vignette-image-effect','temperature-tint-adjuster','gamma-correction','rgb-channel-mixer']){
  await visit(page,tool);await upload(page,red);
  if(tool==='temperature-tint-adjuster'){
   await page.locator('[data-advanced-param="temperature"]').fill('-50');
  }
  if(tool==='rgb-channel-mixer'){
   await page.locator('[data-advanced-param="rr"]').fill('0');
   await page.locator('[data-advanced-param="bb"]').fill('0');
   await page.locator('[data-advanced-param="br"]').fill('100');
  }
  await run(page);
  const px=(await pixels(page,[[0,0],[48,32]]));
  if(tool==='rgb-channel-mixer')expect(px[1]!.slice(0,3)).toEqual([0,0,255]);
  else if(tool!=='gamma-correction')expect(px[0]!.slice(0,3)).not.toEqual([255,0,0]);
  else expect(px[1]![0]).toBe(255); // saturated red remains saturated under gamma
 }
});

test('Auto Levels brightens shadow range on gradient image',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Histogram levels');
 await visit(page,'auto-image-levels');
 await upload(page,await fixture(page,'levels.png',120,70,'gradient'));
 await run(page);
 const px=await pixels(page,[[0,35],[119,35]]);
 expect(px[0]![0]).toBeLessThan(25);
 expect(px[1]![0]).toBeGreaterThan(235);
});

test('straightening expands bounds and retains original for crop setting',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Arbitrary angle rotation');
 await visit(page,'straighten-image');
 await upload(page,await fixture(page,'horizon.png',120,80));
 await run(page);
 const size=await pngSize(page);
 expect(size.width).toBeGreaterThan(120);
 expect(size.height).toBeGreaterThan(80);
 await page.locator('[data-advanced-param="mode"]').selectOption('original-size');
 await run(page);
 expect(await pngSize(page)).toEqual({width:120,height:80});
});

test('flood fill removes only edge-connected solid color and preserves foreground',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Solid background removal');
 await visit(page,'solid-background-remover');
 await upload(page,await fixture(page,'logo.png',120,80,'background'));
 await run(page);
 const px=await pixels(page,[[0,0],[60,40]]);
 expect(px[0]![3]).toBe(0);
 expect(px[1]).toEqual([255,0,0,255]);
});

test('invalid input and file admission errors are visible and cannot download stale outputs',async({page},info)=>{
 test.skip(info.project.name!=='chromium-desktop','Error UI regression');
 await visit(page,'image-collage-maker');
 await upload(page,await fixture(page,'single.png',100,100));
 await page.locator('[data-advanced-process]').click();
 await expect(page.locator('[data-role="notice"]')).toContainText('between 2 and 12');
 await expect(page.locator('[data-advanced-download]')).toBeDisabled();
 await page.locator('[data-role="file-input"]').setInputFiles({name:'fake.png',mimeType:'image/png',buffer:Buffer.from('corrupt')});
 await expect(page.locator('[data-role="notice"]')).toContainText('fake.png');
});

test('mobile workbench stays inside viewport',async({page},info)=>{
 test.skip(info.project.name!=='chromium-mobile','Mobile layout');
 await page.goto('/rgb-channel-mixer/');
 await expect(page.locator('[data-advanced-param]')).toHaveCount(9);
 const sizes=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
 expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.width+1);
});
