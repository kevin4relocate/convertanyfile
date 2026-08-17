import type { DetectedFile } from '../../platform/converter/types';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const u16le = (bytes: Uint8Array, offset: number) => (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
const u32le = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);

interface IcoEntry {
  width: number;
  height: number;
  bitDepth: number;
  size: number;
  offset: number;
}

function parseIcoEntries(bytes: Uint8Array, totalSize: number): IcoEntry[] | null {
  if (bytes.length < 6 || !starts(bytes, [0x00, 0x00, 0x01, 0x00])) return null;
  const count = u16le(bytes, 4);
  if (count < 1 || count > 1024) return null;
  const directoryEnd = 6 + count * 16;
  if (directoryEnd > bytes.length || directoryEnd > totalSize) return null;

  const entries: IcoEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const width = bytes[entry] || 256;
    const height = bytes[entry + 1] || 256;
    const bitDepth = u16le(bytes, entry + 6);
    const size = u32le(bytes, entry + 8);
    const offset = u32le(bytes, entry + 12);
    if (size < 1 || offset < directoryEnd || offset + size > totalSize) return null;
    entries.push({ width, height, bitDepth, size, offset });
  }
  return entries;
}

function detected(extension: string, label: string, width: number, height: number): DetectedFile | null {
  if (width <= 0 || height <= 0) return null;
  const estimatedDecodedBytes = width * height * 4;
  if (!Number.isSafeInteger(estimatedDecodedBytes)) return null;
  return { extension, label, confidence: 'signature+extension', width, height, estimatedDecodedBytes };
}

function detectPcx(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 128 || bytes[0] !== 0x0a) return null;
  const version = bytes[1] ?? 255;
  const encoding = bytes[2] ?? 255;
  const bitsPerPixel = bytes[3] ?? 0;
  if (![0, 2, 3, 4, 5].includes(version) || ![0, 1].includes(encoding) || ![1, 2, 4, 8].includes(bitsPerPixel)) return null;
  const xmin = u16le(bytes, 4), ymin = u16le(bytes, 6), xmax = u16le(bytes, 8), ymax = u16le(bytes, 10);
  const planes = bytes[65] ?? 0;
  const bytesPerLine = u16le(bytes, 66);
  if (xmax < xmin || ymax < ymin || planes < 1 || planes > 4 || bytesPerLine < 1) return null;
  return detected('pcx', 'PCX image', xmax - xmin + 1, ymax - ymin + 1);
}

function detectTga(file: File, bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 18) return null;
  const idLength = bytes[0] ?? 0;
  const colorMapType = bytes[1] ?? 255;
  const imageType = bytes[2] ?? 0;
  const width = u16le(bytes, 12), height = u16le(bytes, 14);
  const pixelDepth = bytes[16] ?? 0;
  if (![0, 1].includes(colorMapType) || ![1, 2, 3, 9, 10, 11].includes(imageType)) return null;
  if (![8, 15, 16, 24, 32].includes(pixelDepth) || width <= 0 || height <= 0) return null;
  if ((imageType === 1 || imageType === 9) && colorMapType !== 1) return null;
  const colorMapLength = u16le(bytes, 5);
  const colorMapEntryBits = bytes[7] ?? 0;
  const colorMapBytes = colorMapType === 1 ? Math.ceil(colorMapLength * colorMapEntryBits / 8) : 0;
  const dataOffset = 18 + idLength + colorMapBytes;
  if (dataOffset >= file.size) return null;
  return detected('tga', 'TGA image', width, height);
}

export async function detectLegacyImage(file: File, extension: string, bytes: Uint8Array): Promise<DetectedFile | null> {
  if (extension === 'pcx') return detectPcx(bytes);
  if (extension === 'tga') return detectTga(file, bytes);
  return null;
}

export async function validateIcoFile(file: File, bytes: Uint8Array): Promise<boolean> {
  const entries = parseIcoEntries(bytes, file.size);
  if (!entries) return false;
  const first = entries[0]!;
  const payload = new Uint8Array(await file.slice(first.offset, Math.min(file.size, first.offset + 16)).arrayBuffer());
  if (starts(payload, PNG_SIGNATURE)) return true;
  if (payload.length < 4) return false;
  const dibHeaderSize = u32le(payload, 0);
  return [12, 40, 52, 56, 64, 108, 124].includes(dibHeaderSize);
}

/**
 * ICO is a container that can hold multiple icon frames. For single-image outputs, prefer the
 * largest PNG-backed frame so ImageMagick does not need to decode the whole multi-frame ICO.
 * Returns undefined for legacy DIB-backed ICOs so the caller can use its normal ICO decoder.
 */
export function extractBestPngIcoFrame(bytes: Uint8Array): Uint8Array | undefined {
  const entries = parseIcoEntries(bytes, bytes.length);
  if (!entries) return undefined;
  const pngEntries = entries.filter((entry) => {
    if (entry.offset + PNG_SIGNATURE.length > bytes.length) return false;
    return starts(bytes.subarray(entry.offset, entry.offset + PNG_SIGNATURE.length), PNG_SIGNATURE);
  });
  if (!pngEntries.length) return undefined;
  const best = pngEntries.reduce((current, candidate) => {
    const currentArea = current.width * current.height;
    const candidateArea = candidate.width * candidate.height;
    if (candidateArea !== currentArea) return candidateArea > currentArea ? candidate : current;
    return candidate.bitDepth > current.bitDepth ? candidate : current;
  });
  return bytes.slice(best.offset, best.offset + best.size);
}
