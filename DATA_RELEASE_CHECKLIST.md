# Data Production Release Checklist

This checklist is the release contract for the second production category on ConvertAnyFile.net.

## Product scope

### Accepted inputs
- CSV
- TSV
- JSON
- JSONL
- NDJSON (JSON Lines alias)

### Certified outputs
- CSV
- TSV
- JSON
- JSONL

The first Data release intentionally targets UTF-8 structured text. It does not guess legacy character encodings, execute spreadsheet formulas, infer schemas, or perform ETL-style joins and mappings.

## Deterministic conversion rules

- CSV/TSV first row is the header row.
- Empty headers receive stable `column_N` names.
- Duplicate headers receive deterministic suffixes so values are not overwritten.
- CSV/TSV cells remain strings; no number/date/boolean inference.
- Quoted delimited fields support embedded delimiters, escaped quotes, CRLF/LF, and embedded line breaks.
- JSON top-level arrays become multiple tabular rows; a single value becomes one row.
- Nested plain JSON objects flatten with dot notation for CSV/TSV output.
- Arrays and complex values remain JSON text inside tabular cells.
- JSONL/NDJSON uses one complete JSON value per non-empty line.
- CSV/TSV output supports header on/off, LF/CRLF, and optional UTF-8 BOM.
- JSON output supports pretty print on/off.

## Browser safety

- 50 files maximum per batch.
- 20 MB maximum per file.
- 100 MB maximum input per batch.
- Parsing/serialization runs in a browser worker.
- One failed file does not stop the batch.
- Deterministic parse errors are permanent and do not show Retry.
- Worker crash/timeout remains recoverable through the shared engine lifecycle.

## Shared-platform proof

The Data category must reuse, not copy:
- `ConverterShell`
- `ConverterPageFrame`
- batch admission and queue state
- append-by-drag
- progress and cancellation
- error/retry semantics
- individual downloads
- ZIP packaging
- sitemap/canonical/layout rules

Data-specific settings must be declared by the engine through generic output controls. The shared platform must not acquire hard-coded CSV/JSON behavior.

## Automated gates before merge

- [ ] `npm ci --no-audit --no-fund`
- [ ] `npm run check`
- [ ] `npm run build`
- [ ] Chromium / Firefox / WebKit Playwright suite
- [ ] CSV → JSON quoted-comma / escaped-quote / embedded-newline regression
- [ ] JSON → CSV nested-object + array-value regression
- [ ] NDJSON alias → JSON regression
- [ ] CSV output control byte regression for header / CRLF / BOM
- [ ] deterministic malformed CSV failure has no Retry loop
- [ ] multi-file Data batch reaches shared ZIP workflow
- [ ] all Data routes use the shared compact converter-page contract
- [ ] generated sitemap, canonical, title, description, and internal-link tests stay green
- [ ] Image Production RC regression suite stays green unchanged

## Release acceptance

Before public traffic is intentionally sent to Data, manually verify representative real-world files from spreadsheet exports, API JSON, and JSONL/NDJSON pipelines on desktop and mobile. Any discovered semantic ambiguity should be documented or fixed before expanding the input catalog.
