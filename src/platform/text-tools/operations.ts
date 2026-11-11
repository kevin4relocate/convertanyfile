/** Pure, browser-friendly utilities shared by all Text & Developer pages. */
export const MAX_TEXT_CHARS = 1_000_000;

export interface TextToolResult { output: string; message: string; }

function requireInput(input: string): void {
  if (!input.trim()) throw new Error('Enter some text to continue.');
  if (input.length > MAX_TEXT_CHARS) throw new Error('Input exceeds the 1,000,000-character safety limit.');
}

function parseJson(input: string): unknown {
  try { return JSON.parse(input) as unknown; }
  catch (error) { throw new Error('Invalid JSON: ' + (error instanceof Error ? error.message : 'could not parse the document.')); }
}

function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 16384) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
  }
  return btoa(binary);
}

function base64ToUtf8(input: string): string {
  const compact = input.replace(/\s+/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) {
    throw new Error('Invalid Base64: use the standard Base64 alphabet with correct padding.');
  }
  const binary = atob(compact);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('Base64 decoded successfully, but its bytes are not valid UTF-8 text.'); }
}

const ENTITIES: Readonly<Record<string, string>> = {
  amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:'\u00a0',
  copy:'©', reg:'®', trade:'™', euro:'€', pound:'£', yen:'¥', cent:'¢',
  mdash:'—', ndash:'–', hellip:'…', times:'×', divide:'÷', laquo:'«', raquo:'»',
  lsquo:'‘', rsquo:'’', ldquo:'“', rdquo:'”', bull:'•', middot:'·',
  deg:'°', micro:'µ', para:'¶', sect:'§',
};
function decodeEntities(input: string): string {
  return input.replace(/&(#(?:[xX][0-9a-fA-F]+|[0-9]+)|[A-Za-z][A-Za-z0-9]+);/g, (whole, token: string) => {
    if (token.startsWith('#')) {
      const hex = token[1]?.toLowerCase() === 'x';
      const value = Number.parseInt(token.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!Number.isInteger(value) || value < 1 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) return '\ufffd';
      return String.fromCodePoint(value);
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, token) ? ENTITIES[token]! : whole;
  });
}

function titleCase(text: string): string {
  return text.toLowerCase().replace(/\p{L}[\p{L}\p{M}'’]*/gu, (word) => word[0]!.toUpperCase() + word.slice(1));
}
function sentenceCase(text: string): string {
  return text.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (_whole, prefix: string, letter: string) => prefix + letter.toUpperCase());
}

function countText(input: string): string {
  const graphemes = new Intl.Segmenter(undefined, { granularity:'grapheme' });
  const words = new Intl.Segmenter(undefined, { granularity:'word' });
  let characterCount = 0;
  let wordCount = 0;
  for (const _ of graphemes.segment(input)) characterCount++;
  for (const segment of words.segment(input)) if (segment.isWordLike) wordCount++;
  return [
    'Words: ' + wordCount,
    'Characters (graphemes): ' + characterCount,
    'Unicode code points: ' + Array.from(input).length,
    'Characters without whitespace: ' + Array.from(graphemes.segment(input)).filter((part) => !/^\s+$/u.test(part.segment)).length,
    'Lines: ' + (input.length ? input.split(/\r\n|\r|\n/).length : 0),
    'UTF-8 bytes: ' + new TextEncoder().encode(input).length,
  ].join('\n');
}

type RGB = { r:number; g:number; b:number };
function channel(value:number): number {
  if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('RGB channels must be integers from 0 to 255.');
  return value;
}
function parseColor(input: string): RGB {
  const value = input.trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    let digits = hex[1]!;
    if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join('');
    return {r:parseInt(digits.slice(0,2),16), g:parseInt(digits.slice(2,4),16), b:parseInt(digits.slice(4,6),16)};
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value);
  if (rgb) return {r:channel(Number(rgb[1])),g:channel(Number(rgb[2])),b:channel(Number(rgb[3]))};
  const hsl = /^hsl\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:deg)?\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i.exec(value);
  if (hsl) {
    const h = Number(hsl[1]), s = Number(hsl[2]), l = Number(hsl[3]);
    if (![h,s,l].every(Number.isFinite) || s > 100 || l > 100) throw new Error('HSL saturation and lightness must be between 0% and 100%.');
    const hue = ((h % 360) + 360) % 360;
    const sat = s / 100, light = l / 100;
    const chroma = (1 - Math.abs(2 * light - 1)) * sat;
    const second = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
    const offset = light - chroma / 2;
    const sector = Math.floor(hue / 60);
    const pairs = [[chroma,second,0],[second,chroma,0],[0,chroma,second],[0,second,chroma],[second,0,chroma],[chroma,0,second]];
    const pair = pairs[sector]!;
    return {r:Math.round((pair[0]!+offset)*255),g:Math.round((pair[1]!+offset)*255),b:Math.round((pair[2]!+offset)*255)};
  }
  throw new Error('Enter #RGB, #RRGGBB, rgb(r, g, b), or hsl(h, s%, l%).');
}
function convertColor(input:string): string {
  const {r,g,b} = parseColor(input);
  const hex = '#' + [r,g,b].map((c)=>c.toString(16).padStart(2,'0')).join('').toUpperCase();
  const rr=r/255,gg=g/255,bb=b/255,max=Math.max(rr,gg,bb),min=Math.min(rr,gg,bb),delta=max-min;
  let hue=0, sat=0;
  const light=(max+min)/2;
  if (delta) {
    sat=delta/(1-Math.abs(2*light-1));
    switch(max) {
      case rr: hue=((gg-bb)/delta)%6; break;
      case gg: hue=(bb-rr)/delta+2; break;
      default: hue=(rr-gg)/delta+4;
    }
    hue=(hue*60+360)%360;
  }
  const round=(n:number)=>Math.round(n*10)/10;
  return 'HEX: ' + hex + '\nRGB: rgb(' + [r,g,b].join(', ') + ')\nHSL: hsl(' + round(hue) + ', ' + round(sat*100) + '%, ' + round(light*100) + '%)';
}

function convertTimestamp(input:string): string {
  const value = input.trim();
  let milliseconds:number;
  if (/^-?\d{1,16}$/.test(value)) {
    milliseconds = Number(value) * (value.replace('-','').length >= 12 ? 1 : 1000);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    milliseconds = Date.parse(value);
  } else throw new Error('Enter Unix seconds, Unix milliseconds, or ISO 8601 with a timezone (or YYYY-MM-DD).');
  const date = new Date(milliseconds);
  if (!Number.isFinite(milliseconds) || Number.isNaN(date.getTime())) throw new Error('This timestamp is outside the supported date range.');
  return [
    'UTC / ISO 8601: ' + date.toISOString(),
    'Local time: ' + date.toLocaleString('en-US', {dateStyle:'full',timeStyle:'long'}),
    'Unix seconds: ' + Math.floor(date.getTime()/1000),
    'Unix milliseconds: ' + date.getTime(),
  ].join('\n');
}

export function runTextTool(id:string, input:string, option=''): TextToolResult {
  if (id === 'uuid-generator') {
    const count = Number(option || '1');
    if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('Choose between 1 and 50 UUIDs.');
    if (!globalThis.crypto?.randomUUID) throw new Error('UUID generation requires a secure browser context (HTTPS).');
    return { output:Array.from({length:count},()=>crypto.randomUUID()).join('\n'), message:count + ' UUID v4 value(s) generated locally.' };
  }
  requireInput(input);
  let output:string;
  switch(id) {
    case 'json-formatter': {
      const spaces = option === '4' ? 4 : 2;
      output = JSON.stringify(parseJson(input), null, spaces);
      break;
    }
    case 'json-validator': {
      const value = parseJson(input);
      const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      output = 'Valid JSON\nRoot value type: ' + type;
      break;
    }
    case 'json-minifier': output = JSON.stringify(parseJson(input)); break;
    case 'base64-text-encoder': output = utf8ToBase64(input); break;
    case 'base64-text-decoder': output = base64ToUtf8(input); break;
    case 'url-encoder': output = encodeURIComponent(input); break;
    case 'url-decoder':
      try {output=decodeURIComponent(input);}
      catch {throw new Error('Invalid percent escapes or invalid UTF-8 in URL component.');}
      break;
    case 'html-entity-encoder': output = input.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); break;
    case 'html-entity-decoder': output = decodeEntities(input); break;
    case 'text-case-converter':
      output = option === 'upper' ? input.toUpperCase() : option === 'lower' ? input.toLowerCase() : option === 'title' ? titleCase(input) : sentenceCase(input);
      break;
    case 'word-character-counter': output = countText(input); break;
    case 'color-code-converter': output = convertColor(input); break;
    case 'unix-timestamp-converter': output = convertTimestamp(input); break;
    default: throw new Error('Unrecognized text tool.');
  }
  return { output, message: 'Processed locally. Source text was not uploaded.' };
}
