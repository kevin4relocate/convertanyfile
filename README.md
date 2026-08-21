# ConvertAnyFile

ConvertAnyFile.net is a browser-first file conversion platform built around one shared static site shell and pluggable local converter engines.

## Current categories

### Image — Live

- 57 recognized image filename extensions across common raster, specialist, legacy, and camera RAW families.
- 16 product-certified outputs: JPG, PNG, WebP, AVIF, TIFF, GIF, BMP, ICO, JXL, JP2, HDR, EXR, PCX, TGA, QOI, and PNM.
- HEIC/HEIF remains input-only because the packaged WASM runtime does not expose a HEIC writer.
- Browser-side ImageMagick WASM conversion with runtime codec checks and a certified output whitelist.
- 50 files / 75 MB per file / 300 MB per batch plus dimension and estimated decoded-memory guards.
- EXIF orientation normalization, deterministic alpha flattening for opaque destinations, and explicit single-image handling for animated/multi-page/layered/multi-size sources.

### Data — Live

- Inputs: CSV, TSV, JSON, JSONL, and NDJSON.
- Outputs: CSV, TSV, JSON, and JSONL.
- UTF-8 validation, quoted delimited fields, normalized headers, deterministic string cells, nested-object dot flattening, JSONL/NDJSON support, and precision-sensitive numeric rejection.
- Output controls for headers, LF/CRLF, UTF-8 BOM, and JSON pretty printing.
- Parsing/serialization run in a browser worker.
- 50 files / 20 MB per file / 100 MB per batch.

### Archive — Live

- Inputs: ZIP, TAR, TAR.GZ/TGZ, GZIP/GZ, 7Z, and supported RAR4/RAR5.
- Certified outputs: ZIP, TAR, and TAR.GZ.
- ZIP/TAR/GZIP processing runs locally; 7Z/RAR use a lazy-loaded pinned WebAssembly decoder.
- Password/encryption, unsafe paths, duplicate paths, unsupported special entries, integrity failures, and unsafe expansion fail closed.
- 20 files / 75 MB per source / 250 MB source batch plus expanded-content guards.

### Subtitle — Premium Preview

- Inputs: SRT, VTT/WebVTT, ASS, SSA, and SBV.
- Outputs: SRT, VTT, SBV, and TXT.
- 17 real cross-format pair routes; same-format SEO pages are intentionally not published.
- Complete worker preflight before Ready: full cue parse, cue count, timeline end, encoding detection, and richer metadata/formatting flags.
- UTF-8, UTF-16LE, UTF-16BE BOM handling, with Windows-1252 fallback only after strict UTF-8 fails.
- Exact batch timing offset from `-600000` to `+600000` milliseconds, including values such as `+1350` or `-780`.
- Negative offsets fail if any cue would move before `00:00`; out-of-range offsets fail explicitly.
- Optional plain-text cleanup for timed outputs.
- TXT export supports no timestamps, start timestamps, or full start → end ranges plus blank/single cue spacing.
- LF/CRLF and optional UTF-8 BOM output controls.
- No-transform VTT → VTT preserves the validated source document body so STYLE, REGION, NOTE, X-TIMESTAMP-MAP, cue IDs, and cue settings are not discarded merely by normalization.
- ASS/SSA remain input-only; richer styles, positioning, karaoke, effects, and drawing metadata are explicitly not claimed as preserved in simpler outputs.
- 50 files / 5 MB per file / 50 MB per batch plus a 100,000-cue guard.

All categories reuse the same batch queue, append-by-drag behavior, progress, cancel, recoverable-only retry, per-file download, ZIP packaging, compact converter page frame, sitemap, SEO shell, and browser-layout rules. Category-specific validation, fidelity contracts, safety limits, and conversion code stay inside each engine.

## Architecture

```text
src/
  components/            shared shell, converter frame, queue UI, FAQ/content UI
  config/                site config + category route registries + combined registry
  content/               reusable FAQ and pair/category guidance
  layouts/               shared Astro document / SEO layer
  platform/converter/    batch policy, EngineAdapter types, generic controls, ZIP/downloads
  engines/image/         image detection, codec policy, ImageMagick WASM worker
  engines/data/          structured-data parser/serializer worker
  engines/archive/       archive validation/repacking + lazy 7Z/RAR WASM path
  engines/subtitle/      timed-text preflight, transforms, serializer worker
  client/                category-agnostic converter controller
  pages/                 static category pages + real pair presets
```

A new category implements `EngineAdapter` rather than duplicating the website or queue UI. Output settings are engine-declared through reusable control types: range, number, select, and checkbox.

- Image declares quality ranges.
- Data declares headers, line endings, BOM, and pretty printing.
- Archive declares ZIP compression.
- Subtitle declares an exact numeric timing offset, formatting cleanup, transcript options, line endings, and BOM.

See `ARCHITECTURE.md` for the platform contract.

## Converter page contract

Every dedicated converter route renders through `ConverterPageFrame`. Category-specific explanations belong below the tool. Category-specific converter shells, queue implementations, and duplicated download logic are not allowed.

The homepage is the intentional marketing-layout exception. A homogeneous drop auto-routes to its category; a mixed-category drop stays on the selected tab so only that engine's supported files are admitted.

## Local commands

```bash
npm ci
npm run check
npm run build
npm run preview
npm run test:e2e
```

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node: `22.19.0`

No Pages Function, KV, D1, R2, or conversion backend is required for the current browser-first Image, Data, Archive, or Subtitle Preview workflows.

## SEO model

- Canonicals use `https://convertanyfile.net`.
- `@astrojs/sitemap` generates the sitemap from actual static routes.
- `robots.txt` uses the same site config.
- Pair pages are real converter presets backed by category engines, not copied implementations.
- Image routes: `src/config/converters.ts`
- Data routes: `src/config/data-converters.ts`
- Archive routes: `src/config/archive-converters.ts`
- Subtitle routes: `src/config/subtitle-converters.ts`
- `src/config/converter-registry.ts` combines the real routes for static generation.
- Placeholder routes and same-format pages are not published just to inflate route count.

## Production release gates

Shared gates:

- `npm run check`
- `npm run build`
- sitemap/canonical/title/description/internal-link regressions
- desktop/mobile layout checks
- Chromium/Firefox/WebKit browser coverage
- batch admission, append-by-drag, cancellation, failure isolation, retry semantics, individual download, and ZIP behavior
- previous production category regressions

Category-specific release contracts live in:

- `IMAGE_RELEASE_CHECKLIST.md`
- `DATA_RELEASE_CHECKLIST.md`
- `ARCHIVE_RELEASE_CHECKLIST.md`
- `SUBTITLE_RELEASE_CHECKLIST.md`

Subtitle remains Preview until full-file preflight, encoding/fallback behavior, exact timing offsets, VTT metadata behavior, ASS/SSA fidelity, all 17 real routes, mobile UX, and browser matrix gates are green.

## Expansion rule

Audio, Font, contact/calendar/geographic formats, and other future categories should be added only when they provide a dependable browser-first workflow with their own safety policy and real conversion tests.

For every future category:

1. implement/register its engine adapter;
2. define real input/output formats and engine-declared controls;
3. publish routes only for conversions that work;
4. render through the shared converter frame;
5. keep category-specific guidance below the tool;
6. add deterministic conversion, safety, fidelity, and error regressions;
7. keep existing category regressions green before production promotion.
