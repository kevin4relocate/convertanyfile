import { DATA_BATCH_POLICY } from '../platform/converter/batch-policy';
import type { ConverterDefinition } from '../platform/converter/types';

const dataBase = {
  engine: 'data' as const,
  category: 'data' as const,
  batchPolicy: DATA_BATCH_POLICY,
  quickOutputs: ['csv', 'json', 'tsv', 'jsonl'],
};

export const DATA_CONVERTERS: readonly ConverterDefinition[] = [
  {
    ...dataBase,
    slug: 'data-converter',
    title: 'Free Data Converter — CSV, JSON, TSV & JSONL | ConvertAnyFile',
    description: 'Convert CSV, TSV, JSON, JSONL and NDJSON files directly in your browser. Batch conversion, local processing, and ZIP download.',
    h1: 'Free online data converter for CSV, JSON, TSV and JSONL.',
    eyebrow: 'Private data converter',
    intro: 'Convert CSV, TSV, JSON, JSONL and NDJSON without sending the source files to a conversion server.',
  },
  {
    ...dataBase,
    slug: 'csv-to-json', input: 'csv', output: 'json',
    title: 'CSV to JSON Converter — Free & Private | ConvertAnyFile',
    description: 'Convert CSV files to JSON locally in your browser. Quoted fields, embedded newlines, batch conversion, and ZIP download supported.',
    h1: 'Convert CSV to JSON', eyebrow: 'CSV → JSON',
    intro: 'Turn CSV rows into JSON objects using the first row as column names, entirely in your browser.',
    related: ['json-to-csv', 'csv-to-tsv', 'csv-to-jsonl'],
  },
  {
    ...dataBase,
    slug: 'json-to-csv', input: 'json', output: 'csv',
    title: 'JSON to CSV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert JSON arrays or objects to CSV locally. Nested object keys are flattened with dot notation and complex values remain explicit.',
    h1: 'Convert JSON to CSV', eyebrow: 'JSON → CSV',
    intro: 'Create spreadsheet-friendly CSV from JSON while keeping nested object paths understandable.',
    related: ['csv-to-json', 'json-to-tsv', 'json-to-jsonl'],
  },
  {
    ...dataBase,
    slug: 'csv-to-tsv', input: 'csv', output: 'tsv',
    title: 'CSV to TSV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert CSV to tab-separated TSV locally in your browser with robust quoted-field parsing and batch support.',
    h1: 'Convert CSV to TSV', eyebrow: 'CSV → TSV',
    intro: 'Switch comma-separated tables to tab-separated text without uploading the data.',
    related: ['tsv-to-csv', 'csv-to-json', 'tsv-to-json'],
  },
  {
    ...dataBase,
    slug: 'tsv-to-csv', input: 'tsv', output: 'csv',
    title: 'TSV to CSV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert TSV files to CSV locally in your browser. Control header output, line endings, and UTF-8 BOM.',
    h1: 'Convert TSV to CSV', eyebrow: 'TSV → CSV',
    intro: 'Turn tab-separated data into portable CSV files with safe quoting for commas and line breaks.',
    related: ['csv-to-tsv', 'tsv-to-json', 'json-to-csv'],
  },
  {
    ...dataBase,
    slug: 'json-to-tsv', input: 'json', output: 'tsv',
    title: 'JSON to TSV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert JSON objects and arrays to TSV in your browser. Nested objects use dot-notation columns for predictable tabular output.',
    h1: 'Convert JSON to TSV', eyebrow: 'JSON → TSV',
    intro: 'Create tab-separated tables from JSON with predictable columns and local processing.',
    related: ['tsv-to-json', 'json-to-csv', 'json-to-jsonl'],
  },
  {
    ...dataBase,
    slug: 'tsv-to-json', input: 'tsv', output: 'json',
    title: 'TSV to JSON Converter — Free & Private | ConvertAnyFile',
    description: 'Convert TSV rows to JSON objects locally. The first row becomes object keys and original cell text is preserved.',
    h1: 'Convert TSV to JSON', eyebrow: 'TSV → JSON',
    intro: 'Turn tab-separated rows into a JSON array without sending the data to a remote converter.',
    related: ['json-to-tsv', 'tsv-to-csv', 'csv-to-json'],
  },
  {
    ...dataBase,
    slug: 'jsonl-to-json', input: 'jsonl', output: 'json',
    title: 'JSONL to JSON Converter — NDJSON Supported | ConvertAnyFile',
    description: 'Convert JSONL or NDJSON to a standard JSON array locally in your browser. Blank lines are ignored and each record is parsed independently.',
    h1: 'Convert JSONL to JSON', eyebrow: 'JSONL → JSON',
    intro: 'Combine newline-delimited JSON records into a normal JSON array while keeping the conversion local.',
    related: ['json-to-jsonl', 'jsonl-to-csv', 'csv-to-jsonl'],
  },
  {
    ...dataBase,
    slug: 'json-to-jsonl', input: 'json', output: 'jsonl',
    title: 'JSON to JSONL Converter — Free NDJSON Output | ConvertAnyFile',
    description: 'Convert a JSON array to JSON Lines locally in your browser for streaming, logs, pipelines, and line-oriented processing.',
    h1: 'Convert JSON to JSONL', eyebrow: 'JSON → JSONL',
    intro: 'Write each top-level JSON array item as one compact JSON record per line.',
    related: ['jsonl-to-json', 'json-to-csv', 'csv-to-jsonl'],
  },
  {
    ...dataBase,
    slug: 'csv-to-jsonl', input: 'csv', output: 'jsonl',
    title: 'CSV to JSONL Converter — Free & Private | ConvertAnyFile',
    description: 'Convert CSV rows to JSON Lines locally. Column headers become object keys and each data row becomes one JSON record.',
    h1: 'Convert CSV to JSONL', eyebrow: 'CSV → JSONL',
    intro: 'Turn CSV tables into one JSON object per line for data pipelines and line-oriented tools.',
    related: ['jsonl-to-csv', 'csv-to-json', 'json-to-jsonl'],
  },
  {
    ...dataBase,
    slug: 'jsonl-to-csv', input: 'jsonl', output: 'csv',
    title: 'JSONL to CSV Converter — NDJSON to CSV | ConvertAnyFile',
    description: 'Convert JSONL and NDJSON records to CSV locally. Nested objects are flattened with dot notation and arrays remain JSON strings.',
    h1: 'Convert JSONL to CSV', eyebrow: 'JSONL → CSV',
    intro: 'Create a tabular CSV from newline-delimited JSON records without uploading the source file.',
    related: ['csv-to-jsonl', 'jsonl-to-json', 'json-to-csv'],
  },
] as const;

export const DATA_PAIR_CONVERTERS = DATA_CONVERTERS.filter((converter) => converter.input && converter.output);

export function getDataConverter(slug: string): ConverterDefinition | undefined {
  return DATA_CONVERTERS.find((converter) => converter.slug === slug);
}
