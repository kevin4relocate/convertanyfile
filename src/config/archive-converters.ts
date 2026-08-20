import { ARCHIVE_BATCH_POLICY } from '../platform/converter/batch-policy';
import type { ConverterDefinition } from '../platform/converter/types';

const archiveBase = {
  engine: 'archive' as const,
  category: 'archive' as const,
  batchPolicy: ARCHIVE_BATCH_POLICY,
  quickOutputs: ['zip', 'tar', 'tgz'],
};

export const ARCHIVE_CONVERTERS: readonly ConverterDefinition[] = [
  {
    ...archiveBase,
    slug: 'archive-converter',
    title: 'Free Archive Converter — 7Z, RAR, ZIP, TAR & GZIP | ConvertAnyFile',
    description: 'Convert 7Z, RAR, ZIP, TAR, TAR.GZ, TGZ and GZIP files directly in your browser. Private local processing, batch conversion, safety limits, and no account required.',
    h1: 'Convert archives locally.',
    eyebrow: 'Private archive converter',
    intro: 'Open 7Z and RAR or repackage ZIP, TAR, TAR.GZ, TGZ and GZIP sources in your browser without uploading their contents to a conversion server.',
  },
  {
    ...archiveBase,
    slug: '7z-to-zip', input: '7z', output: 'zip',
    title: '7Z to ZIP Converter — Free & Private | ConvertAnyFile',
    description: 'Convert 7Z archives to ZIP locally in your browser with lazy-loaded WASM decoding, selectable ZIP compression, and no file upload.',
    h1: 'Convert 7Z to ZIP', eyebrow: '7Z → ZIP',
    intro: 'Open a 7Z archive locally and repackage supported entries into a widely compatible ZIP file.',
    related: ['rar-to-zip', '7z-to-tar', 'zip-to-tar'],
  },
  {
    ...archiveBase,
    slug: '7z-to-tar', input: '7z', output: 'tar',
    title: '7Z to TAR Converter — Free & Private | ConvertAnyFile',
    description: 'Convert 7Z archives to TAR locally with browser-side WASM decoding and archive safety limits.',
    h1: 'Convert 7Z to TAR', eyebrow: '7Z → TAR',
    intro: 'Read a 7Z archive in the browser and create a standard TAR copy without uploading its contents.',
    related: ['7z-to-zip', '7z-to-tar-gz', 'rar-to-tar'],
  },
  {
    ...archiveBase,
    slug: '7z-to-tar-gz', input: '7z', output: 'tgz',
    title: '7Z to TAR.GZ Converter — Free & Private | ConvertAnyFile',
    description: 'Convert 7Z to TAR.GZ locally in your browser using lazy-loaded WASM decoding and native gzip output.',
    h1: 'Convert 7Z to TAR.GZ', eyebrow: '7Z → TAR.GZ',
    intro: 'Decode a 7Z archive locally, rebuild its safe file tree as TAR, then gzip the TAR output in your browser.',
    related: ['7z-to-tar', '7z-to-zip', 'rar-to-tar-gz'],
  },
  {
    ...archiveBase,
    slug: 'rar-to-zip', input: 'rar', output: 'zip',
    title: 'RAR to ZIP Converter — RAR4 & RAR5 | ConvertAnyFile',
    description: 'Convert supported RAR4 and RAR5 archives to ZIP locally in your browser. Password-protected archives are rejected and files are not uploaded.',
    h1: 'Convert RAR to ZIP', eyebrow: 'RAR → ZIP',
    intro: 'Open a supported RAR archive locally and repackage its regular files and folders into ZIP.',
    related: ['7z-to-zip', 'rar-to-tar', 'zip-to-tar'],
  },
  {
    ...archiveBase,
    slug: 'rar-to-tar', input: 'rar', output: 'tar',
    title: 'RAR to TAR Converter — RAR4 & RAR5 | ConvertAnyFile',
    description: 'Convert supported RAR archives to TAR locally with lazy-loaded WASM decoding and no server upload.',
    h1: 'Convert RAR to TAR', eyebrow: 'RAR → TAR',
    intro: 'Decode a supported RAR archive in the browser and create a TAR copy of its safe regular entries.',
    related: ['rar-to-zip', 'rar-to-tar-gz', '7z-to-tar'],
  },
  {
    ...archiveBase,
    slug: 'rar-to-tar-gz', input: 'rar', output: 'tgz',
    title: 'RAR to TAR.GZ Converter — RAR to TGZ | ConvertAnyFile',
    description: 'Convert supported RAR4 or RAR5 archives to TAR.GZ locally with browser-side decoding and native gzip output.',
    h1: 'Convert RAR to TAR.GZ', eyebrow: 'RAR → TAR.GZ',
    intro: 'Read a supported RAR archive locally, create TAR from safe entries, and gzip the result without uploading the archive.',
    related: ['rar-to-tar', 'rar-to-zip', '7z-to-tar-gz'],
  },
  {
    ...archiveBase,
    slug: 'zip-to-tar', input: 'zip', output: 'tar',
    title: 'ZIP to TAR Converter — Free & Private | ConvertAnyFile',
    description: 'Convert ZIP archives to TAR locally in your browser while keeping the file tree, empty directories, timestamps, and safe paths.',
    h1: 'Convert ZIP to TAR', eyebrow: 'ZIP → TAR',
    intro: 'Repackage a ZIP archive as TAR locally without uploading its contents.',
    related: ['tar-to-zip', 'zip-to-tar-gz', '7z-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'zip-to-tar-gz', input: 'zip', output: 'tgz',
    title: 'ZIP to TAR.GZ Converter — Free & Private | ConvertAnyFile',
    description: 'Convert ZIP to compressed TAR.GZ locally in your browser with archive safety limits and no server upload.',
    h1: 'Convert ZIP to TAR.GZ', eyebrow: 'ZIP → TAR.GZ',
    intro: 'Turn a ZIP archive into gzip-compressed TAR while keeping the conversion on your device.',
    related: ['zip-to-tar', 'tar-gz-to-zip', '7z-to-tar-gz'],
  },
  {
    ...archiveBase,
    slug: 'tar-to-zip', input: 'tar', output: 'zip',
    title: 'TAR to ZIP Converter — Free & Private | ConvertAnyFile',
    description: 'Convert TAR archives to ZIP locally with selectable ZIP compression and browser-side processing.',
    h1: 'Convert TAR to ZIP', eyebrow: 'TAR → ZIP',
    intro: 'Create a widely compatible ZIP copy of a TAR archive without sending the source to a remote converter.',
    related: ['zip-to-tar', 'tar-to-tar-gz', '7z-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'tar-to-tar-gz', input: 'tar', output: 'tgz',
    title: 'TAR to TAR.GZ Converter — Free & Private | ConvertAnyFile',
    description: 'Compress TAR as TAR.GZ locally in your browser. The source archive stays on your device.',
    h1: 'Convert TAR to TAR.GZ', eyebrow: 'TAR → TAR.GZ',
    intro: 'Add gzip compression to an existing TAR archive using the browser-first Archive engine.',
    related: ['tar-gz-to-tar', 'tar-to-zip', 'zip-to-tar-gz'],
  },
  {
    ...archiveBase,
    slug: 'tar-gz-to-zip', input: 'tgz', output: 'zip',
    title: 'TAR.GZ to ZIP Converter — TGZ to ZIP | ConvertAnyFile',
    description: 'Convert TAR.GZ or TGZ archives to ZIP locally in your browser, with selectable ZIP compression and no upload.',
    h1: 'Convert TAR.GZ to ZIP', eyebrow: 'TAR.GZ → ZIP',
    intro: 'Open a TAR.GZ or TGZ archive locally and repackage its entries into ZIP.',
    related: ['zip-to-tar-gz', 'tar-gz-to-tar', 'rar-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'tar-gz-to-tar', input: 'tgz', output: 'tar',
    title: 'TAR.GZ to TAR Converter — TGZ to TAR | ConvertAnyFile',
    description: 'Decompress TAR.GZ or TGZ to TAR directly in your browser without uploading the archive.',
    h1: 'Convert TAR.GZ to TAR', eyebrow: 'TAR.GZ → TAR',
    intro: 'Remove gzip compression from TAR.GZ or TGZ and download a standard TAR archive locally.',
    related: ['tar-to-tar-gz', 'tar-gz-to-zip', '7z-to-tar'],
  },
  {
    ...archiveBase,
    slug: 'gz-to-zip', input: 'gz', output: 'zip',
    title: 'GZIP to ZIP Converter — GZ to ZIP | ConvertAnyFile',
    description: 'Convert a single-file GZIP or GZ source into ZIP locally in your browser. No file upload or account required.',
    h1: 'Convert GZIP to ZIP', eyebrow: 'GZIP → ZIP',
    intro: 'Decompress a .gz or .gzip file locally, then place the recovered file into a ZIP container.',
    related: ['gz-to-tar', 'tar-gz-to-zip', 'rar-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'gz-to-tar', input: 'gz', output: 'tar',
    title: 'GZIP to TAR Converter — GZ to TAR | ConvertAnyFile',
    description: 'Convert a single-file GZIP or GZ source into TAR locally in your browser with no server upload.',
    h1: 'Convert GZIP to TAR', eyebrow: 'GZIP → TAR',
    intro: 'Recover the file stored in a GZIP stream and wrap it in a TAR archive directly in your browser.',
    related: ['gz-to-zip', 'tar-gz-to-tar', '7z-to-tar'],
  },
] as const;

export const ARCHIVE_CONVERTER = ARCHIVE_CONVERTERS[0];
export const ARCHIVE_PAIR_CONVERTERS = ARCHIVE_CONVERTERS.filter((converter) => converter.input && converter.output);

export function getArchiveConverter(slug: string): ConverterDefinition | undefined {
  return ARCHIVE_CONVERTERS.find((converter) => converter.slug === slug);
}
