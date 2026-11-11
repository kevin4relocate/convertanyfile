import { expect, test } from '@playwright/test';
import { MAX_TEXT_CHARS, runTextTool } from '../src/platform/text-tools/operations';

const run = (id:string,input:string,option='') => runTextTool(id,input,option).output;

test('JSON formatter/minifier validate and reject unsafe integer precision loss',()=>{
 expect(run('json-formatter','{"a":[true, 1]}','2')).toContain('\n  "a"');
 expect(run('json-formatter','{"a":1}','4')).toContain('\n    "a"');
 expect(run('json-minifier','{ \n  "a":  1 }')).toBe('{"a":1}');
 expect(run('json-validator','null')).toBe('Valid JSON\nRoot value type: null');
 expect(run('json-validator','[1,2]')).toBe('Valid JSON\nRoot value type: array');
 expect(()=>run('json-formatter','{"id":9007199254740993}')).toThrow('Unsafe JSON integer');
 expect(()=>run('json-minifier','{"id":-9007199254740993}')).toThrow('Unsafe JSON integer');
 expect(run('json-minifier','{"id":"9007199254740993"}')).toBe('{"id":"9007199254740993"}');
 expect(run('json-minifier','{"id":9007199254740991}')).toBe('{"id":9007199254740991}');
 expect(()=>run('json-formatter','{')).toThrow('Invalid JSON');
});

test('UTF-8 Base64 preserves international text and detects invalid input',()=>{
 const original='Hello 🌎 — café 日本語';
 const b64=run('base64-text-encoder',original);
 expect(run('base64-text-decoder',b64)).toBe(original);
 expect(run('base64-text-encoder',' ')).toBe('IA==');
 expect(()=>run('base64-text-decoder','//8=')).toThrow('not valid UTF-8');
 expect(()=>run('base64-text-decoder','!not-base64!')).toThrow('Invalid Base64');
});

test('URL components encode and decode safely',()=>{
 expect(run('url-encoder','hello world & café')).toBe('hello%20world%20%26%20caf%C3%A9');
 expect(run('url-decoder','hello%20world%20%26%20caf%C3%A9')).toBe('hello world & café');
 expect(run('url-decoder','a+b')).toBe('a+b');
 expect(run('url-encoder',' ')).toBe('%20');
 expect(()=>run('url-decoder','%C0%AF')).toThrow('Invalid percent');
 expect(()=>run('url-encoder','\ud800')).toThrow('invalid Unicode');
});

test('HTML entity conversion escapes markup and never executes output',()=>{
 expect(run('html-entity-encoder','<b title="Hi & bye">\'')).toBe('&lt;b title=&quot;Hi &amp; bye&quot;&gt;&#39;');
 expect(run('html-entity-decoder','&lt;script&gt;alert(1)&lt;/script&gt;')).toBe('<script>alert(1)</script>');
 expect(run('html-entity-decoder','&copy; &#x1F30E; &#169;')).toBe('© 🌎 ©');
 expect(run('html-entity-decoder','&unknownEntity;')).toBe('&unknownEntity;');
 expect(run('html-entity-decoder','&#x110000;')).toBe('\ufffd');
});

test('text case and count handle Unicode and empty/whitespace input',()=>{
 expect(run('text-case-converter','hELLO world.','title')).toBe('Hello World.');
 expect(run('text-case-converter','hELLO WORLD','lower')).toBe('hello world');
 expect(run('text-case-converter','hello world','upper')).toBe('HELLO WORLD');
 expect(run('text-case-converter','hELLO world. next EXAMPLE','sentence')).toBe('Hello world. Next example');
 expect(run('word-character-counter','')).toContain('Words: 0');
 expect(run('word-character-counter','   ')).toContain('Words: 0');
 expect(run('word-character-counter','👩‍💻')).toContain('Characters (graphemes): 1');
 expect(run('word-character-counter','a\nb')).toContain('Lines: 2');
});

test('colors validate bounds and convert HSL ↔ RGB ↔ HEX',()=>{
 expect(run('color-code-converter','#f00')).toContain('HEX: #FF0000');
 expect(run('color-code-converter','#f00')).toContain('HSL: hsl(0, 100%, 50%)');
 expect(run('color-code-converter','rgb(0, 255, 0)')).toContain('HEX: #00FF00');
 expect(run('color-code-converter','hsl(120, 100%, 50%)')).toContain('HEX: #00FF00');
 expect(()=>run('color-code-converter','rgb(256,1,1)')).toThrow('RGB channels');
 expect(()=>run('color-code-converter','hsl(3,110%,10%)')).toThrow('HSL saturation');
 expect(()=>run('color-code-converter','#abcd')).toThrow('Enter #RGB');
});

test('timestamps handle units, timezones, negative epochs and leap days',()=>{
 expect(run('unix-timestamp-converter','0')).toContain('1970-01-01T00:00:00.000Z');
 expect(run('unix-timestamp-converter','1','milliseconds')).toContain('1970-01-01T00:00:00.001Z');
 expect(run('unix-timestamp-converter','1','seconds')).toContain('1970-01-01T00:00:01.000Z');
 expect(run('unix-timestamp-converter','-1','seconds')).toContain('1969-12-31T23:59:59.000Z');
 expect(run('unix-timestamp-converter','2024-02-29')).toContain('2024-02-29T00:00:00.000Z');
 expect(()=>run('unix-timestamp-converter','2026-02-29')).toThrow('Invalid calendar date');
 expect(()=>run('unix-timestamp-converter','2026-11-11T03:00:00')).toThrow('with a timezone');
 expect(run('unix-timestamp-converter','2026-11-11T10:00:00+07:00')).toContain('2026-11-11T03:00:00.000Z');
});

test('limits and unsupported operations fail predictably',()=>{
 expect(()=>run('base64-text-encoder','x'.repeat(MAX_TEXT_CHARS+1))).toThrow('1,000,000-character');
 expect(()=>run('json-formatter','')).toThrow('Enter some text');
 expect(()=>run('fake-tool','hi')).toThrow('Unrecognized');
});

test('download type and file name match the actual content',async({page})=>{
 await page.goto('/text/json-validator/');
 await page.locator('[data-tool-run]').click();
 const first=page.waitForEvent('download');
 await page.locator('[data-tool-download]').click();
 const download=await first;
 expect(download.suggestedFilename()).toBe('json-validator.txt');
 await page.goto('/text/json-formatter/');
 await page.locator('[data-tool-run]').click();
 const next=page.waitForEvent('download');
 await page.locator('[data-tool-download]').click();
 expect((await next).suggestedFilename()).toBe('json-formatter.json');
});

test('mobile view prevents horizontal overflow and keeps controls operable',async({page},info)=>{
 test.skip(info.project.name!=='chromium-mobile','Mobile-specific visual regression');
 for(const path of ['/text-tools/','/text/json-formatter/','/text/uuid-generator/']){
  await page.goto(path);
  const width=await page.evaluate(()=>({screen:innerWidth,scroll:document.documentElement.scrollWidth}));
  expect(width.scroll,path).toBeLessThanOrEqual(width.screen+1);
  if(path.includes('json-formatter')) await expect(page.locator('[data-tool-run]')).toBeVisible();
 }
});
