# ConvertAnyFile

ConvertAnyFile.net is a browser-first file conversion platform designed around a shared static site shell and pluggable local converter engines.

## Current release

Image conversion is live first:

- JPG, PNG, WebP, HEIC/HEIF, AVIF, TIFF, GIF, BMP, ICO and additional image/camera formats where the packaged runtime can decode them.
- 100% browser-side conversion for the current image workflow.
- Batch queue with sequential processing.
- 50 files / 75 MB per file / 300 MB per batch safety policy.
- Progress, cancel, retry, per-file download and ZIP download.
- File signature validation before queue admission.
- Runtime codec capability checks before conversion.

## Architecture

```text
src/
  components/            shared Header, Footer, ConverterShell, FAQ UI
  config/                one site config + one converter route registry
  content/               reusable FAQ and conversion guidance
  layouts/               one shared Astro page shell / SEO metadata layer
  platform/converter/    generic queue policy, engine registry, ZIP/downloads
  engines/image/         image-only detection + ImageMagick WASM worker
  client/                generic converter controller
  pages/                 static routes and SEO conversion presets
```

New file categories should implement the shared `EngineAdapter` instead of duplicating the website or queue UI.

## Why Astro

Astro produces crawlable static HTML while allowing shared layouts/components and client-side converter scripts. Conversion engines are lazy-loaded only when a user interacts with the converter.

## Local commands

```bash
npm install
npm run dev
npm run build
npm run preview
npm run test:e2e
```

## Cloudflare Pages

Use a static Pages deployment:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node: `22.16.0`

No Pages Function, KV, D1, R2, or conversion backend is required for the current image converter.

## SEO model

- Canonicals are generated from `https://convertanyfile.net`.
- `@astrojs/sitemap` generates the sitemap from actual static routes.
- `robots.txt` reads the same site config and points to the generated sitemap index.
- Pair pages are real converter presets backed by one converter engine, not copied converter implementations.
- Header, footer, FAQ UI, layout, metadata shell, and converter shell are shared components.

## Expansion rule

Future categories such as audio, archives, and data should be added only when they can provide a dependable browser-first workflow. Avoid adding unsupported placeholder conversion routes to Search.
