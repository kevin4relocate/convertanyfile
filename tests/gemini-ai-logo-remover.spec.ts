import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { expect, test, type Locator, type Page } from '@playwright/test';

async function readyImageTool(page: Page): Promise<Locator> {
  const root = page.locator('[data-image-tool-app]');
  await expect(root).toHaveAttribute('data-image-tool-ready', 'true');
  return root;
}

async function uploadSyntheticBatch(page: Page, sizes: Array<[number, number]>, prefix = 'gemini'): Promise<void> {
  await page.locator('[data-image-tool-app]').evaluate(async (root, payload) => {
    const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
    const transfer = new DataTransfer();
    for (let index = 0; index < payload.sizes.length; index += 1) {
      const [width, height] = payload.sizes[index]!;
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d')!; const gradient = context.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, '#17243b'); gradient.addColorStop(1, '#62758c'); context.fillStyle = gradient; context.fillRect(0, 0, width, height);
      const cx = width * 0.91, cy = height * 0.87, rx = Math.max(6, width * 0.025), ry = Math.max(8, height * 0.045), innerX = rx * 0.23, innerY = ry * 0.23;
      context.fillStyle = 'rgba(238,240,246,.82)'; context.beginPath(); context.moveTo(cx, cy - ry); context.lineTo(cx + innerX, cy - innerY); context.lineTo(cx + rx, cy); context.lineTo(cx + innerX, cy + innerY); context.lineTo(cx, cy + ry); context.lineTo(cx - innerX, cy + innerY); context.lineTo(cx - rx, cy); context.lineTo(cx - innerX, cy - innerY); context.closePath(); context.fill();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('fixture encode failed')), 'image/png'));
      transfer.items.add(new File([blob], `${payload.prefix}-${index + 1}.png`, { type: 'image/png' }));
    }
    input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { sizes, prefix });
  const root = page.locator('[data-image-tool-app]');
  await expect(root.locator('.gemini-file-card')).toHaveCount(sizes.length);
  await expect(root.locator('[data-role="mask-canvas"]')).toBeVisible();
  await expect.poll(() => root.locator('[data-role="mask-canvas"]').evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);
}

async function drawMask(page: Page, x1 = 0.86, y1 = 0.78, x2 = 0.97, y2 = 0.96): Promise<void> {
  const mask = page.locator('[data-image-tool-app] [data-role="mask-canvas"]'); await expect(mask).toBeVisible(); await expect.poll(() => mask.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0); const box = await mask.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * x1, box!.y + box!.height * y1); await page.mouse.down(); await page.mouse.move(box!.x + box!.width * x2, box!.y + box!.height * y2, { steps: 5 }); await page.mouse.up();
}

async function moveSelectedMask(page: Page): Promise<void> {
  const mask = page.locator('[data-image-tool-app] [data-role="mask-canvas"]'); const box = await mask.boundingBox(); expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.915, box!.y + box!.height * 0.87); await page.mouse.down(); await page.mouse.move(box!.x + box!.width * 0.84, box!.y + box!.height * 0.80, { steps: 5 }); await page.mouse.up();
}

async function rotateDefaultStar(page: Page): Promise<void> {
  const canvas = page.locator('[data-image-tool-app] [data-role="mask-canvas"]'); const box = await canvas.boundingBox(); expect(box).not.toBeNull();
  const centerX = box!.x + box!.width * 0.915, centerY = box!.y + box!.height * 0.877;
  const startY = box!.y + box!.height * 0.624;
  await page.mouse.move(centerX, startY); await page.mouse.down(); await page.mouse.move(centerX + 50, centerY - 15, { steps: 10 }); await page.mouse.up();
}

test('Gemini exposes only Circle and 4-Point Star and defaults to Star', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini focused product contract'); await page.goto('/gemini-ai-logo-remover/'); const root = await readyImageTool(page);
  await expect(root).toHaveAttribute('data-max-files', '50'); await expect(root).toHaveAttribute('data-max-file-bytes', String(10 * 1024 * 1024)); await expect(root.locator('[data-role="auto-select"]')).toHaveCount(0); await expect(root.locator('[data-ratio]')).toHaveCount(0);
  await uploadSyntheticBatch(page, [[320, 180]], 'modes'); await expect(root.locator('[data-tool-mode]')).toHaveCount(2);
  await expect(root.getByRole('button', { name: 'Circle' })).toBeVisible(); await expect(root.getByRole('button', { name: /4-Point Star/ })).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['Rectangle','Square','Diamond','Text']) await expect(root.getByRole('button', { name })).toHaveCount(0);
  await expect(page.getByText('Browser-only Preview')).toHaveCount(0);
});

test('same-ratio Gemini batch starts shared and mixed batch starts individual', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini automatic editing mode'); await page.goto('/gemini-ai-logo-remover/'); const root = await readyImageTool(page);
  await uploadSyntheticBatch(page, [[320, 180], [640, 360]], 'same'); await expect(root).toHaveAttribute('data-edit-mode', 'shared'); await expect(root).toHaveAttribute('data-edit-mode-preference', 'auto'); await expect(root.locator('[data-role="batch-warning"]')).toHaveAttribute('data-tone', 'compatible');
  await root.locator('[data-role="clear-all"]').click(); await uploadSyntheticBatch(page, [[300, 450], [320, 180], [500, 500]], 'mixed'); await expect(root.locator('.gemini-file-card')).toHaveCount(3); await expect(root).toHaveAttribute('data-edit-mode', 'individual'); await expect(root.locator('[data-role="batch-warning"]')).toHaveAttribute('data-tone', 'info');
});

test('manual shared override survives later mixed-ratio uploads and warns', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini manual override'); await page.goto('/gemini-ai-logo-remover/'); const root = await readyImageTool(page); await uploadSyntheticBatch(page, [[320, 180], [640, 360]], 'override');
  await root.getByRole('radio', { name: /One mask for all/ }).click(); await expect(root).toHaveAttribute('data-edit-mode-preference', 'manual'); await uploadSyntheticBatch(page, [[300, 450]], 'portrait-extra'); await expect(root.locator('.gemini-file-card')).toHaveCount(3); await expect(root).toHaveAttribute('data-edit-mode', 'shared'); await expect(root.locator('[data-role="batch-warning"]')).toHaveAttribute('data-tone', 'warning');
});

test('shared Gemini mask becomes per-image copies and one image can be custom', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini shared and individual masks'); await page.goto('/gemini-ai-logo-remover/'); const root = await readyImageTool(page); await uploadSyntheticBatch(page, [[320, 180], [640, 360]], 'customize'); await drawMask(page);
  await root.getByRole('radio', { name: /Edit individually/ }).click(); await expect(root.locator('.gemini-mask-badge--shared')).toHaveCount(2); await moveSelectedMask(page); await expect(root.locator('.gemini-file-card.is-sample')).toContainText('Custom'); const secondCard = root.locator('.gemini-file-card').nth(1); await secondCard.locator('.gemini-file-copy').click(); await expect(secondCard).toContainText('Shared copy'); await expect(root.getByRole('button', { name: 'Use shared mask' })).toBeVisible();
});

test('Gemini 4-Point Star can be rotated with the round handle and repaired', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini rotation regression'); const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message)); await page.goto('/gemini-ai-logo-remover/'); const root=await readyImageTool(page); await uploadSyntheticBatch(page, [[320,180]], 'rotate-star'); await drawMask(page);
  const canvas=root.locator('[data-role="mask-canvas"]'); const before=await canvas.evaluate((element)=>(element as HTMLCanvasElement).toDataURL()); await rotateDefaultStar(page); const after=await canvas.evaluate((element)=>(element as HTMLCanvasElement).toDataURL()); expect(after).not.toBe(before);
  await root.locator('[data-role="remove"]').click(); await expect(root.locator('[data-role="batch-result-summary"]')).toContainText('1 repaired',{timeout:20_000}); expect(errors).toEqual([]);
});

test('mixed-ratio Gemini batch can repair both images and download ZIP', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini mixed-ratio processing'); const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message)); await page.goto('/gemini-ai-logo-remover/'); const root=await readyImageTool(page); await uploadSyntheticBatch(page, [[320,180],[300,450]], 'mixed-process'); await drawMask(page); await root.locator('.gemini-file-card').nth(1).click(); await drawMask(page,0.84,0.80,0.96,0.95); await root.locator('[data-role="remove"]').click(); await expect(root.locator('[data-role="batch-result-summary"]')).toContainText('2 repaired',{timeout:30_000});
  const downloadPromise=page.waitForEvent('download'); await root.locator('[data-role="download"]').click(); const download=await downloadPromise; expect(download.suggestedFilename()).toBe('gemini-logo-removed-mixed-2-images.zip'); const path=await download.path(); expect(path).not.toBeNull(); const zip=await JSZip.loadAsync(await readFile(path!)); expect(Object.keys(zip.files).sort()).toEqual(['mixed-process-1-gemini-logo-removed.png','mixed-process-2-gemini-logo-removed.png']); expect(errors).toEqual([]);
});

test('whole completed Gemini card restores its After preview', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini result preview/card selection'); await page.goto('/gemini-ai-logo-remover/'); const root=await readyImageTool(page); await uploadSyntheticBatch(page, [[320,180],[640,360]], 'preview'); await drawMask(page); await root.locator('[data-role="remove"]').click(); await expect(root.locator('[data-role="batch-result-summary"]')).toContainText('2 repaired',{timeout:30_000}); await root.locator('.gemini-file-card').nth(1).locator('.gemini-file-copy').click(); await expect(root.locator('[data-role="result-label"]')).toHaveText('Processed result'); await expect(root.locator('[data-role="result-empty"]')).toBeHidden();
});

test('Gemini output controls and file-size guard stay enforced', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini release controls'); await page.goto('/gemini-ai-logo-remover/'); const root=await readyImageTool(page); await uploadSyntheticBatch(page, [[240,240]], 'output'); await expect(root.locator('.gemini-output-panel')).toHaveCount(1); await expect(root.locator('[data-role="cancel"]')).toHaveCount(1); await root.getByRole('radio',{name:'PNG'}).click(); await expect(root.locator('[data-role="quality"]')).toBeDisabled(); await root.locator('[data-role="clear-all"]').click();
  await root.evaluate((element)=>{const input=element.querySelector<HTMLInputElement>('[data-role="file-input"]')!,transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array(10*1024*1024+1)],'too-large.png',{type:'image/png'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));}); await expect(root.locator('.gemini-file-card')).toHaveCount(0); await expect(root.locator('[data-role="notice"]')).toContainText('max 10 MB per image');
});

test('Gemini SEO, guide, and navigation target visible watermark intent', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Gemini release content'); await page.goto('/gemini-ai-logo-remover/');
  await expect(page).toHaveTitle(/Gemini Watermark Remover/); await expect(page.getByRole('heading',{level:1})).toHaveText('Remove the visible Gemini watermark from images'); await expect(page.getByText(/round handle to rotate/i).first()).toBeVisible(); await expect(page.getByText(/not affiliated with or endorsed by Google or Gemini/i)).toBeVisible(); await expect(page.getByRole('heading',{name:'Gemini Watermark Remover FAQ'})).toBeVisible(); await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',/Remove the visible Gemini watermark/i);
  await page.goto('/guides/how-to-remove-gemini-watermark-from-image/'); await expect(page.getByRole('heading',{level:1})).toContainText('visible Gemini watermark'); await expect(page.getByRole('heading',{name:/Remove the visible watermark/})).toBeVisible();
  await page.goto('/image-tools/'); await expect(page.getByRole('link',{name:'Gemini Watermark Remover'}).first()).toBeVisible(); await expect(page.getByText('Circle, 4-Point Star',{exact:true})).toBeVisible();
});

test('Gemini editor stays usable on mobile without horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Gemini mobile regression'); await page.goto('/gemini-ai-logo-remover/'); const root=await readyImageTool(page); await uploadSyntheticBatch(page, [[180,320],[320,180]], 'mobile-mixed'); await expect(root).toHaveAttribute('data-edit-mode','individual'); const layout=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,touchAction:getComputedStyle(document.querySelector<HTMLElement>('[data-role="mask-canvas"]')!).touchAction,queueOverflow:getComputedStyle(document.querySelector<HTMLElement>('.gemini-file-queue')!).overflowX})); expect(layout.touchAction).toBe('none'); expect(layout.queueOverflow).toBe('auto'); expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth+1);
});
