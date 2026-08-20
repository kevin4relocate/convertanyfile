export interface SeoDataContent {
  audience: string;
  bestFor: readonly string[];
  checkAfter: readonly string[];
}

export const SEO_DATA_CONTENT: Record<string, SeoDataContent> = {
  'csv-to-json': {
    audience: 'This conversion is for tabular exports that need to become named JSON records for scripts, APIs, configuration, or application workflows.',
    bestFor: ['Turning spreadsheet-style exports into arrays of JSON objects', 'Preparing CSV data for an API or JavaScript workflow', 'Keeping identifiers and formatted values as text instead of silently coercing them'],
    checkAfter: ['Confirm the first CSV row contains the headings you want to use as object keys', 'Check duplicate or empty headings in the source', 'Verify the output against the destination schema before importing it'],
  },
  'json-to-csv': {
    audience: 'This conversion is useful when structured JSON records need to become a rectangular table for spreadsheets, reporting, or import tools.',
    bestFor: ['Opening arrays of records in spreadsheet software', 'Creating a simple tabular export from application data', 'Feeding a table-oriented import system without building a custom script'],
    checkAfter: ['Review how nested objects were flattened into columns', 'Check that arrays and complex values remain meaningful as JSON text', 'Verify column order and names before sharing or importing the CSV'],
  },
  'jsonl-to-json': {
    audience: 'This conversion is for line-oriented JSON datasets such as logs, exports, and model data that need to become one standard JSON value, commonly an array.',
    bestFor: ['Opening JSONL or NDJSON records in tools that expect ordinary JSON', 'Turning one-record-per-line datasets into a JSON array', 'Preparing line-oriented exports for APIs or editors that expect a single JSON document'],
    checkAfter: ['Make sure every non-empty line was a complete JSON value', 'Confirm the resulting array size matches the expected record count', 'Check memory requirements before handing a very large JSON document to another application'],
  },
  'json-to-jsonl': {
    audience: 'This conversion is useful when a JSON array needs to become a line-oriented dataset that can be processed record by record.',
    bestFor: ['Streaming or line-oriented processing of JSON records', 'Log and dataset pipelines that expect JSON Lines or NDJSON', 'Breaking a large JSON array into independent records for downstream tools'],
    checkAfter: ['Confirm the source is structured as expected before conversion', 'Check that each output line is valid JSON', 'Test the resulting JSONL with the application that will consume it'],
  },
  'csv-to-jsonl': {
    audience: 'This conversion combines a spreadsheet-friendly CSV source with a line-oriented JSON output for pipelines, datasets, and record-by-record processing.',
    bestFor: ['Creating one JSON object per CSV data row', 'Preparing tabular exports for streaming or batch pipelines', 'Moving spreadsheet data into systems that expect JSONL or NDJSON'],
    checkAfter: ['Confirm the CSV header contains the intended property names', 'Check record counts and quoted fields', 'Verify that string values are appropriate for the downstream schema'],
  },
  'jsonl-to-csv': {
    audience: 'This conversion is useful when newline-delimited records need to become a table for review, analysis, or import into spreadsheet-oriented systems.',
    bestFor: ['Reviewing JSONL datasets in spreadsheets', 'Creating a tabular export from line-oriented application data', 'Producing CSV for systems that accept rows and columns rather than JSON records'],
    checkAfter: ['Review the union of fields used as columns', 'Inspect nested-object dot notation and JSON text stored in cells', 'Check whether irregular records create sparse or unexpected columns'],
  },
};
