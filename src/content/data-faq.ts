export const DATA_FAQ = [
  {
    question: 'Which structured data files are supported?',
    answer: 'The production data engine accepts CSV, TSV, JSON, JSONL, and NDJSON. NDJSON is treated as the JSON Lines input family. Files must contain valid UTF-8 text.',
  },
  {
    question: 'Which data formats can I convert to?',
    answer: 'The current production outputs are CSV, TSV, JSON, and JSONL. They cover tabular exchange, normal structured JSON, and line-oriented JSON workflows without requiring a server upload.',
  },
  {
    question: 'How are CSV and TSV headers handled?',
    answer: 'The first row is treated as the header. Empty headings receive generated names such as column_1, and duplicate headings are made unique so JSON objects do not silently overwrite fields.',
  },
  {
    question: 'Does CSV to JSON automatically convert numbers or dates?',
    answer: 'No. CSV and TSV cell values remain strings. Avoiding type guessing protects identifiers, leading zeros, date-like text, and codes from silent changes.',
  },
  {
    question: 'How are nested JSON objects converted to CSV or TSV?',
    answer: 'Nested plain objects are flattened with dot notation, for example profile.city. Literal dots and backslashes in source property names are escaped so they cannot collide with paths created from nested objects. Arrays and other complex values are serialized as JSON text inside a cell.',
  },
  {
    question: 'What happens to very large JSON numbers?',
    answer: 'ConvertAnyFile rejects unquoted JSON numbers outside the browser safe-integer range instead of silently rounding them through JavaScript number precision. Large identifiers or exact large integers should be represented as JSON strings before conversion.',
  },
  {
    question: 'What is the difference between JSONL and NDJSON here?',
    answer: 'For conversion purposes they are aliases. Each non-empty line must contain one complete valid JSON value, and blank lines are ignored.',
  },
  {
    question: 'Can CSV fields contain commas, quotes, or line breaks?',
    answer: 'Yes. The delimited-text parser supports quoted fields, escaped double quotes, delimiters inside quoted fields, and embedded CRLF or LF line breaks.',
  },
  {
    question: 'Why is there a UTF-8 BOM option for CSV and TSV?',
    answer: 'Some spreadsheet workflows benefit from an explicit UTF-8 BOM for encoding detection. It is off by default because plain UTF-8 is the cleaner general-purpose output.',
  },
  {
    question: 'What are the data batch limits?',
    answer: 'The data category allows up to 50 files, 20 MB per file, and 100 MB total input per batch. Structured text can expand substantially while parsing, so local processing still needs memory safeguards.',
  },
  {
    question: 'Are my CSV or JSON files uploaded?',
    answer: 'No upload step is required for the current data converter. Validation, parsing, conversion, and serialization run in the browser session, with the heavier conversion work placed in a browser worker.',
  },
] as const;
