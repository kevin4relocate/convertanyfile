# ConvertAnyFile

ConvertAnyFile.net is a browser-first file conversion and image-tools platform built around a shared static Astro site and local processing engines.

## Public converter categories

### Image
- Browser-side ImageMagick WASM conversion.
- 50 files / 75 MB per file / 300 MB per batch.
- Runtime codec detection plus a product-certified output whitelist.
- EXIF orientation normalization, deterministic flattening for opaque outputs, decoded-memory guards and sequential conversion.

### Data
- CSV, TSV, JSON, JSONL and NDJSON input.
- CSV, TSV, JSON and JSONL output.
- UTF-8 validation and deterministic worker parsing/serialization.
- 50 files / 20 MB per file / 100 MB per batch.

### Archive
- ZIP, TAR, TAR.GZ/TGZ, GZIP, 7Z and RAR input families.
- 7Z and RAR are input-only; certified outputs are ZIP, TAR and TAR.GZ.
- Archive-specific admission and expansion limits plus local ZIP/download workflows.

### Subtitle
- SRT, VTT/WebVTT, ASS, SSA and SBV input.
- SRT, VTT, SBV and TXT output.
- 17 real cross-format pair routes; no same-format placeholder routes.
- Full-file worker preflight before a file becomes Ready.
- Timing shift, text cleanup, line-ending/BOM controls and transcript export.
- 50 files / 5 MB per file / 50 MB total / 100,000-cue parser guard.

All converter categories reuse the generic queue, progress, cancel, retry, per-file download, ZIP packaging, SEO shell and responsive page frame. Category behavior stays behind `EngineAdapter` implementations.

## Public Image Tools

Image Tools use focused browser-side workflows rather than the converter `EngineAdapter` pipeline.

### Visible watermark repair

**Remove Watermark**
- JPG/JPEG, PNG and WebP.
- Rectangle, Circle, Square, Diamond, 4-Point Star and manual Text masks.
- Shared or per-image masks, move/resize/rotate, Undo/Clear, Before/After, output controls and ZIP download.
- Local deterministic repair; no cloud image-generation API.

**Gemini Watermark Remover**
- Uses the same stable local repair runtime.
- Intentionally exposes only Circle and 4-Point Star; 4-Point Star is the default.
- Targets the small visible Gemini-style sparkle mark and does not claim to remove invisible provenance systems.
- ConvertAnyFile is not affiliated with or endorsed by Google or Gemini.

### Deterministic image tools
- Resize Image — pixels, percentage or fit-to-box.
- Compress Image — output format and quality.
- Rotate / Flip Image — 90/180/270-degree rotation and horizontal/vertical mirroring.
- Crop Image — free crop and common aspect ratios.
- Blur Image — whole-image or selected-region blur.

These tools keep one active preview, cap preview rendering, process the batch sequentially and support shared settings with individual overrides where appropriate.

### File utilities

**Remove Image Metadata**
- Dedicated file-cleanup workflow with no image editor preview.
- Creates new JPG/PNG/WebP copies without intentionally copying common EXIF, GPS or software metadata fields.
- Uses one simple batch setup and sequential processing.

**Bulk Rename Images**
- Renames files without decoding or re-encoding image bytes.
- Supports shared filename patterns, numbering and individual overrides.

Remove Object and Remove Background are not part of the current public release surface. Their previous experimental routes/runtime were removed from this release branch until a dependable implementation is available.

## Architecture

```text
src/
  components/                 shared Header/Footer, converter frames and Image Tool shells
  config/                     site config, converter registries and public Image Tool definitions
  content/                    reusable FAQ, guides and Image Tool SEO content
  layouts/                    shared Astro SEO/document shell
  platform/converter/         generic converter batch policy, controls and ZIP/download
  platform/image-tools/       Image Tool types/contracts
  engines/image/              image conversion engine
  engines/data/               structured-data conversion engine
  engines/archive/            archive conversion engine
  engines/subtitle/           timed-text worker/parser/runtime
  image-tools/deterministic/  resize/compress/rotate/crop/blur runtime
  image-tools/metadata/       metadata cleanup runtime
  image-tools/naming/         bulk rename runtime
  image-tools/shared/         shared watermark batch editor + mask geometry
  image-tools/remove-watermark/ local visible-pixel repair worker/client
  client/                     converter and Image Tool bootstraps
  pages/                      static product, guide, format and converter routes
```

A new converter category implements `EngineAdapter`; it must not duplicate queue/download infrastructure.

A new Image Tool should reuse an existing shell/runtime only when its workflow genuinely fits that contract. Tool-specific behavior belongs in config or a dedicated focused runtime rather than global CSS/DOM patches.

## Image Tools safety model

Current public Image Tools share these source limits unless a tool defines a stricter policy:
- up to 50 images;
- 10 MB per source image;
- 20 megapixels decoded;
- 12,000 pixels maximum side.

Visual and metadata processing is sequential so the site does not intentionally decode/process an entire batch in parallel. Preview-based deterministic tools cap the active preview at 1,200 px maximum dimension. Watermark repair runs in a Web Worker. Bulk Rename avoids pixel processing entirely.

Multiple completed results may remain in memory until download/ZIP creation, so browser/device memory still matters for unusually large batches. Safety limits and sequential processing reduce this risk but do not make browser memory unlimited.

## Local commands

```bash
npm ci
npm run check
npm run build
npm run preview
npm run test:e2e
```

`npm run build` is a release gate. It now runs:
1. required runtime synchronization;
2. Astro diagnostics;
3. the static Astro build;
4. a full generated-page SEO audit;
5. the Cloudflare static-asset count/size guard.

## Cloudflare Pages

Use a static Pages deployment:
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node: `22.19.0`

No Pages Function, KV, D1, R2 or conversion backend is required for the current browser-first workflows.

## SEO model

- Canonicals use `https://convertanyfile.net`.
- `@astrojs/sitemap` generates the sitemap from actual static routes.
- `SiteLayout.astro` owns canonical, robots, Open Graph and Twitter metadata.
- Converter pair pages are real engine-backed presets with unique content/schema.
- Public Image Tools have unique titles/descriptions, crawlable explanatory content, FAQ/internal links where appropriate and structured data.
- Planned or retired Image Tools do not receive public routes merely to increase page count.
- `scripts/check-static-seo.mjs` audits every generated HTML page and fails the build for missing/duplicate core SEO metadata, bad canonicals, missing sitemap entries or links to retired heavy tools.

## Production release gates

Before merging to `main`, keep these gates green:
- `npm run check`;
- `npm run build`;
- Chromium desktop/mobile, Firefox and WebKit Playwright coverage;
- converter fidelity and cancellation regressions;
- Image Tool workflow/UX regressions;
- sitemap/canonical/title/description/internal-link checks;
- Cloudflare static asset count and maximum asset-size guard;
- production smoke tests after deployment.

CI is defined in `.github/workflows/ci.yml`. Production smoke coverage is defined in `.github/workflows/production-smoke.yml` and `production-tests/production-smoke.spec.ts`.

### Test a Cloudflare Pages Preview before merging

Cloudflare Pages branch Preview and the production hostname deliberately behave differently: analytics only runs on `convertanyfile.net` / `www.convertanyfile.net`. The smoke test validates this distinction without creating GA4 sessions from previews.

1. Open the Cloudflare Pages project and locate the exact deployment URL of the PR branch under **Deployments**. Never guess a `pages.dev` URL; confirm the branch and commit SHA.
2. In GitHub, open **Actions → Production Smoke → Run workflow**. Select the PR branch from the branch selector.
3. Paste the verified Preview URL into the **base_url** input and start the workflow. Alternatively, run `PLAYWRIGHT_BASE_URL=https://YOUR_ACTUAL_PREVIEW_HOST npm run test:production` locally.
4. Check CSP/security headers, static routes, no Analytics bootstrap on previews, image/data output downloads and sitemap consistency.
5. After merging and confirming the production deployment finished, rerun **Production Smoke** for `https://convertanyfile.net`, which expects the Analytics bootstrap and checks canonical redirect behavior.

The smoke test does not provision Cloudflare Preview deployments. It requires a real, accessible Preview URL for the exact branch. Do not merge if preview or cross-browser checks are failing.


See the category release checklists for additional product-specific verification.

## Expansion rule

Add a public route only when its engine or interactive workflow is dependable, testable and useful. Reuse the appropriate platform rather than copying a product-specific implementation.
