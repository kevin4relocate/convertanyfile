/**
 * Editorially curated worked examples for high-intent tools.
 * Add a record only when it demonstrates a real, verified behavior of the tool.
 * A smaller collection of accurate examples is better than boilerplate on every URL.
 */
export interface ToolWorkedExample {
  title: string;
  scenario: string;
  inputLabel: string;
  input: string;
  secondInputLabel?: string;
  secondInput?: string;
  expected: string;
  caution: string;
  relatedLabel: string;
  relatedHref: string;
}

export const TEXT_TOOL_EXAMPLES: Readonly<Record<string, ToolWorkedExample>> = {
  'json-formatter': {
    title: 'Make an API response readable',
    scenario: 'You receive a compact JSON response in a bug report and need to inspect the nested values before sharing it with a teammate.',
    inputLabel: 'Paste this compact JSON',
    input: '{"project":"demo","enabled":true,"tags":["api","web"]}',
    expected: 'With 2-space indentation, the formatter puts the project, enabled flag and tags array on separate, indented lines. The values stay JSON values; this is not a schema or logic check.',
    caution: 'A trailing comma or an unquoted property name causes a parsing error. Formatting cannot repair invalid JSON or recover duplicate keys.',
    relatedLabel: 'Validate JSON syntax',
    relatedHref: '/text/json-validator/',
  },
  'json-validator': {
    title: 'Check configuration syntax before deployment',
    scenario: 'You copied a JSON config from a message and want to know whether a parser can read it. Valid syntax does not necessarily mean the configuration is useful.',
    inputLabel: 'Valid JSON example',
    input: '{"retries":3,"features":["search","export"],"enabled":true}',
    expected: 'The JSON parser accepts this object. If you remove the double quotes around a property name, the validator reports a syntax error instead.',
    caution: 'This checker does not validate required properties, allowable values or data types against a JSON Schema. Use the separate Schema Validator for those rules.',
    relatedLabel: 'Validate against a JSON Schema',
    relatedHref: '/data/json-schema-validator/',
  },
  'json-minifier': {
    title: 'Compact a JSON settings file',
    scenario: 'A readable configuration is going into a space-sensitive transport field where optional indentation and line breaks are unnecessary.',
    inputLabel: 'Indented JSON example',
    input: '{\n  "active": true,\n  "limit": 10\n}',
    expected: 'The minified JSON is {"active":true,"limit":10}. Whitespace inside a quoted string remains part of that value.',
    caution: 'Minification is not compression and does not make invalid JSON valid. If you need the original spacing for human editing, preserve the original file.',
    relatedLabel: 'Format JSON for review',
    relatedHref: '/text/json-formatter/',
  },
  'base64-text-encoder': {
    title: 'Encode international text using UTF-8',
    scenario: 'You need to pass a short non-ASCII text value through a system that expects Base64-encoded UTF-8 bytes.',
    inputLabel: 'Text to encode',
    input: 'café',
    expected: 'The UTF-8 Base64 representation is Y2Fmw6k=. This includes the two-byte UTF-8 encoding of the accented letter rather than treating text as Latin-1.',
    caution: 'Base64 is reversible. It does not hide credentials, encrypt content or provide tamper protection.',
    relatedLabel: 'Decode Base64 back to UTF-8',
    relatedHref: '/text/base64-text-decoder/',
  },
  'url-encoder': {
    title: 'Encode a search query value safely',
    scenario: 'An application builds a URL with a user-entered search term. The query value contains spaces, an ampersand and an equals sign.',
    inputLabel: 'One URL component',
    input: 'search=tea & cake',
    expected: 'The component becomes search%3Dtea%20%26%20cake. Insert the encoded value into the appropriate part of a URL; do not encode the entire URL and expect its separators to remain intact.',
    caution: 'Form-style query strings can use + for spaces; encodeURIComponent uses %20. The decoder does not automatically interpret + as a space.',
    relatedLabel: 'Decode percent-encoded text',
    relatedHref: '/text/url-decoder/',
  },
  'word-character-counter': {
    title: 'Check a short caption before publishing',
    scenario: 'A form has a strict character limit and you want to distinguish words, visible characters and UTF-8 bytes.',
    inputLabel: 'Short caption',
    input: 'Hello world!',
    expected: 'This example has 2 whitespace-separated words, 12 visible characters and 12 UTF-8 bytes. Emoji and combining marks can make character and byte counts diverge.',
    caution: 'Word segmentation depends on browser language behavior, so counts for scripts without spaces may differ from a particular word processor.',
    relatedLabel: 'Convert letter case',
    relatedHref: '/text/text-case-converter/',
  },
};

export const DATA_TOOL_EXAMPLES: Readonly<Record<string, ToolWorkedExample>> = {
  'json-schema-validator': {
    title: 'Catch a rule violation that valid JSON alone misses',
    scenario: 'An intake API requires a name and a non-negative integer age. The JSON is syntactically valid, but the data may still violate the rules.',
    inputLabel: 'JSON instance',
    input: '{"name":"Mina","age":-1}',
    secondInputLabel: 'JSON Schema',
    secondInput: '{"type":"object","required":["name","age"],"properties":{"age":{"type":"integer","minimum":0},"name":{"type":"string"}}}',
    expected: 'The instance parses as JSON, but its age value is below the schema minimum of zero. The validator reports a violation on the age path.',
    caution: 'This utility supports a documented subset of JSON Schema. It does not resolve external references or implement all format assertions.',
    relatedLabel: 'Check JSON syntax first',
    relatedHref: '/text/json-validator/',
  },
  'jsonpath-tester': {
    title: 'Select values from a JSON array',
    scenario: 'You need to inspect role labels in a small JSON payload without writing code or running arbitrary expressions.',
    inputLabel: 'JSON instance',
    input: '{"team":"support","roles":["editor","viewer"]}',
    secondInputLabel: 'JSONPath setting',
    secondInput: '$.roles[*]',
    expected: 'With the JSONPath field set to $.roles[*], the output contains a JSON array of the matching role values: ["editor","viewer"].',
    caution: 'This is a restricted JSONPath subset; filters, scripted expressions, slices and unions are not available.',
    relatedLabel: 'Format the resulting JSON',
    relatedHref: '/text/json-formatter/',
  },
  'csv-duplicate-remover': {
    title: 'Keep the first copy of repeated export rows',
    scenario: 'A CSV export has exactly duplicated records after multiple imports. You want to deduplicate the table without modifying the original source.',
    inputLabel: 'CSV sample',
    input: 'id,city\n001,Hanoi\n002,Da Nang\n001,Hanoi',
    expected: 'Leaving the key-columns setting blank compares complete rows. The second occurrence of 001,Hanoi is removed, and the original order of the remaining two rows is preserved.',
    caution: 'Matching is exact: 001 and 1 are different strings, as are Hanoi and hanoi. Choose key columns only when that is your intended duplicate rule.',
    relatedLabel: 'Inspect CSV column completeness',
    relatedHref: '/data/csv-data-profiler/',
  },
  'csv-file-merger': {
    title: 'Combine exports whose columns are in different orders',
    scenario: 'Two teams export the same customer fields in different orders, and one export includes an extra score column.',
    inputLabel: 'First CSV',
    input: 'name,city\nAlice,Hanoi',
    secondInputLabel: 'Second CSV',
    secondInput: 'city,score,name\nDa Nang,25,Bob',
    expected: 'Union mode aligns columns by header name and adds score after the first file’s columns. Alice has an empty score cell; Bob retains the value 25.',
    caution: 'Strict mode instead requires identical headers in the same order and reports incompatible inputs. Check the merged result before importing it.',
    relatedLabel: 'Convert a CSV table into JSON records',
    relatedHref: '/csv-to-json/',
  },
  'csv-row-filter': {
    title: 'Keep only records from one city',
    scenario: 'An analyst needs a small subset of a CSV export before inspecting it in a spreadsheet.',
    inputLabel: 'CSV sample',
    input: 'name,city\nAlice,Hanoi\nBob,Da Nang\nChau,HANOI',
    expected: 'Set column to city, condition to Equals and match value to Hanoi. The two Hanoi records are kept because literal comparisons are case-insensitive.',
    caution: 'This is a literal filter, not a spreadsheet formula or a regular-expression engine. An empty match still returns the column headers.',
    relatedLabel: 'Sort the filtered CSV rows',
    relatedHref: '/data/csv-row-sorter/',
  },
  'csv-data-profiler': {
    title: 'Inspect a CSV before cleaning it',
    scenario: 'You receive an unfamiliar CSV and want to find empty fields, repeated values and numeric-looking columns before making changes.',
    inputLabel: 'CSV sample',
    input: 'id,score\n001,20\n002,\n003,40',
    expected: 'The profiler reports row counts and statistics by column, including the empty score cell. It treats an identifier such as 001 as text rather than silently rewriting it as a number.',
    caution: 'Profiling does not infer dates, enforce business validation rules or repair the source. Review the data with domain-specific checks before important imports.',
    relatedLabel: 'Remove duplicate CSV records',
    relatedHref: '/data/csv-duplicate-remover/',
  },
  'csv-to-sql-insert': {
    title: 'Generate import statements without executing SQL',
    scenario: 'You need a starting SQL INSERT script for a small table export and want to preserve text identifiers with leading zeros.',
    inputLabel: 'CSV sample',
    input: 'id,name\n001,Alice\n002,Bob',
    secondInputLabel: 'Table name setting',
    secondInput: 'imported_rows',
    expected: 'The tool emits INSERT statements using string literals for cell values and quoted column identifiers. The value 001 stays text rather than being converted to integer 1.',
    caution: 'The generated SQL is not run by the website and may require type adjustments or dialect-specific changes before use in a real database.',
    relatedLabel: 'Convert SQL INSERT statements back to CSV',
    relatedHref: '/data/sql-insert-to-csv/',
  },
  'xml-to-json': {
    title: 'Understand repeated XML elements',
    scenario: 'You want to inspect an XML catalog in a JSON-based workflow and preserve multiple child elements as multiple values.',
    inputLabel: 'XML sample',
    input: '<catalog><book id="a">First</book><book id="b">Second</book></catalog>',
    expected: 'The generic XML mapping groups the two book elements into an array and represents the id attributes separately from the element text.',
    caution: 'Generic XML-to-JSON mapping does not preserve mixed-content order or XML namespaces. The special typed XML produced by this website’s JSON to XML tool has its own round-trip mapping.',
    relatedLabel: 'Generate typed XML from JSON',
    relatedHref: '/data/json-to-xml/',
  },
};
