import type { OutputOption, SelectOutputControl } from '../../platform/converter/types';

const ZIP_COMPRESSION_CONTROL: SelectOutputControl = {
  id: 'compression',
  type: 'select',
  label: 'ZIP compression',
  defaultValue: 'balanced',
  options: [
    { value: 'store', label: 'Store (fastest)' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'maximum', label: 'Maximum' },
  ],
};

export const ARCHIVE_INPUT_EXTENSIONS = ['zip', '7z', 'rar', 'tar', 'tgz', 'tar.gz', 'gz', 'gzip'] as const;

export const ARCHIVE_OUTPUTS: readonly OutputOption[] = [
  { id: 'zip', label: 'ZIP', extension: 'zip', mime: 'application/zip', group: 'Popular', controls: [ZIP_COMPRESSION_CONTROL] },
  { id: 'tar', label: 'TAR', extension: 'tar', mime: 'application/x-tar', group: 'Popular' },
  { id: 'tgz', label: 'TAR.GZ', extension: 'tar.gz', mime: 'application/gzip', group: 'Popular' },
];

export function normalizeArchiveExtension(value: string): string {
  const ext = value.toLowerCase().replace(/^\./, '');
  if (ext === 'tar.gz' || ext === 'tgz') return 'tgz';
  if (ext === 'gzip') return 'gz';
  return ext;
}

export function extensionFromArchiveFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.tar.gz')) return 'tgz';
  const dot = lower.lastIndexOf('.');
  return dot >= 0 ? normalizeArchiveExtension(lower.slice(dot + 1)) : '';
}

export function archiveLabel(extension: string): string {
  const normalized = normalizeArchiveExtension(extension);
  if (normalized === 'tgz') return 'TAR.GZ';
  if (normalized === 'gz') return 'GZIP';
  return normalized.toUpperCase();
}
