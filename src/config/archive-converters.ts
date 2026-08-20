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
    title: 'Free Archive Converter — ZIP, TAR, TAR.GZ & GZIP | ConvertAnyFile',
    description: 'Convert ZIP, TAR, TAR.GZ, TGZ and GZIP files directly in your browser. Private local processing, batch conversion, safety limits, and no account required.',
    h1: 'Convert archives locally.',
    eyebrow: 'Private archive converter',
    intro: 'Repackage ZIP, TAR, TAR.GZ, TGZ and single-file GZIP sources in your browser without uploading their contents to a conversion server.',
  },
  {
    ...archiveBase,
    slug: 'zip-to-tar', input: 'zip', output: 'tar',
    title: 'ZIP to TAR Converter — Free & Private | ConvertAnyFile',
    description: 'Convert ZIP archives to TAR locally in your browser while keeping the file tree, empty directories, timestamps, and safe paths.',
    h1: 'Convert ZIP to TAR', eyebrow: 'ZIP → TAR',
    intro: 'Repackage a ZIP archive as TAR locally without uploading its contents.',
    related: ['tar-to-zip', 'zip-to-tar-gz', 'tar-gz-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'zip-to-tar-gz', input: 'zip', output: 'tgz',
    title: 'ZIP to TAR.GZ Converter — Free & Private | ConvertAnyFile',
    description: 'Convert ZIP to compressed TAR.GZ locally in your browser with archive safety limits and no server upload.',
    h1: 'Convert ZIP to TAR.GZ', eyebrow: 'ZIP → TAR.GZ',
    intro: 'Turn a ZIP archive into gzip-compressed TAR while keeping the conversion on your device.',
    related: ['zip-to-tar', 'tar-gz-to-zip', 'tar-to-tar-gz'],
  },
  {
    ...archiveBase,
    slug: 'tar-to-zip', input: 'tar', output: 'zip',
    title: 'TAR to ZIP Converter — Free & Private | ConvertAnyFile',
    description: 'Convert TAR archives to ZIP locally with selectable ZIP compression and browser-side processing.',
    h1: 'Convert TAR to ZIP', eyebrow: 'TAR → ZIP',
    intro: 'Create a widely compatible ZIP copy of a TAR archive without sending the source to a remote converter.',
    related: ['zip-to-tar', 'tar-to-tar-gz', 'tar-gz-to-zip'],
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
    related: ['zip-to-tar-gz', 'tar-gz-to-tar', 'tar-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'tar-gz-to-tar', input: 'tgz', output: 'tar',
    title: 'TAR.GZ to TAR Converter — TGZ to TAR | ConvertAnyFile',
    description: 'Decompress TAR.GZ or TGZ to TAR directly in your browser without uploading the archive.',
    h1: 'Convert TAR.GZ to TAR', eyebrow: 'TAR.GZ → TAR',
    intro: 'Remove gzip compression from TAR.GZ or TGZ and download a standard TAR archive locally.',
    related: ['tar-to-tar-gz', 'tar-gz-to-zip', 'zip-to-tar'],
  },
  {
    ...archiveBase,
    slug: 'gz-to-zip', input: 'gz', output: 'zip',
    title: 'GZIP to ZIP Converter — GZ to ZIP | ConvertAnyFile',
    description: 'Convert a single-file GZIP or GZ source into ZIP locally in your browser. No file upload or account required.',
    h1: 'Convert GZIP to ZIP', eyebrow: 'GZIP → ZIP',
    intro: 'Decompress a .gz or .gzip file locally, then place the recovered file into a ZIP container.',
    related: ['gz-to-tar', 'tar-gz-to-zip', 'tar-to-zip'],
  },
  {
    ...archiveBase,
    slug: 'gz-to-tar', input: 'gz', output: 'tar',
    title: 'GZIP to TAR Converter — GZ to TAR | ConvertAnyFile',
    description: 'Convert a single-file GZIP or GZ source into TAR locally in your browser with no server upload.',
    h1: 'Convert GZIP to TAR', eyebrow: 'GZIP → TAR',
    intro: 'Recover the file stored in a GZIP stream and wrap it in a TAR archive directly in your browser.',
    related: ['gz-to-zip', 'tar-gz-to-tar', 'zip-to-tar'],
  },
] as const;

export const ARCHIVE_CONVERTER = ARCHIVE_CONVERTERS[0];
export const ARCHIVE_PAIR_CONVERTERS = ARCHIVE_CONVERTERS.filter((converter) => converter.input && converter.output);

export function getArchiveConverter(slug: string): ConverterDefinition | undefined {
  return ARCHIVE_CONVERTERS.find((converter) => converter.slug === slug);
}
