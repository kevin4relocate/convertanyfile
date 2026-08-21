# ConvertAnyFile Platform Architecture

## Principle

The website shell and category conversion engines are separate products inside one repository.

A new converter category must not require copying the header, footer, FAQ markup, batch queue, download logic, sitemap, robots file, or page layout.

## Shared platform

- `SiteLayout.astro` owns document metadata, canonical URLs, structured-data hooks, header, and footer.
- `ConverterPageFrame.astro` owns the dedicated converter-page hero contract.
- `ConverterShell.astro` owns the reusable dropzone, engine-declared settings, queue, progress, notices, and batch action bar.
- `converter-app.ts` owns generic admission, append-drop, queue state, progress, cancel, retry, downloads, and ZIP behavior.
- `EngineAdapter` is the boundary between shared queue behavior and category-specific validation/conversion.

Current engines:

- `src/engines/image/` — ImageMagick WASM. **Live.**
- `src/engines/data/` — structured-text conversion. **Live.**
- `src/engines/archive/` — archive validation/repacking + lazy 7Z/RAR WASM. **Live.**
- `src/engines/subtitle/` — full-file timed-text preflight, transforms, and serialization. **Premium Preview.**

## Generic output-control contract

Output controls are engine-declared. Shared UI supports reusable:

- `range`
- `number`
- `select`
- `checkbox`

The shared queue must not learn category-specific concepts merely to expose a setting.

Examples:

- Image: lossy quality range.
- Data: header, line endings, BOM, pretty printing.
- Archive: ZIP compression.
- Subtitle: exact numeric timing offset, plain-text cleanup, transcript mode, cue spacing, line endings, BOM.

## Image contract

The image product separates:

1. recognized input extensions;
2. runtime readable/writable capabilities;
3. product-certified public outputs.

The UI offers an image output only when it is both product-certified and writable by the packaged runtime. New certified outputs require worker mapping plus encode/decode-back browser regressions.

The current product creates one output image per input. EXIF orientation is normalized, opaque outputs flatten transparency deterministically, and animated/multi-page/layered/multi-size sources are not falsely claimed as fully preserved.

## Data contract

Inputs: CSV, TSV, JSON, JSONL, NDJSON. Outputs: CSV, TSV, JSON, JSONL.

The conversion is deterministic rather than ETL-like:

- UTF-8 input with optional BOM.
- first delimited row defines headers;
- duplicate/empty headers are normalized;
- delimited cells remain strings;
- nested plain objects flatten with dot notation;
- arrays/complex values remain JSON strings inside table cells;
- JSONL/NDJSON use one complete JSON value per non-empty line;
- unsafe JavaScript numeric precision is rejected rather than silently rounded;
- output controls cover headers, LF/CRLF, BOM, and JSON formatting.

## Archive contract

Inputs: ZIP, TAR, TAR.GZ/TGZ, GZIP/GZ, 7Z, supported RAR4/RAR5. Outputs: ZIP, TAR, TAR.GZ.

Archive conversion treats containers as potentially hostile:

- password/encryption fails closed;
- unsafe and duplicate normalized paths fail;
- unsupported special entries fail;
- integrity/checksum errors fail;
- compressed source size is not trusted as an expanded-memory signal;
- entry count, per-entry size, and total expanded size are bounded separately;
- 7Z/RAR decoding is lazy-loaded.

## Subtitle Premium Preview contract

Inputs: SRT, VTT/WebVTT, ASS, SSA, SBV. Outputs: SRT, VTT, SBV, TXT.

The route registry exposes 17 useful cross-format pairs and intentionally omits same-format SEO pages.

### Full-file preflight

Before the shared queue reports Ready, Subtitle sends the complete source file to its worker. Preflight:

- decodes UTF-8, UTF-16LE, UTF-16BE BOM input, or Windows-1252 after strict UTF-8 failure;
- parses every cue;
- rejects malformed later cues;
- rejects ambiguous SRT blocks containing multiple timestamp lines;
- rejects end-before-start timing;
- enforces a 100,000-cue guard;
- reports cue count, timeline end, encoding, and richer formatting/WebVTT metadata through the normal `DetectedFile.label` surface.

This preserves a single shared queue implementation.

### Fidelity

- cue order is preserved rather than silently sorted/merged;
- timing is represented at millisecond precision;
- SRT numbering is regenerated deterministically;
- ASS/SSA readable dialogue and timing are extracted, but styles, positioning, karaoke, effects, drawing commands, and override metadata are not claimed as preserved in simpler outputs;
- VTT-only global metadata cannot be represented in SRT/SBV/TXT;
- no-transform VTT → VTT validates but preserves the decoded source document body so STYLE, REGION, NOTE, X-TIMESTAMP-MAP, cue IDs, and settings are not discarded merely by normalization;
- VTT timing/text transforms rebuild from parsed cues, so global metadata preservation is no longer guaranteed.

### Premium transforms

- exact timing offset: `-600000` to `+600000` milliseconds;
- arbitrary values such as `+1350` and `-780` are supported;
- a negative offset that would move any cue before `00:00` fails instead of clipping silently;
- out-of-range/non-numeric offsets fail explicitly;
- optional plain-text cleanup for timed SRT/VTT/SBV output;
- TXT timestamp modes: none, start, start → end;
- TXT cue spacing: blank line or single line;
- LF/CRLF and optional UTF-8 BOM.

Subtitle is not OCR, speech-to-text, translation, frame-rate retiming, automatic audiovisual sync, or video embedding.

## Browser safety

- Image: 50 files, 75 MB/file, 300 MB source batch plus decoded-memory/dimension guards.
- Data: 50 files, 20 MB/file, 100 MB batch.
- Archive: 20 files, 75 MB/source, 250 MB source batch plus expansion guards.
- Subtitle Preview: 50 files, 5 MB/source, 50 MB batch plus full preflight, ±600000 ms timing-offset bound, and 100,000-cue guard.

Worker crashes, message corruption, and timeout are recoverable engine failures. Deterministic corrupt/unsupported/unsafe-setting failures are permanent and must not create retry loops. Reset/cancel invalidates stale in-flight results.

## Routing and SEO

- Image: `src/config/converters.ts`
- Data: `src/config/data-converters.ts`
- Archive: `src/config/archive-converters.ts`
- Subtitle: `src/config/subtitle-converters.ts`
- Combined real pair registry: `src/config/converter-registry.ts`

Do not create a route until conversion is real, testable, and useful. Do not publish same-format pages merely to inflate route count.

Dedicated converter pages render through `ConverterPageFrame`. Category-specific content belongs below the shared tool. The homepage is the intentional marketing-layout exception.

## Release gate

A category is production-ready only when static checks, browser UX regressions, category-specific real conversion tests, safety/fidelity semantics, sitemap/canonical/internal-link tests, and previous-category regressions are green.

Subtitle remains Preview until full-file preflight, encoding behavior, exact timing offsets, text cleanup, VTT metadata rules, ASS/SSA fidelity, all 17 routes, batch behavior, mobile UX, and Chromium/Firefox/WebKit gates are green.

See `IMAGE_RELEASE_CHECKLIST.md`, `DATA_RELEASE_CHECKLIST.md`, `ARCHIVE_RELEASE_CHECKLIST.md`, and `SUBTITLE_RELEASE_CHECKLIST.md`.
