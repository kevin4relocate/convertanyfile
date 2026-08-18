# ConvertAnyFile

ConvertAnyFile.net is a browser-first file conversion platform designed around a shared static site shell and pluggable local converter engines.

## Current production category

Image conversion is the first release-ready category:

- 57 recognized image filename extensions across common raster, specialist, legacy, and camera RAW families.
- 16 product-certified output formats: JPG, PNG, WebP, AVIF, TIFF, GIF, BMP, ICO, JXL, JP2, HDR, EXR, PCX, TGA, QOI, and PNM.
- HEIC/HEIF remains an input family: the packaged WASM runtime can expose its decoder, but the current runtime scan does not expose a HEIC writer, so ConvertAnyFile does not advertise HEIC output.
- Every browser session performs a full ImageMagick readable/writable codec scan; the UI only exposes outputs that are both in the certified catalog and writable in the packaged runtime.
- 100% browser-side conversion for the current image workflow.
- Batch queue with sequential processing and failure isolation.
- 50 files / 75 MB per file / 300 MB per batch safety policy.
- Dimension and estimated decoded-memory guards before conversion.
- Progress, cancel, recoverable-only retry, per-file download, and ZIP download.
- File signature validation before queue admission.
- Runtime codec capability checks before conversion.
- EXIF orientation normalized into pixels before output.
- Deterministic white flattening when converting transparent input to an opaque output.
- Container awareness for multi-frame GIF/WebP, multi-page TIFF, and multi-size ICO; the current product deliberately creates one image per input file rather than claiming animation/page/layer preservation.
- ICO hardening for multi-size PNG-backed icons plus legacy DIB/BMP fallback.
- Drag-and-drop can append files after the first batch is already loaded.
- Generic engine-declared conversion controls instead of an image-only quality field in the shared `EngineAdapter` contract.

### Certified vs recognized

"Recognized input" and "certified output" are intentionally different concepts.

A recognized input extension still has to pass signature validation and runtime decoder checks. Camera RAW support remains best-effort because decoder compatibility can vary by camera model and file variant.

A certified output must satisfy both gates:

1. it is explicitly included in the ConvertAnyFile product output catalog; and
2. the packaged ImageMagick WASM runtime reports a writable encoder for it.

The Chromium release matrix then converts a real PNG fixture to every certified output and feeds the generated file back through the public converter path to prove it can be decoded again.

## Architecture

```text
src/
  components/            shared Header, Footer, ConverterPageFrame, ConverterShell, FAQ UI
  config/                one site config + one converter route registry
  content/               reusable FAQ and conversion guidance
  layouts/               one shared Astro page shell / SEO metadata layer
  platform/converter/    generic queue policy, engine registry, ZIP/downloads
  engines/image/         image detection, codec policy, ImageMagick WASM worker
  client/                generic converter controller
  pages/                 static routes and SEO conversion presets
```

New file categories should implement the shared `EngineAdapter` instead of duplicating the website or queue UI. Output-specific settings are declared by each engine through generic control metadata, so a future audio engine can expose bitrate/sample rate and a data engine can expose delimiter/encoding without inheriting image-specific concepts.

### Converter page contract

Every live converter route must render through `ConverterPageFrame`. The frame owns the compact breadcrumb/eyebrow/title/intro region and renders the shared `ConverterShell` in compact mode so the file picker remains the primary first-screen action.

Do not create category-specific hero or converter spacing for new engines. A future Data, Archive, Audio, Subtitle, Font, or other converter page should reuse `ConverterPageFrame`; only the engine, route definition, settings, and category-specific content should change.

CI reads the generated sitemap and enforces this contract for every page that contains a live converter. It also checks at 1440×900 that every live converter route keeps the drop zone and Choose files control inside the first desktop viewport.

## Why Astro

Astro produces crawlable static HTML while allowing shared layouts/components and client-side converter scripts. Conversion engines are lazy-loaded only when a user interacts with the converter.

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

No Pages Function, KV, D1, R2, or conversion backend is required for the current image converter.

## SEO model

- Canonicals are generated from `https://convertanyfile.net`.
- `@astrojs/sitemap` generates the sitemap from actual static routes.
- `robots.txt` reads the same site config and points to the generated sitemap index.
- Pair pages are real converter presets backed by one converter engine, not copied converter implementations.
- Header, footer, FAQ UI, layout, metadata shell, converter page frame, and converter shell are shared components.

## Image release gates

The image category is not considered releasable unless all of the following are green in CI:

- Astro type/content diagnostics (`npm run check`)
- production static build (`npm run build`)
- sitemap/canonical/internal-link/site-layout regressions
- Chromium real ImageMagick conversion tests
- Firefox and WebKit controller/bootstrap coverage
- 50-file batch and decoded-memory safety checks
- append-by-drag regression
- PCX, TGA, and real multi-size ICO regressions
- transparent PNG to JPG white-background pixel regression
- certified output encode + decode-back matrix
- deterministic invalid/unsupported failures do not offer pointless retries

## Expansion rule

Future categories such as audio, archives, and data should be added only when they can provide a dependable browser-first workflow. Avoid adding unsupported placeholder conversion routes to Search.

For every future live converter category:

1. implement or register its engine adapter;
2. define real converter routes and settings;
3. render the category and pair routes through `ConverterPageFrame`;
4. keep category-specific guidance below the tool rather than pushing the file picker down;
5. let sitemap, canonical, internal-link, shared-frame, first-viewport, and category-specific conversion CI tests validate the new routes automatically.
