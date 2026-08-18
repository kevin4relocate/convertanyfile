# ConvertAnyFile

ConvertAnyFile.net is a browser-first file conversion platform built around one shared static site shell and pluggable local converter engines.

## Current production categories

### Image

- 57 recognized image filename extensions across common raster, specialist, legacy, and camera RAW families.
- 16 product-certified outputs: JPG, PNG, WebP, AVIF, TIFF, GIF, BMP, ICO, JXL, JP2, HDR, EXR, PCX, TGA, QOI, and PNM.
- HEIC/HEIF remains input-only because the packaged WASM runtime does not expose a HEIC writer.
- Runtime readable/writable codec scan plus a product-certified output whitelist.
- Browser-side ImageMagick WASM conversion.
- 50 files / 75 MB per file / 300 MB per batch.
- Dimension and estimated decoded-memory guards.
- EXIF orientation normalization and deterministic white flattening for opaque destinations.
- Explicit single-image policy for animated, multi-page, layered, and multi-size sources.
- ICO hardening for multi-size PNG-backed icons plus legacy DIB/BMP fallback.
- Certified output encode + decode-back browser matrix.

### Data

- Inputs: CSV, TSV, JSON, JSONL, and NDJSON.
- Outputs: CSV, TSV, JSON, and JSONL.
- UTF-8 validation with optional input BOM support.
- Parsing and serialization run in a browser worker.
- Quoted CSV/TSV fields support embedded delimiters, escaped quotes, CRLF/LF, and embedded line breaks.
- First delimited row becomes headers; empty and duplicate headers are normalized safely.
- CSV/TSV values remain strings instead of using risky automatic type inference.
- JSON nested plain objects flatten with dot notation for tabular output.
- Arrays and complex JSON values remain JSON strings inside CSV/TSV cells.
- JSONL and NDJSON share the one-JSON-value-per-line input path.
- CSV/TSV controls: header row, LF/CRLF, optional UTF-8 BOM.
- JSON control: pretty print.
- 50 files / 20 MB per file / 100 MB per batch.

Both categories reuse the same batch queue, append-by-drag behavior, progress, cancel, recoverable-only retry, per-file download, ZIP packaging, compact converter page frame, sitemap, SEO shell, and browser-layout regressions.

## Architecture

```text
src/
  components/            shared Header, Footer, ConverterPageFrame, ConverterShell, FAQ/content UI
  config/                site config + category route registries + combined converter registry
  content/               reusable FAQ and category/pair guidance
  layouts/               shared Astro page shell / SEO metadata layer
  platform/converter/    generic batch policy, engine registry, controls, ZIP/downloads
  engines/image/         image detection, codec policy, ImageMagick WASM worker
  engines/data/          UTF-8 validation, delimited/JSON codec, browser worker
  client/                category-agnostic converter controller
  pages/                 static category routes and real SEO conversion presets
```

A new file category implements `EngineAdapter` rather than duplicating the website or queue UI. Output settings are engine-declared through generic controls:

- Image declares range controls such as quality.
- Data declares checkbox/select controls such as header output, line endings, BOM, and pretty printing.
- Future Archive/Audio engines can declare compression, bitrate, sample rate, or other category settings without adding those concepts to the shared queue.

See `ARCHITECTURE.md` for the platform contract.

## Converter page contract

Every live dedicated converter route renders through `ConverterPageFrame`. The frame owns the compact breadcrumb/eyebrow/title/intro region and renders the shared `ConverterShell` in compact mode so the primary file action remains inside the first desktop viewport.

Category-specific explanations belong below the tool. Category-specific converter shells, queue implementations, and duplicated download logic are not allowed.

CI reads the generated sitemap and enforces this contract for every page containing a live converter.

## Why Astro

Astro produces crawlable static HTML while allowing shared layouts/components and client-side converter scripts. Conversion engines are lazy-loaded only when a user interacts with a converter.

## Local commands

```bash
npm ci
npm run check
npm run build
npm run preview
npm run test:e2e
```

## Cloudflare Pages

Use a static Pages deployment:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node: `22.19.0`

No Pages Function, KV, D1, R2, or conversion backend is required for the current Image or Data converters.

## SEO model

- Canonicals are generated from `https://convertanyfile.net`.
- `@astrojs/sitemap` generates the sitemap from actual static routes.
- `robots.txt` reads the same site config and points to the generated sitemap index.
- Pair pages are real converter presets backed by category engines, not copied converter implementations.
- Image routes live in `src/config/converters.ts`.
- Data routes live in `src/config/data-converters.ts`.
- `src/config/converter-registry.ts` combines live pair routes for shared static generation.
- Placeholder routes are not published for planned categories.

## Production release gates

All categories must keep these shared gates green:

- Astro diagnostics (`npm run check`)
- production static build (`npm run build`)
- sitemap/canonical/title/description/internal-link regressions
- shared converter-frame and first-viewport regressions
- desktop/mobile layout checks
- Chromium/Firefox/WebKit browser coverage
- batch admission, append-by-drag, cancellation, failure isolation, retry semantics and ZIP behavior
- previous production category regressions

Image additionally requires its certified output encode/decode-back matrix and image-specific fidelity/memory regressions.

Data additionally requires byte-level tests for quoted delimited fields, nested JSON flattening, JSONL/NDJSON, output controls, permanent parse errors, and shared batch/ZIP reuse.

See:
- `IMAGE_RELEASE_CHECKLIST.md`
- `DATA_RELEASE_CHECKLIST.md`

## Expansion rule

Archive, Audio, Subtitle, Font, and other categories should be added only when they provide a dependable browser-first workflow with their own safety policy and category-specific conversion tests.

For every future live category:

1. implement/register its engine adapter;
2. define real input/output formats and engine-declared controls;
3. define real converter routes;
4. render category and pair routes through `ConverterPageFrame`;
5. keep category-specific guidance below the tool;
6. add deterministic conversion, safety, and error regressions;
7. let sitemap, canonical, shared-frame, viewport, and existing-category CI tests validate the full product before merge.
