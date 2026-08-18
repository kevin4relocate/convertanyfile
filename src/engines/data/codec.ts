import type { ConversionSettings } from '../../platform/converter/types';

export type DataFormat = 'csv' | 'tsv' | 'json' | 'jsonl';
type RecordValue = string | number | boolean | null | unknown[] | Record<string, unknown>;
type Row = Record<string, RecordValue>;

const encoder = new TextEncoder();

export function decodeUtf8(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(view);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function parseDelimited(text: string, delimiter: ',' | '\t'): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let fieldStarted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && !fieldStarted) {
      quoted = true;
      fieldStarted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      fieldStarted = false;
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      fieldStarted = false;
      continue;
    }
    field += char;
    fieldStarted = true;
  }

  if (quoted) throw new Error('Invalid delimited file: unclosed quoted field');
  row.push(field);
  rows.push(row);
  if (rows.length > 1 && rows.at(-1)?.length === 1 && rows.at(-1)?.[0] === '' && /(?:\r\n|\r|\n)$/.test(text)) rows.pop();
  return rows;
}

function normalizeHeaders(source: string[], width: number): string[] {
  const used = new Map<string, number>();
  const headers: string[] = [];
  for (let index = 0; index < width; index += 1) {
    const raw = (source[index] ?? '').trim();
    const base = raw || `column_${index + 1}`;
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    headers.push(count === 1 ? base : `${base}_${count}`);
  }
  return headers;
}

function rowsToRecords(rows: string[][]): Row[] {
  if (!rows.length || (rows.length === 1 && rows[0]!.every((value) => value === ''))) return [];
  const width = Math.max(...rows.map((row) => row.length));
  const headers = normalizeHeaders(rows[0] ?? [], width);
  return rows.slice(1).filter((row) => row.some((value) => value !== '')).map((values) => {
    const record: Row = {};
    for (let index = 0; index < headers.length; index += 1) record[headers[index]!] = values[index] ?? '';
    return record;
  });
}

function parseJsonl(text: string): unknown[] {
  const values: unknown[] = [];
  const lines = text.split(/\r?\n|\r/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!.trim();
    if (!line) continue;
    try { values.push(JSON.parse(line)); }
    catch { throw new Error(`Invalid JSONL at line ${index + 1}`); }
  }
  return values;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function flattenObject(value: Record<string, unknown>, prefix = '', target: Row = {}): Row {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(item)) flattenObject(item, path, target);
    else target[path] = item as RecordValue;
  }
  return target;
}

function valuesToRows(value: unknown): Row[] {
  const source = Array.isArray(value) ? value : [value];
  return source.map((item) => {
    if (isPlainObject(item)) return flattenObject(item);
    return { value: item as RecordValue };
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

function quoteCell(value: string, delimiter: ',' | '\t'): string {
  if (!value.includes(delimiter) && !/["\r\n]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function serializeDelimited(rows: Row[], delimiter: ',' | '\t', settings: ConversionSettings): string {
  const columns = columnsForRows(rows);
  if (!columns.length) return '';
  const includeHeader = settings.includeHeader !== false;
  const lineEnding = settings.lineEnding === 'crlf' ? '\r\n' : '\n';
  const lines: string[] = [];
  if (includeHeader) lines.push(columns.map((column) => quoteCell(column, delimiter)).join(delimiter));
  for (const row of rows) lines.push(columns.map((column) => quoteCell(cellText(row[column]), delimiter)).join(delimiter));
  return lines.join(lineEnding);
}

function sourceValue(text: string, inputFormat: DataFormat): unknown {
  if (inputFormat === 'json') {
    try { return JSON.parse(text); }
    catch { throw new Error('Invalid JSON input'); }
  }
  if (inputFormat === 'jsonl') return parseJsonl(text);
  return rowsToRecords(parseDelimited(text, inputFormat === 'csv' ? ',' : '\t'));
}

function jsonlValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}

export function convertDataBytes(input: ArrayBuffer, inputFormat: DataFormat, output: DataFormat, settings: ConversionSettings): ArrayBuffer {
  const text = decodeUtf8(input);
  const value = sourceValue(text, inputFormat);
  let rendered: string;

  if (output === 'json') {
    rendered = JSON.stringify(value, null, settings.pretty === false ? 0 : 2);
  } else if (output === 'jsonl') {
    rendered = jsonlValues(value).map((item) => JSON.stringify(item)).join('\n');
  } else {
    rendered = serializeDelimited(valuesToRows(value), output === 'csv' ? ',' : '\t', settings);
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
