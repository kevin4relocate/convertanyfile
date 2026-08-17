import type { DetectedFile } from '../../platform/converter/types';
import { extensionFromFilename, normalizeImageExtension } from './formats';

const ascii = (bytes: Uint8Array, start: number, length: number) => new TextDecoder('ascii').decode(bytes.slice(start, start + length));
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);

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

const LABELS: Record<string, string> = {
  jpg: 'JPEG image', png: 'PNG image', webp: 'WebP image', avif: 'AVIF image', heic: 'HEIC/HEIF image', gif: 'GIF image',
  tiff: 'TIFF image', bmp: 'BMP image', ico: 'ICO image', jxl: 'JPEG XL image', jp2: 'JPEG 2000 image', svg: 'SVG image',
  exr: 'OpenEXR image', hdr: 'HDR image', qoi: 'QOI image', pnm: 'PNM image', psd: 'Photoshop image', dds: 'DDS image', cr3: 'Canon RAW image',
};
const RAW_EXTENSIONS = new Set(['3fr','arw','cr2','cr3','crw','dcr','dng','erf','fff','iiq','k25','kdc','mef','mos','mrw','nef','nrw','orf','pef','raf','raw','rw2','rwl','sr2','srf','srw','x3f']);

export async function detectImage(file: File): Promise<DetectedFile | null> {
  const extension = normalizeImageExtension(extensionFromFilename(file.name));
  const bytes = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const signature = sniff(bytes);
  if (RAW_EXTENSIONS.has(extension) && (signature === 'tiff' || signature === 'cr3')) {
    return { extension, label: `${extension.toUpperCase()} RAW image`, confidence: 'signature+extension' };
  }
  if (!signature) return null;
  const normalizedSignature = normalizeImageExtension(signature);
  const compatible = extension === normalizedSignature || (extension === 'heic' && normalizedSignature === 'heic') || (extension === 'tiff' && normalizedSignature === 'tiff');
  if (!compatible && extension) return null;
  return { extension: normalizedSignature, label: LABELS[normalizedSignature] ?? `${normalizedSignature.toUpperCase()} image`, confidence: extension ? 'signature+extension' : 'signature' };
}
