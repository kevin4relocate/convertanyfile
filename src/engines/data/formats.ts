import type { OutputOption } from '../../platform/converter/types';

export const DATA_INPUT_EXTENSIONS = ['csv', 'tsv', 'json', 'jsonl', 'ndjson'] as const;

const TABULAR_CONTROLS = [
  { id: 'includeHeader', type: 'checkbox', label: 'Header row', defaultValue: true },
  {
    id: 'lineEnding',
    type: 'select',
    label: 'Line endings',
    defaultValue: 'lf',
    options: [
      { value: 'lf', label: 'LF' },
      { value: 'crlf', label: 'CRLF' },
    ],
  },
  { id: 'bom', type: 'checkbox', label: 'UTF-8 BOM', defaultValue: false },
] as const;

export const DATA_OUTPUTS: readonly OutputOption[] = [
  { id: 'csv', label: 'CSV', extension: 'csv', mime: 'text/csv;charset=utf-8', controls: TABULAR_CONTROLS },
  { id: 'tsv', label: 'TSV', extension: 'tsv', mime: 'text/tab-separated-values;charset=utf-8', controls: TABULAR_CONTROLS },
  {
    id: 'json', label: 'JSON', extension: 'json', mime: 'application/json;charset=utf-8',
    controls: [{ id: 'pretty', type: 'checkbox', label: 'Pretty print', defaultValue: true }],
  },
  { id: 'jsonl', label: 'JSONL', extension: 'jsonl', mime: 'application/x-ndjson;charset=utf-8' },
] as const;

export function extensionFromFilename(filename: string): string | undefined {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return undefined;
  return filename.slice(dot + 1).toLowerCase();
}

export function normalizeDataExtension(extension: string | undefined): string | undefined {
  if (!extension) return undefined;
  const normalized = extension.toLowerCase().replace(/^\./, '');
  return normalized === 'ndjson' ? 'jsonl' : normalized;
}

export function dataLabel(extension: string): string {
  if (extension === 'jsonl') return 'JSON Lines';
  return extension.toUpperCase();
}
