export interface DataPairCopy {
  why: string;
  when: string;
  note: string;
}

export const DATA_PAIR_CONTENT: Record<string, DataPairCopy> = {
  'csv-to-json': {
    why: 'JSON gives each CSV row explicit field names, which is useful for APIs, configuration, scripting, and application data where named properties are easier to work with than column positions.',
    when: 'Use CSV to JSON when the source is a table with a header row and the destination expects structured records. Cell values stay as strings so the converter does not silently guess dates, numbers, booleans, or identifiers.',
    note: 'The first CSV row becomes object keys. Empty or duplicate headings are normalized so every output property has a usable, unique name.',
  },
  'json-to-csv': {
    why: 'CSV is easier to open in spreadsheet applications and many import tools. Converting JSON to CSV turns named records into columns without requiring a server-side data pipeline.',
    when: 'Use JSON to CSV for arrays of similarly shaped objects, exports for analysts, or systems that accept delimited text rather than JSON.',
    note: 'Nested objects are flattened with dot notation such as profile.city. Arrays and other complex values remain explicit JSON strings instead of being discarded.',
  },
  'csv-to-tsv': {
    why: 'TSV replaces commas with tabs as the field separator, which can be convenient when the data itself contains many commas or a downstream tool specifically expects tab-separated text.',
    when: 'Use CSV to TSV when moving a table into tools that prefer tab delimiters while keeping the same header-and-row structure.',
    note: 'Quoted CSV fields, commas inside fields, escaped quotes, and embedded line breaks are parsed before the TSV output is created.',
  },
  'tsv-to-csv': {
    why: 'CSV has broad support across spreadsheets, import screens, databases, and business tools. Converting TSV to CSV can make tabular data easier to share with those workflows.',
    when: 'Use TSV to CSV when your source uses tabs but the target application documents comma-separated input.',
    note: 'Fields containing commas, quotes, tabs, or line breaks are quoted safely in the CSV output. You can also choose LF or CRLF line endings and an optional UTF-8 BOM.',
  },
  'json-to-tsv': {
    why: 'TSV offers a simple text table that works well for copy/paste, command-line pipelines, and tools that prefer tabs over commas.',
    when: 'Use JSON to TSV when the source contains records but the destination needs a rectangular table.',
    note: 'Nested object properties become dot-notation columns. Arrays and complex values are kept as JSON text within a cell.',
  },
  'tsv-to-json': {
    why: 'JSON turns the header row and tab-separated values into named objects that are easier to consume in code and APIs.',
    when: 'Use TSV to JSON when a tabular export needs to become a list of structured records.',
    note: 'The first TSV row defines object keys. Cell text is preserved as text instead of being automatically coerced into numbers or booleans.',
  },
  'jsonl-to-json': {
    why: 'JSONL and NDJSON store one JSON value per line, while many editors, APIs, and libraries expect one normal JSON value. Combining records into an array makes the file easier to inspect and pass to those tools.',
    when: 'Use JSONL to JSON for logs, exports, model datasets, or streaming records that need to become a standard JSON array.',
    note: 'Blank lines are ignored. Each non-empty line must contain one complete valid JSON value; NDJSON uses the same conversion path as JSONL.',
  },
  'json-to-jsonl': {
    why: 'JSON Lines is convenient for streaming, large record sets, logs, and tools that process one item at a time without loading a single giant JSON array.',
    when: 'Use JSON to JSONL when the source is a top-level JSON array and the destination expects one compact record per line.',
    note: 'Each top-level array item becomes one line. A single non-array JSON value produces one JSONL record.',
  },
  'csv-to-jsonl': {
    why: 'CSV to JSONL combines tabular input with a line-oriented structured output that is useful for pipelines, datasets, and record-by-record processing.',
    when: 'Use CSV to JSONL when each CSV data row should become an independent JSON object on its own line.',
    note: 'The CSV header becomes object keys. Values remain strings, which avoids silent type guessing that could alter identifiers or formatting.',
  },
  'jsonl-to-csv': {
    why: 'CSV makes newline-delimited JSON records easier to review in spreadsheets and import into systems that expect a table.',
    when: 'Use JSONL to CSV when records share enough fields to make a tabular representation useful.',
    note: 'Columns are the union of fields found across records in first-seen order. Nested objects use dot notation and arrays remain JSON strings.',
  },
};
