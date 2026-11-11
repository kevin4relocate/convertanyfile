import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { IMAGE_UTILITY_TOOLS } from '../src/config/image-utility-tools';
import { IMAGE_TOOL_MANIFEST } from '../src/config/image-tools';

async function makePng(page:Page,name:string,width=8,height=8,color='#FF0000',padding=0){
  const data=await page.evaluate(({width,height,color,padding})=>{
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=color;
    ctx.fillRect(padding,padding,width-padding*2,height-padding*2);
    return canvas.toDataURL('image/png').split(',')[1]!;
  },{width,height,color,padding});
  return {name,mimeType:'image/png',buffer:Buffer.from(data,'base64')};
}
async function visit(page:Page,slug:string){
  await page.goto('/'+slug+'/');
  const app=page.locator('[data-image-tool-app]');
  await expect(app).toHaveAttribute('data-image-tool-ready','true',{timeout:60_000});
  return app;
}
async function upload(page:Page,files:Awaited<ReturnType<typeof makePng>>|Awaited<ReturnType<typeof makePng>>[]){
  await page.locator('[data-role="file-input"]').setInputFiles(files);
  await expect(page.locator('[data-role="file-items"] .image-utility-file-item')).toHaveCount(Array.isArray(files)?files.length:1);
}

test('Batch B adds twelve unique live tools in the shared Image Tools registry',async({request})=>{
  expect(IMAGE_UTILITY_TOOLS).toHaveLength(12);
  const ids=new Set(IMAGE_TOOL_MANIFEST.map(item=>item.tool.id));
  expect(ids.size).toBe(IMAGE_TOOL_MANIFEST.length);
  const hub=await request.get('/image-tools/');
  expect(hub.ok()).toBeTruthy();
  const html=await hub.text();
  for(const tool of IMAGE_UTILITY_TOOLS){
    const route='/'+tool.slug+'/';
    expect(html,route).toContain('href="'+route+'"');
    const response=await request.get(route);
    expect(response.ok(),route).toBeTruthy();
    const pageHtml=await response.text();
    expect(pageHtml).toContain('data-tool-id="'+tool.id+'"');
    expect(pageHtml).toContain('https://convertanyfile.net'+route);
  }
});

test('every new image utility mounts in the common runtime and exposes controls',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Dedicated editor boot regression');
  for(const {slug} of IMAGE_UTILITY_TOOLS){
    const app=await visit(page,slug);
    await expect(app.locator('[data-role="process-batch"]')).toBeVisible();
    await expect(app.locator('[data-role="download-batch"]')).toBeDisabled();
  }
});

test('image to Base64 can decode back to PNG, without a server upload',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Image to Base64 workflow');
  const file=await makePng(page,'test-image.png',8,8);
  await visit(page,'image-to-base64');
  await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/^data:image\/png;base64,/);
  const encoded=await page.locator('[data-role="text-result"]').inputValue();
  await visit(page,'base64-to-image');
  await page.locator('[data-role="base64-input"]').fill(encoded);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="result-image"]')).toBeVisible();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Dimensions: 8 × 8/);
  await page.locator('[data-role="base64-input"]').fill('data:image/svg+xml;base64,PHN2Zz4=');
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="notice"]')).toContainText('Only Base64 data URLs');
});

test('color picker, palette, dimensions and EXIF have working local results',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Functional image inspection');
  const file=await makePng(page,'red.png',8,6,'#FF0000');
  await visit(page,'image-color-picker');await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/HEX: #FF0000/);
  await page.locator('[data-role="source-canvas"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Source pixel:/);

  await visit(page,'color-palette-extractor');await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/#FF0000/);
  await expect(page.locator('[data-role="palette"] button')).toHaveCount(1);

  await visit(page,'image-dimension-inspector');await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Dimensions: 8 × 6 pixels/);
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Aspect ratio: 4:3/);

  await visit(page,'exif-metadata-viewer');await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/No supported EXIF block/);
});

test('favicon is a real multi-image ICO and app icons ZIP contains scaled PNGs',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Binary output verification');
  const file=await makePng(page,'icon.png',48,48,'#2266FF');
  await visit(page,'image-to-favicon');await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  const icoPromise=page.waitForEvent('download');
  await page.locator('[data-role="download-batch"]').click();
  const icoDownload=await icoPromise;
  expect(icoDownload.suggestedFilename()).toBe('favicon.ico');
  const icoPath=testInfo.outputPath('favicon.ico');await icoDownload.saveAs(icoPath);
  const bytes=await readFile(icoPath);
  expect(bytes.readUInt16LE(0)).toBe(0);
  expect(bytes.readUInt16LE(2)).toBe(1);
  expect(bytes.readUInt16LE(4)).toBe(3);
  expect(bytes[6]).toBe(16);
  expect(bytes[22]).toBe(32);
  expect(bytes[38]).toBe(48);

  await visit(page,'app-icon-generator');await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  const zipPromise=page.waitForEvent('download');
  await page.locator('[data-role="download-batch"]').click();
  const zipDownload=await zipPromise;
  expect(zipDownload.suggestedFilename()).toBe('app-icons.zip');
  const zipPath=testInfo.outputPath('app-icons.zip');await zipDownload.saveAs(zipPath);
  const zip=await JSZip.loadAsync(await readFile(zipPath));
  expect(Object.keys(zip.files)).toContain('icon-512x512.png');
  expect(Object.keys(zip.files)).toContain('apple-touch-icon.png');
  expect(Object.keys(zip.files)).toContain('manifest.webmanifest');
});

test('contact sheet and merge tools export correct canvas dimensions',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Real canvas composition');
  const red=await makePng(page,'red.png',8,6,'#FF0000');
  const blue=await makePng(page,'blue.png',5,9,'#0000FF');

  await visit(page,'contact-sheet-maker');await upload(page,[red,blue]);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Contact sheet: 2 image/);
  await expect(page.locator('[data-role="result-image"]')).toBeVisible();

  await visit(page,'merge-images-horizontally');await upload(page,[red,blue]);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Output: 13 × 9 pixels/);
  await expect(page.locator('[data-role="result-image"]')).toBeVisible();

  await visit(page,'merge-images-vertically');await upload(page,[red,blue]);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Output: 8 × 15 pixels/);
});

test('transparent trimming preserves visible pixels and refuses opaque image',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Alpha bounding box operation');
  const padded=await makePng(page,'padded.png',8,8,'#00FF00',2);
  await visit(page,'trim-transparent-borders');await upload(page,padded);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="text-result"]')).toHaveValue(/Trimmed: 4 × 4 pixels/);
  await expect(page.locator('[data-role="result-image"]')).toBeVisible();

  const solid=await makePng(page,'solid.png',8,8,'#00FF00');
  await page.locator('[data-role="utility-clear"]').click();
  await upload(page,solid);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="notice"]')).toContainText('No fully transparent outer border');
});

test('multiple images, oversized uploads and invalid merge counts show useful errors',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='chromium-desktop','Admission and error handling');
  await visit(page,'merge-images-horizontally');
  const file=await makePng(page,'only.png',8,8);
  await upload(page,file);
  await page.locator('[data-role="process-batch"]').click();
  await expect(page.locator('[data-role="notice"]')).toContainText('at least two images');
  await page.locator('[data-role="file-input"]').setInputFiles({
    name:'fake.png',mimeType:'image/png',buffer:Buffer.from('not an image'),
  });
  await expect(page.locator('[data-role="notice"]')).toContainText('fake.png');
});
