import { expect, test } from '@playwright/test';
import { TEXT_TOOLS } from '../src/config/text-tools';

test('directory links to all 14 working routes',async({request})=>{
 const r=await request.get('/text-tools/');
 expect(r.ok()).toBeTruthy();
 const html=await r.text();
 expect(TEXT_TOOLS).toHaveLength(14);
 for(const tool of TEXT_TOOLS){
  expect(html).toContain('href="/text/'+tool.slug+'/"');
  const res=await request.get('/text/'+tool.slug+'/');
  expect(res.ok(),tool.slug).toBeTruthy();
  expect(await res.text()).toContain('data-tool-id="'+tool.id+'"');
 }
});
test('format and validate JSON including errors',async({page})=>{
 await page.goto('/text/json-formatter/');
 await page.locator('[data-tool-input]').fill('{"a":1}');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue('{\n  "a": 1\n}');
 await page.locator('[data-tool-input]').fill('{bad');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-error]')).toContainText('Invalid JSON');
 await page.goto('/text/json-validator/');
 await page.locator('[data-tool-input]').fill('null');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue('Valid JSON\nRoot value type: null');
});
test('Unicode Base64 round trip',async({page})=>{
 await page.goto('/text/base64-text-encoder/');
 await page.locator('[data-tool-run]').click();
 const encoded=await page.locator('[data-tool-output]').inputValue();
 expect(encoded).toBe('SGVsbG8g8J+MjiDigJQgY2Fmw6k=');
 await page.goto('/text/base64-text-decoder/');
 await page.locator('[data-tool-input]').fill(encoded);
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue('Hello 🌎 — café');
});
test('URL, HTML, case and word utilities',async({page})=>{
 await page.goto('/text/url-encoder/');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue('hello%20world%20%26%20caf%C3%A9');
 await page.goto('/text/html-entity-decoder/');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue('<p>Tom & Jane © 2026</p>');
 await page.goto('/text/text-case-converter/');
 await page.locator('[data-tool-option]').selectOption('title');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue('Hello World. This Is An Example!');
 await page.goto('/text/word-character-counter/');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue(/Lines: 2/);
});
test('UUID, RGB/HSL and epoch conversion',async({page})=>{
 await page.goto('/text/uuid-generator/');
 await page.locator('[data-tool-option]').selectOption('5');
 await page.locator('[data-tool-run]').click();
 const uuids=(await page.locator('[data-tool-output]').inputValue()).split('\n');
 expect(uuids).toHaveLength(5);
 for(const uuid of uuids)expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
 await page.goto('/text/color-code-converter/');
 await page.locator('[data-tool-input]').fill('#ff0000');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue(/HSL: hsl\(0, 100%, 50%\)/);
 await page.goto('/text/unix-timestamp-converter/');
 await page.locator('[data-tool-input]').fill('0');
 await page.locator('[data-tool-run]').click();
 await expect(page.locator('[data-tool-output]')).toHaveValue(/1970-01-01T00:00:00\.000Z/);
});
test('search filters text directory',async({page})=>{
 await page.goto('/text-tools/');
 await page.locator('[data-text-search]').fill('base64');
 await expect(page.locator('[data-text-card]:visible')).toHaveCount(2);
 await page.locator('[data-text-search]').fill('xyz-never-matches');
 await expect(page.locator('[data-text-empty]')).toBeVisible();
});