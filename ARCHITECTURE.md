# ConvertAnyFile Platform Architecture

## Principle

The website shell and category conversion engines are separate products inside one repository.

A new converter category must not require copying the header, footer, FAQ markup, batch queue, download logic, sitemap, robots file, or page layout.

## Shared platform

`SiteLayout.astro` owns document metadata, canonical URLs, structured data hooks, header and footer.

`ConverterShell.astro` owns the reusable dropzone, engine-declared settings area, scrollable queue, progress area and sticky action bar.

`converter-app.ts` owns generic batch lifecycle: admission, append-by-drop, queue state, progress, cancel, retry, result statistics and ZIP download.

`EngineAdapter` is the boundary between the generic queue and category-specific conversion logic.

## Engine contract

Each engine provides accepted extensions, lightweight validation, lazy runtime initialization, capabilities, available outputs, output controls, conversion implementation and reset/cancel behavior.

Live engines:

- `src/engines/image/` — ImageMagick WASM image conversion.
- `src/engines/data/` — UTF-8 structured-text conversion for CSV, TSV, JSON and JSON Lines.

Output controls are declared by the engine through the shared control schema. Image uses a range control for lossy quality. Data uses select and checkbox controls for line endings, headers, BOM and pretty printing. Category-specific settings must not be hard-coded into the shared queue.

## Image codec contract

The image product uses three separate concepts and they must not be collapsed into one list:

1. **Recognized input extensions** — filename families for which the detector has a validation path.
2. **Runtime capabilities** — the full readable/writable coder scan returned by `Magick.supportedFormats` from the packaged ImageMagick WASM build.
3. **Certified outputs** — a deliberately smaller product whitelist in `src/engines/image/formats.ts`.

The UI may offer an output only when it is both product-certified and reported writable by the current runtime. Do not automatically expose every ImageMagick writer; many coders are internal, pseudo-formats, text formats, or unsuitable for a normal one-file image download workflow.

Every new certified image output must be added to the WASM worker map and to the browser encode/decode-back matrix in the same change. CI failure means the format is not certified.

## Single-image fidelity contract

The current image product creates one output image per input file.

- EXIF orientation is normalized into pixels before writing.
- Transparent input is flattened to deterministic white when the selected destination has no useful alpha channel.
- Animated GIF/WebP, multi-page TIFF, layered sources, and multi-size icon containers are not advertised as preserving all frames/pages/layers/sizes.
- Container metadata is detected when practical so the UI can describe what was found.
- Multi-size PNG-backed ICO input uses the largest valid embedded PNG frame for single-image conversion; legacy DIB/BMP ICO input falls back to ImageMagick.

If full animation, page, or layer preservation is implemented later, it must be an explicit product mode with its own tests rather than an accidental side effect of a codec.

## Structured Data contract

The first Data production release accepts CSV, TSV, JSON, JSONL and NDJSON input and produces CSV, TSV, JSON and JSONL.

The contract is deliberately deterministic:

- Input text must be valid UTF-8; a UTF-8 BOM is accepted.
- CSV/TSV first row defines headers.
- Empty and duplicate headers are normalized so fields are not lost.
- Delimited cells remain strings; the engine does not guess numbers, dates or booleans.
- Quoted delimited fields support embedded delimiters, escaped quotes and embedded CRLF/LF newlines.
- JSON objects flatten with dot notation for tabular output.
- Arrays and complex JSON values remain JSON strings inside table cells.
- JSONL and NDJSON share one line-oriented input family: one complete JSON value per non-empty line.
- JSON numeric tokens that would change value through JavaScript precision are rejected rather than silently rounded; exact precision-sensitive values belong in JSON strings.
- CSV/TSV output can include/exclude the header, choose LF/CRLF, and optionally emit a UTF-8 BOM.
- JSON output can be pretty or compact.

The 64 KB admission sample is only a lightweight filter. Sampling uses streaming UTF-8 decoding so a valid multibyte character split at the sample boundary is not mistaken for corrupt text, and truncated JSONL tails are not treated as complete records. Full parsing in the worker remains authoritative.

This engine is a format converter, not an ETL engine. It does not join files, execute spreadsheet formulas, infer relational schemas or apply business mappings.

## Browser safety

Policies are supplied by converter definitions rather than hard-coded in UI components.

- Image: 50 files, 75 MB per file, 300 MB total, sequential processing, plus decoded-pixel memory/dimension guards.
- Data: 50 files, 20 MB per file, 100 MB total, sequential processing in a browser worker.

Compressed or serialized input size is not a sufficient memory signal. Images expand into pixels; JSON/CSV can expand into JavaScript strings, arrays, objects and generated output.

Worker crash, message corruption, and timeout tear down the active worker. A later request initializes a fresh worker. Deterministic corrupt/unsupported/memory/precision failures are permanent and must not expose Retry; transient engine crash/timeout failures may expose Retry.

Engine reset also invalidates the generation of any in-flight conversion. Cancel must remain authoritative if it races with `File.arrayBuffer()` or worker completion: a stale generation cannot publish a successful artifact after reset.

Future archive/audio/subtitle engines can define different limits without changing shared UI code.

## Routing and SEO

`src/config/converters.ts` owns Image routes. `src/config/data-converters.ts` owns Data routes. `src/config/converter-registry.ts` is the combined registry used by shared dynamic pair routing.

Do not create a route until the conversion is real, testable, and useful. This avoids thin placeholder pages and keeps sitemap output aligned with product capability.

All dedicated converter pages render through `ConverterPageFrame` so the primary file action remains above the first desktop viewport. The homepage is the intentional marketing-layout exception and has its own viewport regression.

Pair pages can provide category-specific explanation below the shared frame, but may not duplicate the queue or engine backend.

## Release gate

A category is production-ready only when static checks, browser UX regressions, category-specific real conversion tests, safety limits, deterministic error semantics, sitemap/canonical/internal-link tests, and existing-category regressions are green.

Image additionally requires the full certified-output matrix to encode every public output and decode generated files back through the public converter path.

Data additionally requires real byte-level regressions for quoted delimited fields, nested JSON flattening, JSONL/NDJSON, output controls, deterministic parse failures, numeric fidelity, safe admission sampling, cancellation, and shared batch/ZIP reuse. See `IMAGE_RELEASE_CHECKLIST.md` and `DATA_RELEASE_CHECKLIST.md`.
