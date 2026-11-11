// No Playwright browser installation is needed for this suite.
// Run via: node --experimental-strip-types --test tests/text-operations.node.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { runTextTool, MAX_TEXT_CHARS } from '../src/platform/text-tools/operations.ts';

const result = (tool, input, option) => runTextTool(tool, input, option).output;

test('JSON formatting, minification, syntax validation and numeric fidelity', () => {
  assert.equal(result('json-formatter', '{"a":1}', '2'), '{\n  "a": 1\n}');
  assert.equal(result('json-formatter', '{"a":1}', '4'), '{\n    "a": 1\n}');
  assert.equal(result('json-minifier', '{ "a" : [1, 2] }'), '{"a":[1,2]}');
  assert.match(result('json-validator', 'null'), /Root value type: null/);
  assert.throws(() => result('json-formatter', '{"id":9007199254740993}'), /Unsafe JSON integer/);
  assert.throws(() => result('json-minifier', '{"id":-9007199254740993}'), /Unsafe JSON integer/);
  assert.throws(() => result('json-formatter', '{"number":1e400}'), /numeric range/);
  assert.equal(result('json-minifier', '{"id":"9007199254740993"}'), '{"id":"9007199254740993"}');
  assert.throws(() => result('json-formatter', '{oops}'), /Invalid JSON/);
});

test('UTF-8 Base64 roundtrip for Vietnamese, Japanese and emoji', () => {
  const sample = 'Tiếng Việt 日本語 café 👩‍💻 🌎';
  assert.equal(result('base64-text-decoder', result('base64-text-encoder', sample)), sample);
  assert.equal(result('base64-text-encoder', ' '), 'IA==');
  assert.throws(() => result('base64-text-decoder', '//8='), /not valid UTF-8/);
  assert.throws(() => result('base64-text-decoder', 'not base64!'), /Invalid Base64/);
});

test('URL encoding distinguishes components and malformed Unicode', () => {
  assert.equal(result('url-encoder', 'a & café'), 'a%20%26%20caf%C3%A9');
  assert.equal(result('url-decoder', 'a%20%26%20caf%C3%A9'), 'a & café');
  assert.equal(result('url-decoder', 'a+b'), 'a+b');
  assert.throws(() => result('url-encoder', '\ud800'), /invalid Unicode/);
  assert.throws(() => result('url-decoder', '%C0%AF'), /Invalid percent/);
});

test('HTML entities and casing work as advertised', () => {
  assert.equal(result('html-entity-encoder', '<a href="&">'), '&lt;a href=&quot;&amp;&quot;&gt;');
  assert.equal(result('html-entity-decoder', '&lt;p&gt;© &#169; &copy; &unknown;'), '<p>© © © &unknown;');
  assert.equal(result('text-case-converter', 'hELLO WORLD', 'lower'), 'hello world');
  assert.equal(result('text-case-converter', 'hELLO WORLD', 'title'), 'Hello World');
  assert.equal(result('text-case-converter', 'hello world', 'upper'), 'HELLO WORLD');
});

test('word counter counts empty strings and Unicode graphemes', () => {
  assert.match(result('word-character-counter', ''), /Words: 0/);
  assert.match(result('word-character-counter', '    '), /Words: 0/);
  assert.match(result('word-character-counter', '👩‍💻'), /Characters \(graphemes\): 1/);
  assert.match(result('word-character-counter', 'a\nb'), /Lines: 2/);
});

test('UUIDs are valid version 4 identifiers', () => {
  const uuids = result('uuid-generator', '', '5').split('\n');
  assert.equal(uuids.length, 5);
  assert.equal(new Set(uuids).size, 5);
  for (const uuid of uuids) assert.match(uuid, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);
  assert.throws(() => result('uuid-generator', '', '51'), /between 1 and 50/);
});

test('RGB, HSL and HEX conversions validate ranges', () => {
  assert.match(result('color-code-converter', '#F00'), /HEX: #FF0000/);
  assert.match(result('color-code-converter', 'hsl(120, 100%, 50%)'), /HEX: #00FF00/);
  assert.match(result('color-code-converter', 'rgb(0, 0, 255)'), /HEX: #0000FF/);
  assert.throws(() => result('color-code-converter', 'rgb(256,0,0)'), /RGB channels/);
});

test('Unix timestamps include leap-year checks, unit selection and timezones', () => {
  assert.match(result('unix-timestamp-converter', '0'), /1970-01-01T00:00:00.000Z/);
  assert.match(result('unix-timestamp-converter', '1', 'milliseconds'), /1970-01-01T00:00:00.001Z/);
  assert.match(result('unix-timestamp-converter', '2026-11-11T10:00:00+07:00'), /2026-11-11T03:00:00.000Z/);
  assert.match(result('unix-timestamp-converter', '2024-02-29'), /2024-02-29T00:00:00.000Z/);
  assert.throws(() => result('unix-timestamp-converter', '2026-02-29'), /Invalid calendar date/);
});

test('invalid and oversized inputs produce user-facing errors', () => {
  assert.throws(() => result('json-formatter', ''), /Enter some text/);
  assert.throws(() => result('base64-text-encoder', 'x'.repeat(MAX_TEXT_CHARS + 1)), /1,000,000-character/);
  assert.throws(() => result('unsupported', 'hi'), /Unrecognized text tool/);
});
