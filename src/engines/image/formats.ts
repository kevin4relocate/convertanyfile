import type { OutputOption, RangeOutputControl } from '../../platform/converter/types';

const QUALITY_CONTROL: RangeOutputControl = {
  id: 'quality', type: 'range', label: 'Quality', min: 1, max: 100, step: 1, defaultValue: 90,
};
const LOSSY_CONTROLS = [QUALITY_CONTROL] as const;
const POPULAR = 'Popular';
const ADVANCED = 'Professional & advanced';
const TECHNICAL = 'Legacy & technical';

/**
 * Public output contract for the image product.
 *
 * The ImageMagick runtime exposes many writable coders, but ConvertAnyFile only
 * publishes formats that are useful as single-image downloads and are covered by
 * the browser conversion matrix. Runtime capability discovery still acts as a
 * second gate, so a format is hidden if the deployed WASM build cannot write it.
 */
export const IMAGE_OUTPUTS: readonly OutputOption[] = [
  { id: 'jpg', label: 'JPG', extension: 'jpg', mime: 'image/jpeg', group: POPULAR, controls: LOSSY_CONTROLS },
  { id: 'png', label: 'PNG', extension: 'png', mime: 'image/png', group: POPULAR },
  { id: 'webp', label: 'WebP', extension: 'webp', mime: 'image/webp', group: POPULAR, controls: LOSSY_CONTROLS },
  { id: 'avif', label: 'AVIF', extension: 'avif', mime: 'image/avif', group: POPULAR, controls: LOSSY_CONTROLS },
  { id: 'heic', label: 'HEIC', extension: 'heic', mime: 'image/heic', group: POPULAR, controls: LOSSY_CONTROLS },
  { id: 'tiff', label: 'TIFF', extension: 'tiff', mime: 'image/tiff', group: POPULAR },
  { id: 'gif', label: 'GIF', extension: 'gif', mime: 'image/gif', group: POPULAR },
  { id: 'bmp', label: 'BMP', extension: 'bmp', mime: 'image/bmp', group: POPULAR },
  { id: 'ico', label: 'ICO', extension: 'ico', mime: 'image/x-icon', group: POPULAR },
  { id: 'jxl', label: 'JXL', extension: 'jxl', mime: 'image/jxl', group: ADVANCED, controls: LOSSY_CONTROLS },
  { id: 'jp2', label: 'JP2', extension: 'jp2', mime: 'image/jp2', group: ADVANCED, controls: LOSSY_CONTROLS },
  { id: 'hdr', label: 'HDR', extension: 'hdr', mime: 'image/vnd.radiance', group: ADVANCED },
  { id: 'exr', label: 'EXR', extension: 'exr', mime: 'image/x-exr', group: ADVANCED },
  { id: 'pcx', label: 'PCX', extension: 'pcx', mime: 'image/x-pcx', group: TECHNICAL },
  { id: 'tga', label: 'TGA', extension: 'tga', mime: 'image/x-tga', group: TECHNICAL },
  { id: 'qoi', label: 'QOI', extension: 'qoi', mime: 'image/qoi', group: TECHNICAL },
  { id: 'pnm', label: 'PNM', extension: 'pnm', mime: 'image/x-portable-anymap', group: TECHNICAL },
];

export const IMAGE_CERTIFIED_OUTPUT_IDS = IMAGE_OUTPUTS.map((output) => output.id) as readonly string[];

export const IMAGE_INPUT_EXTENSIONS = [
  'jpg','jpeg','jfif','png','webp','avif','heic','heif','jxl','gif','tif','tiff','bmp','ico','pcx','tga','jp2','j2k','svg',
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
  jpg: ['JPEG', 'JPG', 'JPE'], png: ['PNG'], webp: ['WEBP'], avif: ['AVIF'], heic: ['HEIC', 'HEIF'],
  jxl: ['JXL'], jp2: ['JP2', 'J2K', 'J2C', 'JPC'], tiff: ['TIFF', 'TIF'], gif: ['GIF'], bmp: ['BMP'], ico: ['ICO'],
  pcx: ['PCX'], tga: ['TGA'], svg: ['SVG'], exr: ['EXR'], hdr: ['HDR'], qoi: ['QOI'],
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
