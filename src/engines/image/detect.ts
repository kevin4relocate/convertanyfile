import type { DetectedFile } from '../../platform/converter/types';
import { extensionFromFilename, normalizeImageExtension } from './formats';
import { detectLegacyImage, validateIcoFile } from './legacy-formats';

const ascii = (bytes: Uint8Array, start: number, length: number) => new TextDecoder('ascii').decode(bytes.slice(start, start + length));
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);
const u16be = (bytes: Uint8Array, offset: number) => ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
const u16le = (bytes: Uint8Array, offset: number) => (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
const u24le = (bytes: Uint8Array, offset: number) => (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
const u32be = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
const u32le = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);

function isIsoBmff(bytes: Uint8Array): string | null {
  if (bytes.length < 12 || ascii(bytes, 4, 4) !== 'ftyp') return null;
  const brands = ascii(bytes, 8, Math.min(bytes.length - 8, 48)).toLowerCase();
  if (/avif|avis/.test(brands)) return 'avif';
  if (/heic|heix|hevc|hevx|mif1|msf1/.test(brands)) return 'heic';
  if (/crx /.test(brands)) return 'cr3';
  return null;
}

function sniff(bytes: Uint8Array): string | null {
  if (starts(bytes, [0xff, 0xd8, 0xff])) return 'jpg';
  if (starts(bytes, [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) return 'png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp';
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'gif';
  if (ascii(bytes, 0, 2) === 'BM') return 'bmp';
  if (starts(bytes, [0x00,0x00,0x01,0x00])) return 'ico';
  if (starts(bytes, [0x76,0x2f,0x31,0x01])) return 'exr';
  if (ascii(bytes, 0, 4) === 'qoif') return 'qoi';
  if (ascii(bytes, 0, 4) === '8BPS') return 'psd';
  if (ascii(bytes, 0, 4) === 'DDS ') return 'dds';
  if (ascii(bytes, 0, 10).startsWith('#?RADIANCE') || ascii(bytes, 0, 6).startsWith('#?RGBE')) return 'hdr';
  if (/^P[1-7]\s/.test(ascii(bytes, 0, 3))) return 'pnm';
  if (starts(bytes, [0xff,0x0a]) || starts(bytes, [0x00,0x00,0x00,0x0c,0x4a,0x58,0x4c,0x20])) return 'jxl';
  if (starts(bytes, [0x00,0x00,0x00,0x0c,0x6a,0x50,0x20,0x20]) || starts(bytes, [0xff,0x4f,0xff,0x51])) return 'jp2';
  const iso = isIsoBmff(bytes);
  if (iso) return iso;
  if (starts(bytes, [0x49,0x49,0x2a,0x00]) || starts(bytes, [0x4d,0x4d,0x00,0x2a])) return 'tiff';
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512)).trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return null;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (!starts(bytes, [0xff, 0xd8])) return undefined;
  const sofMarkers = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 1 >= bytes.length) break;
    const length = u16be(bytes, offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (sofMarkers.has(marker) && length >= 7) {
      const height = u16be(bytes, offset + 3);
      const width = u16be(bytes, offset + 5);
      return width > 0 && height > 0 ? { width, height } : undefined;
    }
    offset += length;
  }
  return undefined;
}

function dimensions(bytes: Uint8Array, extension: string): { width: number; height: number } | undefined {
  try {
    if (extension === 'jpg') return jpegDimensions(bytes);
    if (extension === 'png' && bytes.length >= 24) return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
    if (extension === 'gif' && bytes.length >= 10) return { width: u16le(bytes, 6), height: u16le(bytes, 8) };
    if (extension === 'bmp' && bytes.length >= 26) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return { width: Math.abs(view.getInt32(18, true)), height: Math.abs(view.getInt32(22, true)) };
    }
    if (extension === 'ico' && bytes.length >= 8) return { width: bytes[6] || 256, height: bytes[7] || 256 };
    if (extension === 'qoi' && bytes.length >= 12) return { width: u32be(bytes, 4), height: u32be(bytes, 8) };
    if (extension === 'psd' && bytes.length >= 22) return { width: u32be(bytes, 18), height: u32be(bytes, 14) };
    if (extension === 'dds' && bytes.length >= 20) return { width: u32le(bytes, 16), height: u32le(bytes, 12) };
    if (extension === 'webp' && bytes.length >= 30) {
      const chunk = ascii(bytes, 12, 4);
      if (chunk === 'VP8X') return { width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 };
      if (chunk === 'VP8L' && bytes[20] === 0x2f) {
        const b1 = bytes[21] ?? 0, b2 = bytes[22] ?? 0, b3 = bytes[23] ?? 0, b4 = bytes[24] ?? 0;
        return { width: 1 + b1 + ((b2 & 0x3f) << 8), height: 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10) };
      }
      if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
        return { width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

const LABELS: Record<string, string> = {
  jpg: 'JPEG image', png: 'PNG image', webp: 'WebP image', avif: 'AVIF image', heic: 'HEIC/HEIF image', gif: 'GIF image',
  tiff: 'TIFF image', bmp: 'BMP image', ico: 'ICO image', jxl: 'JPEG XL image', jp2: 'JPEG 2000 image', svg: 'SVG image',
  exr: 'OpenEXR image', hdr: 'HDR image', qoi: 'QOI image', pnm: 'PNM image', psd: 'Photoshop image', dds: 'DDS image', cr3: 'Canon RAW image',
};
const RAW_EXTENSIONS = new Set(['3fr','arw','cr2','cr3','crw','dcr','dng','erf','fff','iiq','k25','kdc','mef','mos','mrw','nef','nrw','orf','pef','raf','raw','rw2','rwl','sr2','srf','srw','x3f']);

function withDimensions(result: DetectedFile, bytes: Uint8Array): DetectedFile {
  const size = dimensions(bytes, normalizeImageExtension(result.extension));
  if (!size || size.width <= 0 || size.height <= 0) return result;
  const estimatedDecodedBytes = size.width * size.height * 4;
  if (!Number.isSafeInteger(estimatedDecodedBytes)) return result;
  return { ...result, ...size, estimatedDecodedBytes };
}

export async function detectImage(file: File): Promise<DetectedFile | null> {
  const extension = normalizeImageExtension(extensionFromFilename(file.name));
  const bytes = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer());
  const signature = sniff(bytes);
  if (RAW_EXTENSIONS.has(extension) && (signature === 'tiff' || signature === 'cr3')) {
    return withDimensions({ extension, label: `${extension.toUpperCase()} RAW image`, confidence: 'signature+extension' }, bytes);
  }
  if (!signature) return detectLegacyImage(file, extension, bytes);
  const normalizedSignature = normalizeImageExtension(signature);
  const compatible = extension === normalizedSignature || (extension === 'heic' && normalizedSignature === 'heic') || (extension === 'tiff' && normalizedSignature === 'tiff');
  if (!compatible && extension) return null;
  if (normalizedSignature === 'ico' && !(await validateIcoFile(file, bytes))) return null;
  return withDimensions({ extension: normalizedSignature, label: LABELS[normalizedSignature] ?? `${normalizedSignature.toUpperCase()} image`, confidence: extension ? 'signature+extension' : 'signature' }, bytes);
}
