import JSZip from 'jszip';
import { decodeWithLibarchive } from './libarchive-decoder';

export type ArchiveFormat = 'zip' | 'tar' | 'tgz';
export type ArchiveInputFormat = ArchiveFormat | 'gz' | '7z' | 'rar';

interface ArchiveEntry {
  path: string;
  kind: 'file' | 'directory';
  data: Uint8Array;
  modified?: Date;
  mode?: number;
}

export interface ArchiveRepackOptions {
  sourceName?: string;
  zipCompression?: 'store' | 'balanced' | 'maximum';
}

const MAX_ENTRIES = 2_000;
const MAX_ENTRY_BYTES = 100 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 250 * 1024 * 1024;
const MAX_PATH_BYTES = 4_096;
const TAR_BLOCK = 512;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function archiveError(message: string): Error {
  return new Error(message);
}

function requireSafePath(input: string): string {
  if (!input) throw archiveError('Archive contains an unsafe file path');
  if (/[\u0000-\u001f\u007f]/.test(input)) throw archiveError('Archive path contains control characters');
  const slashNormalized = input.replace(/\\/g, '/');
  if (slashNormalized.startsWith('/') || /^[A-Za-z]:\//.test(slashNormalized)) throw archiveError('Archive contains an unsafe file path');
  const parts = slashNormalized.split('/').filter((part) => part && part !== '.');
  if (!parts.length || parts.some((part) => part === '..')) throw archiveError('Archive contains an unsafe file path');
  const path = parts.join('/');
  if (encoder.encode(path).byteLength > MAX_PATH_BYTES) throw archiveError(`Archive path exceeds the ${MAX_PATH_BYTES}-byte safety limit`);
  return path;
}

function ensureBudget(count: number, total: number, next: number): void {
  if (count > MAX_ENTRIES) throw archiveError(`Archive contains more than ${MAX_ENTRIES} entries`);
  if (next > MAX_ENTRY_BYTES) throw archiveError('Archive entry exceeds the 100 MB extracted-size limit');
  if (total + next > MAX_EXTRACTED_BYTES) throw archiveError('Archive expands beyond the 250 MB safety limit');
}

function assertUniquePaths(entries: readonly ArchiveEntry[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.path.normalize('NFC');
    if (seen.has(key)) throw archiveError(`Archive contains duplicate path: ${entry.path}`);
    seen.add(key);
  }
}

function permissionMode(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value & 0o777;
  if (typeof value === 'string' && /^[0-7]+$/.test(value)) return Number.parseInt(value, 8) & 0o777;
  return fallback;
}


interface BoundedZipStream {
  on(event: 'data' | 'error' | 'end', callback: (...args: any[]) => void): BoundedZipStream;
  pause(): void;
  resume(): void;
}

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

/**
 * Read a ZIP entry with bounded decompression and CRC verification.
 * Do not use JSZip.loadAsync({ checkCRC32: true }): that eagerly inflates
 * every entry before our archive expansion budgets can be enforced.
 */
function extractZipEntryBounded(file: JSZip.JSZipObject, remainingBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    let crc = 0xffffffff;
    let settled = false;
    const stream = (file as JSZip.JSZipObject & { internalStream(type: string): BoundedZipStream }).internalStream('uint8array');
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      stream.pause();
      reject(error);
    };
    stream.on('data', (chunk: Uint8Array) => {
      if (settled) return;
      total += chunk.byteLength;
      if (total > MAX_ENTRY_BYTES || total > remainingBytes) {
        fail(archiveError('Archive expands beyond its extracted-size safety limit'));
        return;
      }
      for (const byte of chunk) crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
      chunks.push(chunk);
    });
    stream.on('error', (error: Error) => fail(error));
    stream.on('end', () => {
      if (settled) return;
      const expected = (file as unknown as { _data?: { crc32?: number; uncompressedSize?: number } })._data;
      if (expected && Number.isFinite(expected.uncompressedSize) && expected.uncompressedSize !== total) {
        fail(archiveError('ZIP entry extracted size does not match its header'));
        return;
      }
      if (typeof expected?.crc32 === 'number' && ((crc ^ 0xffffffff) >>> 0) !== (expected.crc32 >>> 0)) {
        fail(archiveError('ZIP entry CRC32 mismatch'));
        return;
      }
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      settled = true;
      resolve(result);
    });
    stream.resume();
  });
}

async function unzip(bytes: ArrayBuffer): Promise<ArchiveEntry[]> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(bytes, { checkCRC32: false, createFolders: true }); }
  catch { throw archiveError('Invalid, corrupt, encrypted, or unsupported ZIP archive'); }

  const files = Object.values(zip.files);
  if (files.length > MAX_ENTRIES) throw archiveError(`Archive contains more than ${MAX_ENTRIES} entries`);

  // Reject oversized declared entries before decompressing anything.
  let declaredTotal = 0;
  for (const file of files) {
    const unsafeOriginal = (file as unknown as { unsafeOriginalName?: string }).unsafeOriginalName;
    requireSafePath(unsafeOriginal ?? file.name);
    if (file.dir) continue;
    const declared = Number((file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0);
    if (!Number.isSafeInteger(declared) || declared < 0) throw archiveError('Archive entry has an invalid extracted size');
    ensureBudget(files.length, declaredTotal, declared);
    declaredTotal += declared;
  }

  const entries: ArchiveEntry[] = [];
  let total = 0;
  for (const file of files) {
    const unsafeOriginal = (file as unknown as { unsafeOriginalName?: string }).unsafeOriginalName;
    const path = requireSafePath(unsafeOriginal ?? file.name);
    if (file.dir) {
      entries.push({ path, kind: 'directory', data: new Uint8Array(), modified: file.date, mode: permissionMode((file as unknown as { unixPermissions?: unknown }).unixPermissions, 0o755) });
      continue;
    }
    const data = await extractZipEntryBounded(file, MAX_EXTRACTED_BYTES - total);
    ensureBudget(entries.length + 1, total, data.byteLength);
    total += data.byteLength;
    entries.push({
      path, kind: 'file', data, modified: file.date,
      mode: permissionMode((file as unknown as { unixPermissions?: unknown }).unixPermissions, 0o644),
    });
  }
  if (!entries.length) throw archiveError('ZIP archive does not contain any entries');
  return entries;
}

function parseOctal(bytes: Uint8Array): number {
  const text = decoder.decode(bytes).replace(/\0.*$/, '').trim();
  if (!text) return 0;
  const value = Number.parseInt(text, 8);
  return Number.isFinite(value) ? value : NaN;
}

function readTarString(bytes: Uint8Array): string {
  const end = bytes.indexOf(0);
  return decoder.decode(end >= 0 ? bytes.subarray(0, end) : bytes).trim();
}

function tarChecksum(header: Uint8Array): number {
  let sum = 0;
  for (let index = 0; index < TAR_BLOCK; index += 1) sum += index >= 148 && index < 156 ? 32 : header[index]!;
  return sum;
}

function validateTarHeader(header: Uint8Array): void {
  const expected = parseOctal(header.subarray(148, 156));
  if (!Number.isFinite(expected) || expected !== tarChecksum(header)) throw archiveError('Invalid TAR header checksum');
}

function parsePax(data: Uint8Array): Record<string, string> {
  const fields: Record<string, string> = {};
  let offset = 0;
  while (offset < data.byteLength) {
    let space = offset;
    while (space < data.byteLength && data[space] !== 32) space += 1;
    if (space === data.byteLength) throw archiveError('Invalid PAX metadata record');
    const lengthText = decoder.decode(data.subarray(offset, space));
    const length = Number.parseInt(lengthText, 10);
    if (!Number.isFinite(length) || length <= 0 || offset + length > data.byteLength) throw archiveError('Invalid PAX metadata record');
    const record = decoder.decode(data.subarray(space + 1, offset + length));
    const trimmed = record.endsWith('\n') ? record.slice(0, -1) : record;
    const equals = trimmed.indexOf('=');
    if (equals > 0) fields[trimmed.slice(0, equals)] = trimmed.slice(equals + 1);
    offset += length;
  }
  return fields;
}

function unsupportedTarEntry(type: string): Error {
  const label = type === '1'
    ? 'hard link'
    : type === '2'
      ? 'symbolic link'
      : type === '3' || type === '4'
        ? 'device entry'
        : type === '6'
          ? 'FIFO entry'
          : `special entry type ${JSON.stringify(type)}`;
  return archiveError(`TAR archive contains an unsupported ${label}`);
}

function untar(bytes: Uint8Array): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];
  let offset = 0;
  let total = 0;
  let pendingPax: Record<string, string> = {};
  let globalPax: Record<string, string> = {};
  let pendingLongName: string | undefined;

  while (offset + TAR_BLOCK <= bytes.byteLength) {
    const header = bytes.subarray(offset, offset + TAR_BLOCK);
    if (header.every((value) => value === 0)) break;
    validateTarHeader(header);

    const headerSize = parseOctal(header.subarray(124, 136));
    if (!Number.isFinite(headerSize) || headerSize < 0) throw archiveError('Invalid TAR entry size');
    const dataStart = offset + TAR_BLOCK;
    const dataEnd = dataStart + headerSize;
    if (dataEnd > bytes.byteLength) throw archiveError('Unexpected end of TAR archive');
    const data = bytes.slice(dataStart, dataEnd);
    const type = String.fromCharCode(header[156] || 48);

    if (type === 'x' || type === 'g') {
      const pax = parsePax(data);
      if (type === 'g') globalPax = { ...globalPax, ...pax };
      else pendingPax = pax;
      offset = dataStart + Math.ceil(headerSize / TAR_BLOCK) * TAR_BLOCK;
      continue;
    }
    if (type === 'L') {
      pendingLongName = readTarString(data);
      offset = dataStart + Math.ceil(headerSize / TAR_BLOCK) * TAR_BLOCK;
      continue;
    }

    const name = readTarString(header.subarray(0, 100));
    const prefix = readTarString(header.subarray(345, 500));
    const metadata = { ...globalPax, ...pendingPax };
    const rawPath = metadata.path || pendingLongName || (prefix ? `${prefix}/${name}` : name);
    const path = requireSafePath(rawPath);
    const mtimeHeader = parseOctal(header.subarray(136, 148));
    const mtimeValue = metadata.mtime ? Number.parseFloat(metadata.mtime) : mtimeHeader;
    const modified = Number.isFinite(mtimeValue) && mtimeValue > 0 ? new Date(mtimeValue * 1000) : undefined;
    const mode = permissionMode(parseOctal(header.subarray(100, 108)), type === '5' ? 0o755 : 0o644);

    if (type === '0' || type === '\0' || type === '7') {
      ensureBudget(entries.length + 1, total, data.byteLength);
      total += data.byteLength;
      entries.push({ path, kind: 'file', data, modified, mode });
    } else if (type === '5') {
      ensureBudget(entries.length + 1, total, 0);
      entries.push({ path, kind: 'directory', data: new Uint8Array(), modified, mode });
    } else {
      throw unsupportedTarEntry(type);
    }

    pendingPax = {};
    pendingLongName = undefined;
    offset = dataStart + Math.ceil(headerSize / TAR_BLOCK) * TAR_BLOCK;
  }
  if (!entries.length) throw archiveError('TAR archive does not contain extractable files or directories');
  return entries;
}

async function gunzipLimited(bytes: ArrayBuffer): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw archiveError('Gzip archives are not supported by this browser');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_EXTRACTED_BYTES) {
        await reader.cancel();
        throw archiveError('Gzip archive expands beyond the 250 MB safety limit');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output = new Uint8Array(total);
  let outputOffset = 0;
  for (const chunk of chunks) { output.set(chunk, outputOffset); outputOffset += chunk.byteLength; }
  return output;
}

function gzipEntryName(sourceName = 'decompressed-file'): string {
  const normalized = sourceName.replace(/\\/g, '/').split('/').pop() || 'decompressed-file';
  const lower = normalized.toLowerCase();
  const stripped = lower.endsWith('.gzip') ? normalized.slice(0, -5) : lower.endsWith('.gz') ? normalized.slice(0, -3) : normalized;
  return requireSafePath(stripped || 'decompressed-file');
}

function writeText(target: Uint8Array, offset: number, length: number, value: string): void {
  const encoded = encoder.encode(value);
  if (encoded.byteLength > length) throw archiveError('Archive contains a path that is too long for TAR');
  target.set(encoded, offset);
}

function writeOctal(target: Uint8Array, offset: number, length: number, value: number): void {
  const text = Math.max(0, Math.floor(value)).toString(8).padStart(length - 1, '0').slice(-(length - 1));
  writeText(target, offset, length - 1, text);
  target[offset + length - 1] = 0;
}

function splitTarPath(path: string): { name: string; prefix: string } {
  if (encoder.encode(path).byteLength <= 100) return { name: path, prefix: '' };
  const slashPositions = [...path].map((char, index) => char === '/' ? index : -1).filter((index) => index >= 0).reverse();
  for (const index of slashPositions) {
    const prefix = path.slice(0, index);
    const name = path.slice(index + 1);
    if (encoder.encode(prefix).byteLength <= 155 && encoder.encode(name).byteLength <= 100) return { name, prefix };
  }
  throw archiveError('Archive contains a path that is too long for USTAR output');
}

function buildTar(entries: readonly ArchiveEntry[]): Uint8Array {
  const blocks = entries.reduce((sum, entry) => sum + 1 + (entry.kind === 'file' ? Math.ceil(entry.data.byteLength / TAR_BLOCK) : 0), 0) + 2;
  const output = new Uint8Array(blocks * TAR_BLOCK);
  let offset = 0;
  for (const entry of entries) {
    const path = splitTarPath(entry.path);
    const header = output.subarray(offset, offset + TAR_BLOCK);
    writeText(header, 0, 100, path.name);
    writeOctal(header, 100, 8, entry.mode ?? (entry.kind === 'directory' ? 0o755 : 0o644));
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, entry.kind === 'file' ? entry.data.byteLength : 0);
    writeOctal(header, 136, 12, Math.floor((entry.modified?.getTime() ?? Date.now()) / 1000));
    header.fill(32, 148, 156);
    header[156] = entry.kind === 'directory' ? 53 : 48;
    writeText(header, 257, 6, 'ustar');
    header[262] = 0;
    writeText(header, 263, 2, '00');
    if (path.prefix) writeText(header, 345, 155, path.prefix);
    const checksum = tarChecksum(header);
    const checksumText = checksum.toString(8).padStart(6, '0').slice(-6);
    writeText(header, 148, 6, checksumText);
    header[154] = 0;
    header[155] = 32;
    offset += TAR_BLOCK;
    if (entry.kind === 'file') {
      output.set(entry.data, offset);
      offset += Math.ceil(entry.data.byteLength / TAR_BLOCK) * TAR_BLOCK;
    }
  }
  return output;
}

async function gzip(bytes: Uint8Array): Promise<ArrayBuffer> {
  if (typeof CompressionStream === 'undefined') throw archiveError('Gzip output is not supported by this browser');
  return new Response(new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
}

async function readEntries(input: ArrayBuffer, format: ArchiveInputFormat, sourceName?: string): Promise<ArchiveEntry[]> {
  if (format === 'zip') return unzip(input);
  if (format === 'tar') return untar(new Uint8Array(input));
  if (format === 'tgz') return untar(await gunzipLimited(input));
  if (format === '7z' || format === 'rar') {
    const entries = await decodeWithLibarchive(input, { requireSafePath, ensureBudget });
    return entries.map((entry) => ({
      ...entry,
      mode: entry.kind === 'directory' ? 0o755 : 0o644,
    }));
  }
  const data = await gunzipLimited(input);
  ensureBudget(1, 0, data.byteLength);
  return [{ path: gzipEntryName(sourceName), kind: 'file', data, mode: 0o644 }];
}

function zipOptions(compression: ArchiveRepackOptions['zipCompression']): { compression: 'STORE' | 'DEFLATE'; compressionOptions?: { level: number } } {
  if (compression === 'store') return { compression: 'STORE' };
  return { compression: 'DEFLATE', compressionOptions: { level: compression === 'maximum' ? 9 : 6 } };
}

export async function repackArchive(input: ArrayBuffer, inputFormat: ArchiveInputFormat, outputFormat: ArchiveFormat, options: ArchiveRepackOptions = {}): Promise<ArrayBuffer> {
  const entries = await readEntries(input, inputFormat, options.sourceName);
  assertUniquePaths(entries);
  if (outputFormat === 'zip') {
    const zip = new JSZip();
    for (const entry of entries) {
      if (entry.kind === 'directory') zip.folder(entry.path);
      else zip.file(entry.path, entry.data, { date: entry.modified, unixPermissions: entry.mode });
    }
    return zip.generateAsync({ type: 'arraybuffer', platform: 'UNIX', ...zipOptions(options.zipCompression) });
  }
  const tar = buildTar(entries);
  if (outputFormat === 'tar') return tar.buffer.slice(tar.byteOffset, tar.byteOffset + tar.byteLength) as ArrayBuffer;
  return gzip(tar);
}
