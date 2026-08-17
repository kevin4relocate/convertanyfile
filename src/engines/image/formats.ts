import type { OutputOption } from '../../platform/converter/types';

export const IMAGE_OUTPUTS: readonly OutputOption[] = [
  { id: 'jpg', label: 'JPG', extension: 'jpg', mime: 'image/jpeg', supportsQuality: true },
  { id: 'png', label: 'PNG', extension: 'png', mime: 'image/png', supportsQuality: false },
  { id: 'webp', label: 'WebP', extension: 'webp', mime: 'image/webp', supportsQuality: true },
  { id: 'avif', label: 'AVIF', extension: 'avif', mime: 'image/avif', supportsQuality: true },
  { id: 'tiff', label: 'TIFF', extension: 'tiff', mime: 'image/tiff', supportsQuality: false },
  { id: 'gif', label: 'GIF', extension: 'gif', mime: 'image/gif', supportsQuality: false },
  { id: 'bmp', label: 'BMP', extension: 'bmp', mime: 'image/bmp', supportsQuality: false },
  { id: 'ico', label: 'ICO', extension: 'ico', mime: 'image/x-icon', supportsQuality: false },
];

export const IMAGE_INPUT_EXTENSIONS = [
  'jpg','jpeg','jfif','png','webp','avif','heic','heif','jxl','gif','tif','tiff','bmp','ico','jp2','j2k','svg',
  'exr','hdr','qoi','pnm','ppm','pgm','pbm','pam','psd','psb','dds',
  '3fr','arw','cr2','cr3','crw','dcr','dng','erf','fff','iiq','k25','kdc','mef','mos','mrw','nef','nrw','orf','pef','raf','raw','rw2','rwl','sr2','srf','srw','x3f',
] as const;

export function normalizeImageExtension(value: string): string {
  const ext = value.toLowerCase().replace(/^\./, '');
  if (ext === 'jpeg' || ext === 'jfif') return 'jpg';
  if (ext === 'tif') return 'tiff';
  if (ext === 'heif') return 'heic';
  if (ext === 'j2k') return 'jp2';
  if (ext === 'psb') return 'psd';
  if (ext === 'ppm' || ext === 'pgm' || ext === 'pbm' || ext === 'pam') return 'pnm';
  return ext;
}

export function extensionFromFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : '';
}

const RUNTIME_NAMES: Record<string, readonly string[]> = {
  jpg: ['JPEG', 'JPG', 'JPE'], png: ['PNG'], webp: ['WEBP'], avif: ['AVIF', 'HEIC'],
  tiff: ['TIFF', 'TIF'], gif: ['GIF'], bmp: ['BMP'], ico: ['ICO'], heic: ['HEIC', 'HEIF'],
  jxl: ['JXL'], jp2: ['JP2', 'J2K'], svg: ['SVG'], exr: ['EXR'], hdr: ['HDR'], qoi: ['QOI'],
  pnm: ['PNM','PPM','PGM','PBM','PAM'], psd: ['PSD','PSB'], dds: ['DDS'],
};

const RAW_RUNTIME_NAMES = ['DNG','CR2','CR3','NEF','ARW','RAF','ORF','RW2','RAW','TIFF'];
const RAW_EXTENSIONS = new Set(['3fr','arw','cr2','cr3','crw','dcr','dng','erf','fff','iiq','k25','kdc','mef','mos','mrw','nef','nrw','orf','pef','raf','raw','rw2','rwl','sr2','srf','srw','x3f']);

export function runtimeSupportsImageInput(extension: string, readable: ReadonlySet<string>): boolean {
  const normalized = normalizeImageExtension(extension);
  const candidates = RAW_EXTENSIONS.has(normalized) ? RAW_RUNTIME_NAMES : RUNTIME_NAMES[normalized] ?? [normalized.toUpperCase()];
  return candidates.some((candidate) => readable.has(candidate));
}

export function runtimeImageOutputs(writable: ReadonlySet<string>): OutputOption[] {
  return IMAGE_OUTPUTS.filter((output) => {
    const candidates = RUNTIME_NAMES[output.id] ?? [output.id.toUpperCase()];
    return candidates.some((candidate) => writable.has(candidate));
  });
}
