import type { ConversionSettings } from '../../platform/converter/types';

export type DataFormat = 'csv' | 'tsv' | 'json' | 'jsonl';
type RecordValue = string | number | boolean | null | unknown[] | Record<string, unknown>;
type Row = Record<string, RecordValue>;
type StructuredSource =
  | { kind: 'table'; rows: Row[]; columns: string[] }
  | { kind: 'json'; value: unknown };

const encoder = new TextEncoder();
const createRow = (): Row => Object.create(null) as Row;
const JSON_NUMBER_PATTERN = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/;

export function decodeUtf8(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(view);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseDelimited(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  // Quoted fields may contain delimiters/newlines, but no trailing junk after closing quotes.
  let state: 'start' | 'unquoted' | 'quoted' | 'after-quote' = 'start';
  const finishField = () => {
    row.push(field);
    field = '';
    state = 'start';
  };
  const finishRow = () => {
    finishField();
    rows.push(row);
    row = [];
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (state === 'quoted') {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else state = 'after-quote';
      } else field += char;
      continue;
    }
    if (char === delimiter) {
      finishField();
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      finishRow();
      continue;
    }
    if (state === 'after-quote') {
      throw new Error('Invalid delimited file: unexpected character after closing quote');
    }
    if (char === '"') {
      if (state !== 'start') throw new Error('Invalid delimited file: unexpected quote in unquoted field');
      state = 'quoted';
      continue;
    }
    field += char;
    state = 'unquoted';
  }
  if (state === 'quoted') throw new Error('Invalid delimited file: unclosed quoted field');
  finishRow();
  if (rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '' && /(?:\r\n|\r|\n)$/.test(text)) rows.pop();
  return rows;
}

function normalizeHeaders(source: string[], width: number): string[] {
  const used = new Set<string>();
  const headers: string[] = [];
  for (let index = 0; index < width; index += 1) {
    const raw = source[index] ?? '';
    const base = raw.trim() ? raw : `column_${index + 1}`;
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) candidate = `${base}_${suffix++}`;
    used.add(candidate);
    headers.push(candidate);
  }
  return headers;
}

function rowsToTable(rows: string[][]): { rows: Row[]; columns: string[] } {
  if (!rows.length || (rows.length === 1 && rows[0]!.every((value) => value === ''))) return { rows: [], columns: [] };
  const width = Math.max(...rows.map((row) => row.length));
  const columns = normalizeHeaders(rows[0] ?? [], width);
  const records = rows.slice(1).map((values) => {
    const record = createRow();
    for (let index = 0; index < columns.length; index += 1) record[columns[index]!] = values[index] ?? '';
    return record;
  });
  return { rows: records, columns };
}

function canonicalJsonNumber(raw: string): string | null {
  const match = raw.match(JSON_NUMBER_PATTERN);
  if (!match) return null;
  const fraction = match[3] ?? '';
  const exponentPart = Number(match[4] ?? '0');
  if (!Number.isSafeInteger(exponentPart)) return null;

  let exponent = exponentPart - fraction.length;
  let digits = `${match[2] ?? ''}${fraction}`.replace(/^0+/, '');
  if (!digits) return '0';
  const withoutTrailingZeros = digits.replace(/0+$/, '');
  exponent += digits.length - withoutTrailingZeros.length;
  digits = withoutTrailingZeros;
  return `${match[1] === '-' ? '-' : ''}${digits}e${exponent}`;
}

export function assertSafeJsonNumbers(text: string): void {
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char !== '-' && (char < '0' || char > '9')) continue;

    let cursor = index;
    if (text[cursor] === '-') cursor += 1;
    const integerStart = cursor;
    if (text[cursor] === '0') cursor += 1;
    else while (cursor < text.length && text[cursor]! >= '0' && text[cursor]! <= '9') cursor += 1;
    if (cursor === integerStart) continue;
    if (text[cursor] === '.') {
      cursor += 1;
      while (cursor < text.length && text[cursor]! >= '0' && text[cursor]! <= '9') cursor += 1;
    }
    if (text[cursor] === 'e' || text[cursor] === 'E') {
      cursor += 1;
      if (text[cursor] === '+' || text[cursor] === '-') cursor += 1;
      while (cursor < text.length && text[cursor]! >= '0' && text[cursor]! <= '9') cursor += 1;
    }

    const raw = text.slice(index, cursor);
    const numeric = Number(raw);
    if (!Number.isNaN(numeric) && (!Number.isFinite(numeric) || Math.abs(numeric) > Number.MAX_SAFE_INTEGER)) {
      throw new Error('JSON contains a numeric value outside the safe browser range. Quote large identifiers or exact large integers as strings before conversion.');
    }

    if (Number.isFinite(numeric)) {
      const sourceValue = canonicalJsonNumber(raw);
      const browserValue = canonicalJsonNumber(String(numeric));
      if ((JSON_NUMBER_PATTERN.test(raw) && !sourceValue) || (sourceValue && browserValue && sourceValue !== browserValue)) {
        throw new Error('JSON contains a numeric value that would lose precision in the browser. Quote exact decimal or high-precision values as strings before conversion.');
      }
    }
    index = cursor - 1;
  }
}

function parseJsonl(text: string): unknown[] {
  const values: unknown[] = [];
  const lines = text.split(/\r?\n|\r/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!line) continue;
    try { assertSafeJsonNumbers(line); values.push(JSON.parse(line)); }
    catch (error) {
      if (error instanceof Error && /safe browser range|lose precision/i.test(error.message)) throw error;
      throw new Error(`Invalid JSONL at line ${index + 1}`);
    }
  }
  return values;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function escapePathSegment(key: string): string {
  return key.replaceAll('\\', '\\\\').replaceAll('.', '\\.');
}

function flattenObject(value: Record<string, unknown>, prefix = '', target: Row = createRow()): Row {
  for (const [key, item] of Object.entries(value)) {
    const segment = escapePathSegment(key);
    const path = prefix ? `${prefix}.${segment}` : segment;
    if (isPlainObject(item)) {
      if (Object.keys(item).length === 0) target[path] = item;
      else flattenObject(item, path, target);
    } else {
      target[path] = item as RecordValue;
    }
  }
  return target;
}

function valuesToRows(value: unknown): Row[] {
  const source = Array.isArray(value) ? value : [value];
  return source.map((item) => {
    if (isPlainObject(item)) {
      if (Object.keys(item).length > 0) return flattenObject(item);
      const emptyObjectRow = createRow();
      emptyObjectRow.value = item;
      return emptyObjectRow;
    }
    const row = createRow();
    row.value = item as RecordValue;
    return row;
  });
}

function cellText(value: RecordValue | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function columnsForRows(rows: Row[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }
  return columns;
}

export function quoteCell(value: string, delimiter: ',' | '\t'): string {
  if (!value.includes(delimiter) && !/["\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function serializeDelimited(rows: Row[], delimiter: ',' | '\t', settings: ConversionSettings, preferredColumns?: string[]): string {
  const columns = preferredColumns?.length ? preferredColumns : columnsForRows(rows);
  if (!columns.length) return '';
  const includeHeader = settings.includeHeader !== false;
  const lineEnding = settings.lineEnding === 'crlf' ? '\r\n' : '\n';
  const lines: string[] = [];
  if (includeHeader) lines.push(columns.map((column) => quoteCell(column, delimiter)).join(delimiter));
  for (const row of rows) lines.push(columns.map((column) => quoteCell(cellText(row[column]), delimiter)).join(delimiter));
  return lines.join(lineEnding);
}

function parseSource(text: string, inputFormat: DataFormat): StructuredSource {
  if (inputFormat === 'json') {
    try { assertSafeJsonNumbers(text); return { kind: 'json', value: JSON.parse(text) }; }
    catch (error) {
      if (error instanceof Error && /safe browser range|lose precision/i.test(error.message)) throw error;
      throw new Error('Invalid JSON input');
    }
  }
  if (inputFormat === 'jsonl') return { kind: 'json', value: parseJsonl(text) };
  const table = rowsToTable(parseDelimited(text, inputFormat === 'csv' ? ',' : '\t'));
  return { kind: 'table', ...table };
}

function sourceJsonValue(source: StructuredSource): unknown {
  return source.kind === 'table' ? source.rows : source.value;
}

function jsonlValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

export function convertDataBytes(input: ArrayBuffer, inputFormat: DataFormat, output: DataFormat, settings: ConversionSettings): ArrayBuffer {
  const text = decodeUtf8(input);
  const source = parseSource(text, inputFormat);
  const value = sourceJsonValue(source);
  let rendered: string;

  if (output === 'json') {
    rendered = JSON.stringify(value, null, settings.pretty === false ? 0 : 2);
  } else if (output === 'jsonl') {
    rendered = jsonlValues(value).map((item) => JSON.stringify(item)).join('\n');
  } else {
    const rows = source.kind === 'table' ? source.rows : valuesToRows(source.value);
    const columns = source.kind === 'table' ? source.columns : undefined;
    rendered = serializeDelimited(rows, output === 'csv' ? ',' : '\t', settings, columns);
    if (settings.bom === true) rendered = `\uFEFF${rendered}`;
  }

  return encoder.encode(rendered).buffer as ArrayBuffer;
}

export function validateDataSample(text: string, format: DataFormat): boolean {
  if (!text.trim()) return false;
  if (text.includes('\0')) return false;
  if (format === 'json') {
    const first = text.trimStart()[0];
    return first === '{' || first === '[';
  }
  if (format === 'jsonl') {
    const lines = text.split(/\r?\n|\r/).map((line) => line.trim()).filter(Boolean).slice(0, 20);
    if (!lines.length) return false;
    return lines.every((line) => {
      try { JSON.parse(line); return true; } catch { return false; }
    });
  }
  return true;
}
