import type { ConversionSettings } from '../../platform/converter/types';

export type SubtitleInputFormat = 'srt' | 'vtt' | 'ass' | 'ssa' | 'sbv';
export type SubtitleOutputFormat = 'srt' | 'vtt' | 'sbv' | 'txt';

export interface SubtitleCue {
  startMs: number;
  endMs: number;
  text: string;
  id?: string;
  settings?: string;
}

export interface SubtitleAnalysis {
  cueCount: number;
  firstStartMs: number;
  lastEndMs: number;
  encoding: 'UTF-8' | 'UTF-16LE' | 'UTF-16BE' | 'Windows-1252';
  hasRichFormatting: boolean;
  hasVttMetadata: boolean;
}

const MAX_CUES = 100_000;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

function decodeWith(label: string, bytes: Uint8Array, offset = 0): string {
  return new TextDecoder(label, { fatal: true }).decode(bytes.subarray(offset));
}

function decodeSubtitleBytesDetailed(input: ArrayBuffer): { text: string; encoding: SubtitleAnalysis['encoding'] } {
  const bytes = new Uint8Array(input);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { text: decodeWith('utf-8', bytes, 3), encoding: 'UTF-8' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: decodeWith('utf-16le', bytes, 2), encoding: 'UTF-16LE' };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: decodeWith('utf-16be', bytes, 2), encoding: 'UTF-16BE' };
  }
  try {
    return { text: decodeWith('utf-8', bytes), encoding: 'UTF-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'Windows-1252' };
  }
}

export function decodeSubtitleBytes(input: ArrayBuffer): string {
  return decodeSubtitleBytesDetailed(input).text;
}

function parseMillisecondsClock(raw: string, allowMinuteOnly: boolean): number {
  const value = raw.trim().replace(',', '.');
  const parts = value.split(':');
  if (parts.length !== 3 && !(allowMinuteOnly && parts.length === 2)) throw new Error(`Invalid subtitle timestamp: ${raw}`);

  const hoursRaw = parts.length === 3 ? (parts[0] ?? '') : '0';
  const minutesRaw = parts.length === 3 ? (parts[1] ?? '') : (parts[0] ?? '');
  const secondsPart = parts.at(-1) ?? '';
  const match = secondsPart.match(/^(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!match || !/^\d+$/.test(hoursRaw) || !/^\d{1,2}$/.test(minutesRaw)) throw new Error(`Invalid subtitle timestamp: ${raw}`);

  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const seconds = Number(match[1] ?? Number.NaN);
  const millis = Number((match[2] ?? '0').padEnd(3, '0').slice(0, 3));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds) || hours < 0 || minutes < 0 || minutes > 59 || seconds > 59) {
    throw new Error(`Invalid subtitle timestamp: ${raw}`);
  }
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis;
}

function parseAssClock(raw: string): number {
  const match = raw.trim().match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})[.:](\d{1,2})$/);
  if (!match) throw new Error(`Invalid ASS/SSA timestamp: ${raw}`);
  const hours = Number(match[1] ?? Number.NaN);
  const minutes = Number(match[2] ?? Number.NaN);
  const seconds = Number(match[3] ?? Number.NaN);
  const centiseconds = Number((match[4] ?? '').padEnd(2, '0').slice(0, 2));
  if (![hours, minutes, seconds, centiseconds].every(Number.isFinite) || minutes > 59 || seconds > 59) {
    throw new Error(`Invalid ASS/SSA timestamp: ${raw}`);
  }
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + centiseconds * 10;
}

function parseArrowTiming(line: string, format: 'srt' | 'vtt'): { startMs: number; endMs: number; settings?: string } {
  const arrow = line.indexOf('-->');
  if (arrow < 0) throw new Error(`Invalid ${format.toUpperCase()} cue timing`);
  const left = line.slice(0, arrow).trim();
  const rightParts = line.slice(arrow + 3).trim().split(/\s+/);
  const right = rightParts.shift();
  if (!left || !right) throw new Error(`Invalid ${format.toUpperCase()} cue timing`);
  const startMs = parseMillisecondsClock(left, format === 'vtt');
  const endMs = parseMillisecondsClock(right, format === 'vtt');
  if (endMs < startMs) throw new Error('Subtitle cue ends before it starts');
  return { startMs, endMs, settings: format === 'vtt' && rightParts.length ? rightParts.join(' ') : undefined };
}

function ensureCues(cues: SubtitleCue[]): SubtitleCue[] {
  if (!cues.length) throw new Error('No subtitle cues were found');
  if (cues.length > MAX_CUES) throw new Error(`Subtitle contains more than ${MAX_CUES.toLocaleString('en-US')} cues`);
  return cues;
}

function parseSrt(text: string): SubtitleCue[] {
  const normalized = normalizeNewlines(text).replace(/^\uFEFF/, '').trim();
  const blocks = normalized ? normalized.split(/\n{2,}/) : [];
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex < 0) throw new Error('Malformed SRT cue: missing timestamp line');
    if (timingIndex > 1) throw new Error('Malformed SRT cue header');
    if (timingIndex === 1 && !/^\s*\d+\s*$/.test(lines[0] ?? '')) throw new Error('Malformed SRT cue number');
    const timingLine = lines[timingIndex] ?? '';
    const timing = parseArrowTiming(timingLine, 'srt');
    cues.push({ ...timing, text: lines.slice(timingIndex + 1).join('\n') });
  }
  return ensureCues(cues);
}

function parseVtt(text: string): SubtitleCue[] {
  const lines = normalizeNewlines(text).replace(/^\uFEFF/, '').split('\n');
  const lineAt = (index: number): string => lines[index] ?? '';
  if (!/^WEBVTT(?:[ \t].*)?$/i.test(lineAt(0).trim())) throw new Error('Invalid WebVTT header');
  const cues: SubtitleCue[] = [];
  let i = 1;
  while (i < lines.length) {
    while (i < lines.length && !lineAt(i).trim()) i += 1;
    if (i >= lines.length) break;
    const current = lineAt(i).trim();
    if (/^(NOTE|STYLE|REGION)(?:\s|$)/i.test(current)) {
      i += 1;
      while (i < lines.length && lineAt(i).trim()) i += 1;
      continue;
    }
    if (/^X-TIMESTAMP-MAP=/i.test(current)) { i += 1; continue; }

    let id: string | undefined;
    let timingLine = lineAt(i);
    if (!timingLine.includes('-->')) {
      id = timingLine.trim() || undefined;
      i += 1;
      timingLine = lineAt(i);
    }
    if (!timingLine.includes('-->')) throw new Error('Malformed WebVTT cue: missing timestamp line');
    const timing = parseArrowTiming(timingLine, 'vtt');
    i += 1;
    const textLines: string[] = [];
    while (i < lines.length && lineAt(i).trim() !== '') {
      textLines.push(lineAt(i));
      i += 1;
    }
    cues.push({ ...timing, text: textLines.join('\n'), id });
  }
  return ensureCues(cues);
}

function splitAssFields(payload: string, count: number): string[] {
  if (count < 2) throw new Error('Invalid ASS/SSA Events format');
  const values: string[] = [];
  let rest = payload;
  for (let i = 0; i < count - 1; i += 1) {
    const comma = rest.indexOf(',');
    if (comma < 0) throw new Error('Malformed ASS/SSA Dialogue line');
    values.push(rest.slice(0, comma));
    rest = rest.slice(comma + 1);
  }
  values.push(rest);
  return values;
}

function cleanAssText(value: string): string {
  return value
    .replace(/\{[^}]*\}/g, '')
    .replace(/\\[Nn]/g, '\n')
    .replace(/\\h/g, ' ')
    .trim();
}

function parseAss(text: string): SubtitleCue[] {
  const lines = normalizeNewlines(text).replace(/^\uFEFF/, '').split('\n');
  const cues: SubtitleCue[] = [];
  let inEvents = false;
  let fields = ['layer', 'start', 'end', 'style', 'name', 'marginl', 'marginr', 'marginv', 'effect', 'text'];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      inEvents = (section[1] ?? '').toLowerCase() === 'events';
      continue;
    }
    if (!inEvents || !line) continue;
    if (/^Format\s*:/i.test(line)) {
      fields = line.slice(line.indexOf(':') + 1).split(',').map((item) => item.trim().toLowerCase());
      continue;
    }
    if (!/^Dialogue\s*:/i.test(line)) continue;
    const startIndex = fields.indexOf('start');
    const endIndex = fields.indexOf('end');
    const textIndex = fields.indexOf('text');
    if (startIndex < 0 || endIndex < 0 || textIndex < 0) throw new Error('ASS/SSA Events format is missing Start, End, or Text');
    const values = splitAssFields(rawLine.slice(rawLine.indexOf(':') + 1).trimStart(), fields.length);
    const startRaw = values[startIndex] ?? '';
    const endRaw = values[endIndex] ?? '';
    const textRaw = values[textIndex] ?? '';
    const startMs = parseAssClock(startRaw);
    const endMs = parseAssClock(endRaw);
    if (endMs < startMs) throw new Error('Subtitle cue ends before it starts');
    cues.push({ startMs, endMs, text: cleanAssText(textRaw) });
  }
  return ensureCues(cues);
}

function parseSbv(text: string): SubtitleCue[] {
  const normalized = normalizeNewlines(text).replace(/^\uFEFF/, '').trim();
  const blocks = normalized ? normalized.split(/\n{2,}/) : [];
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timing = lines.shift()?.trim() ?? '';
    const comma = timing.indexOf(',');
    if (comma < 0) throw new Error('Malformed SBV cue: missing timestamp range');
    const startMs = parseMillisecondsClock(timing.slice(0, comma), false);
    const endMs = parseMillisecondsClock(timing.slice(comma + 1), false);
    if (endMs < startMs) throw new Error('Subtitle cue ends before it starts');
    cues.push({ startMs, endMs, text: lines.join('\n') });
  }
  return ensureCues(cues);
}

export function parseSubtitleText(text: string, format: SubtitleInputFormat): SubtitleCue[] {
  if (format === 'srt') return parseSrt(text);
  if (format === 'vtt') return parseVtt(text);
  if (format === 'ass' || format === 'ssa') return parseAss(text);
  if (format === 'sbv') return parseSbv(text);
  throw new Error('Unsupported subtitle input format');
}

export function analyzeSubtitleBytes(input: ArrayBuffer, format: SubtitleInputFormat): SubtitleAnalysis {
  const decoded = decodeSubtitleBytesDetailed(input);
  const cues = parseSubtitleText(decoded.text, format);
  let firstStartMs = Number.POSITIVE_INFINITY;
  let lastEndMs = 0;
  let inlineFormatting = false;
  let cueMetadata = false;

  for (const cue of cues) {
    firstStartMs = Math.min(firstStartMs, cue.startMs);
    lastEndMs = Math.max(lastEndMs, cue.endMs);
    if (/<[^>]+>/.test(cue.text) || /\{\\[^}]+\}/.test(cue.text)) inlineFormatting = true;
    if (cue.id || cue.settings) cueMetadata = true;
  }

  const normalized = normalizeNewlines(decoded.text);
  const hasVttMetadata = format === 'vtt' && (cueMetadata || /(?:^|\n)\s*(?:STYLE|REGION|NOTE|X-TIMESTAMP-MAP)(?:\s|=|$)/im.test(normalized));
  const hasRichFormatting = format === 'ass' || format === 'ssa' || inlineFormatting || hasVttMetadata;

  return {
    cueCount: cues.length,
    firstStartMs: Number.isFinite(firstStartMs) ? firstStartMs : 0,
    lastEndMs,
    encoding: decoded.encoding,
    hasRichFormatting,
    hasVttMetadata,
  };
}

function pad(value: number, width: number): string { return String(value).padStart(width, '0'); }
function timeParts(ms: number): { hours: number; minutes: number; seconds: number; millis: number } {
  const safe = Math.max(0, Math.floor(ms));
  return {
    hours: Math.floor(safe / 3_600_000),
    minutes: Math.floor((safe % 3_600_000) / 60_000),
    seconds: Math.floor((safe % 60_000) / 1000),
    millis: safe % 1000,
  };
}
function formatSrtTime(ms: number): string { const p = timeParts(ms); return `${pad(p.hours, 2)}:${pad(p.minutes, 2)}:${pad(p.seconds, 2)},${pad(p.millis, 3)}`; }
function formatVttTime(ms: number): string { const p = timeParts(ms); return `${pad(p.hours, 2)}:${pad(p.minutes, 2)}:${pad(p.seconds, 2)}.${pad(p.millis, 3)}`; }
function formatSbvTime(ms: number): string { const p = timeParts(ms); return `${p.hours}:${pad(p.minutes, 2)}:${pad(p.seconds, 2)}.${pad(p.millis, 3)}`; }

function decodeEntityToken(token: string): string {
  const normalized = token.toLowerCase();
  if (normalized === 'nbsp') return ' ';
  if (normalized === 'amp') return '&';
  if (normalized === 'lt') return '<';
  if (normalized === 'gt') return '>';
  if (normalized === 'quot') return '"';
  if (normalized === '#39' || normalized === 'apos') return "'";
  if (normalized.startsWith('#x')) {
    const value = Number.parseInt(normalized.slice(2), 16);
    if (Number.isInteger(value) && value >= 0 && value <= 0x10ffff) {
      try { return String.fromCodePoint(value); } catch { return `&${token};`; }
    }
  }
  if (normalized.startsWith('#')) {
    const value = Number.parseInt(normalized.slice(1), 10);
    if (Number.isInteger(value) && value >= 0 && value <= 0x10ffff) {
      try { return String.fromCodePoint(value); } catch { return `&${token};`; }
    }
  }
  return `&${token};`;
}

function plainText(value: string): string {
  return value
    .replace(/<v(?:\.[^ >]+)*\s+([^>]+)>/gi, '$1: ')
    .replace(/\{\\[^}]+\}/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&([^;\s]+);/g, (_match, token: string) => decodeEntityToken(token));
}

function applyCueTransforms(cues: SubtitleCue[], settings: ConversionSettings): SubtitleCue[] {
  const timingShiftMs = Number(settings.timingShiftMs ?? 0);
  if (!Number.isFinite(timingShiftMs)) throw new Error('Invalid subtitle timing shift');
  const stripFormatting = settings.stripFormatting === true;

  return cues.map((cue) => {
    const startMs = cue.startMs + timingShiftMs;
    const endMs = cue.endMs + timingShiftMs;
    if (startMs < 0 || endMs < 0) throw new Error('Timing shift moves a cue before 00:00. Reduce the negative shift.');
    return {
      ...cue,
      startMs,
      endMs,
      text: stripFormatting ? plainText(cue.text) : cue.text,
    };
  });
}

function serializeSrt(cues: SubtitleCue[]): string {
  return cues.map((cue, index) => `${index + 1}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}\n${cue.text}`).join('\n\n');
}
function serializeVtt(cues: SubtitleCue[]): string {
  const body = cues.map((cue) => {
    const id = cue.id ? `${cue.id}\n` : '';
    const settings = cue.settings ? ` ${cue.settings}` : '';
    return `${id}${formatVttTime(cue.startMs)} --> ${formatVttTime(cue.endMs)}${settings}\n${cue.text}`;
  }).join('\n\n');
  return `WEBVTT\n\n${body}`;
}
function serializeSbv(cues: SubtitleCue[]): string {
  return cues.map((cue) => `${formatSbvTime(cue.startMs)},${formatSbvTime(cue.endMs)}\n${cue.text}`).join('\n\n');
}
function serializeTxt(cues: SubtitleCue[], settings: ConversionSettings): string {
  const mode = settings.timestampMode === 'start' || settings.timestampMode === 'range' ? settings.timestampMode : 'none';
  const separator = settings.cueSpacing === 'single' ? '\n' : '\n\n';
  return cues.map((cue) => {
    const text = plainText(cue.text);
    if (mode === 'start') return `[${formatVttTime(cue.startMs)}] ${text}`;
    if (mode === 'range') return `[${formatVttTime(cue.startMs)} → ${formatVttTime(cue.endMs)}] ${text}`;
    return text;
  }).join(separator);
}

function encodeOutput(text: string, settings: ConversionSettings): ArrayBuffer {
  const lineEnding = settings.lineEnding === 'crlf' ? '\r\n' : '\n';
  const normalized = normalizeNewlines(text).replace(/\n/g, lineEnding);
  const bytes = new TextEncoder().encode(normalized);
  if (settings.bom !== true) return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const output = new Uint8Array(bytes.length + 3);
  output.set([0xef, 0xbb, 0xbf]);
  output.set(bytes, 3);
  return output.buffer;
}

export function convertSubtitleBytes(
  input: ArrayBuffer,
  inputFormat: SubtitleInputFormat,
  outputFormat: SubtitleOutputFormat,
  settings: ConversionSettings,
): ArrayBuffer {
  const decoded = decodeSubtitleBytesDetailed(input);
  const timingShiftMs = Number(settings.timingShiftMs ?? 0);
  const stripFormatting = settings.stripFormatting === true;

  // A no-transform VTT → VTT pass keeps document-level STYLE, REGION, NOTE,
  // X-TIMESTAMP-MAP and other metadata that a cue-only compatibility model
  // cannot faithfully rebuild. Line endings and UTF-8 BOM may still change.
  if (inputFormat === 'vtt' && outputFormat === 'vtt' && timingShiftMs === 0 && !stripFormatting) {
    parseSubtitleText(decoded.text, 'vtt');
    return encodeOutput(decoded.text, settings);
  }

  const cues = applyCueTransforms(parseSubtitleText(decoded.text, inputFormat), settings);
  let text: string;
  if (outputFormat === 'srt') text = serializeSrt(cues);
  else if (outputFormat === 'vtt') text = serializeVtt(cues);
  else if (outputFormat === 'sbv') text = serializeSbv(cues);
  else if (outputFormat === 'txt') text = serializeTxt(cues, settings);
  else throw new Error('Unsupported subtitle output format');
  return encodeOutput(text, settings);
}
