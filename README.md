# ConvertAnyFile

ConvertAnyFile.net is a browser-first file conversion and image-editing platform built around one shared static site shell and local processing engines.

## Converter categories

### Image — Live
- Browser-side ImageMagick WASM conversion.
- 50 files / 75 MB per file / 300 MB per batch.
- Runtime codec detection plus a product-certified output whitelist.
- EXIF orientation normalization, deterministic flattening for opaque outputs, and decoded-memory guards.

### Data — Live
- CSV, TSV, JSON, JSONL, and NDJSON input.
- CSV, TSV, JSON, and JSONL output.
- UTF-8 validation and deterministic browser-worker parsing/serialization.
- 50 files / 20 MB per file / 100 MB per batch.

### Archive — Live
- Browser-side archive conversion for supported ZIP, TAR, TAR.GZ/TGZ, GZIP, 7Z, and RAR input families.
- Category-specific archive safety limits and local ZIP/download workflows.
- 7Z and RAR remain input-only; certified public outputs are ZIP, TAR, and TAR.GZ.

### Subtitle — Preview
- SRT, VTT/WebVTT, ASS, SSA, and SBV input.
- SRT, VTT, SBV, and TXT output.
- 17 real cross-format pair routes; no same-format placeholder routes.
- Full-file worker preflight before a file becomes Ready.
- Queue analysis includes cue count, timeline end, detected encoding, and richer-format/WebVTT metadata flags.
- Exact whole-millisecond timing shift from -600000 to +600000 ms.
- Plain-text cleanup for timed output plus TXT timestamp and cue-spacing modes.
- LF/CRLF and optional UTF-8 BOM output controls.
- UTF-8, UTF-16LE/BE BOM input with Windows-1252 compatibility fallback.
- 50 files / 5 MB per file / 50 MB total / 100,000-cue parser guard.
- ASS/SSA are input-only because simpler outputs do not preserve their styling, positioning, karaoke, and effect model.

All converter categories reuse the generic batch queue, progress, cancel, retry policy, per-file download, ZIP packaging, SEO shell, and responsive page frame. Category behavior stays behind `EngineAdapter` implementations.

## Live Image Tools

Image Tools are intentionally separate from the converter `EngineAdapter` stack because they need a stateful canvas editor, masks, Before/After previews, and per-image visual-edit state.

### Remove Watermark
- One image or up to 50 JPG/JPEG, PNG, or WebP images.
- 10 MB per source image / 200 MB total source input.
- Rectangle, Circle, Square, Diamond, 4-Point Star, and manual Text masks.
- Text mode builds a solid bold glyph-shaped mask, auto-sizes its selection bounds to the typed content, and is not OCR or automatic text detection.
- All masks can be moved, resized, and rotated with visible handles.
- Same-ratio batches start with **One mask for all**.
- Mixed-ratio batches start with **Edit individually**.
- Shared-mask copies, per-image Custom overrides, Undo, Clear, Cancel, Before/After, output controls, and ZIP download.

### Gemini AI Logo Remover / Gemini Watermark Remover
- Uses the same shared batch mask editor and local repair worker.
- Intentionally exposes only **Circle** and **4-Point Star**; 4-Point Star is the default.
- Circle and Star masks use the same move/resize/rotate interaction as the general editor.
- Same shared/individual batch recommendation, per-image overrides, Before/After, Cancel, output, and ZIP behavior.
- SEO-facing copy targets visible Gemini watermark removal while the product remains explicit that it does not claim to remove invisible provenance systems.
- ConvertAnyFile is not affiliated with or endorsed by Google or Gemini.

## Architecture

```text
src/
  components/                 shared Header/Footer, converter frames, BatchMaskEditorShell, FAQ/content UI
  config/                     site config, converter registries, Image Tool definitions
  content/                    reusable FAQ and guidance
  layouts/                    shared Astro SEO/document shell
  platform/converter/         generic converter batch policy, controls, ZIP/download
  platform/image-tools/       Image Tool types/contracts
  engines/image/              image conversion engine
  engines/data/               structured-data conversion engine
  engines/archive/            archive conversion engine
  engines/subtitle/           timed-text parser, worker, runtime, protocol
  image-tools/shared/         shared batch mask editor + mask geometry
  image-tools/remove-watermark/ local visible-pixel repair worker/client
  client/                     converter controller + Image Tool bootstrap
  pages/                      static product, guide, format, and converter routes
```

A new **converter category** implements `EngineAdapter`; it must not duplicate queue/download infrastructure. Subtitle therefore adds a category-specific worker/parser and generic numeric output-control support without forking the batch controller.

A new **interactive Image Tool** should reuse the Image Tools shell/runtime when its workflow genuinely fits the same mask/editor contract. Product-specific choices belong in config, not copied editors. Remove Watermark and Gemini AI Logo Remover therefore share one runtime while exposing different mask sets.

See `ARCHITECTURE.md` for the platform contract.

## Converter page contract

Every public dedicated converter route renders through `ConverterPageFrame`. The frame keeps the main file action near the first desktop viewport while category-specific explanation stays below the shared converter.

Category-specific converter shells, queue implementations, and duplicated download logic are not allowed. Output controls such as image quality, archive compression, data settings, and Subtitle timing shift are declared by the category output configuration and rendered by the shared controller.

## Image Tools page contract

Every live watermark editor route renders through `ImageToolPageFrame` → `BatchMaskEditorShell` and mounts `src/image-tools/shared/batch-mask-editor.ts`.

The shared editor owns:
- admission and batch queue;
- automatic shared/individual recommendation;
- shared and per-image mask state;
- mask move/resize/rotate/Undo/Clear interaction;
- solid auto-fitted Text mask interaction when supported by the tool;
- sequential local repair and cancellation;
- Before/After result restoration;
- output encoding and browser-generated ZIP download.

Tool config owns the public mask vocabulary and copy. Do not fork the runtime merely to hide or add mask buttons.

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

No Pages Function, KV, D1, R2, or conversion backend is required for the current browser-first workflows.

## SEO model

- Canonicals are generated from `https://convertanyfile.net`.
- `@astrojs/sitemap` generates the sitemap from actual static routes.
- Pair pages are real converter presets backed by category engines.
- Subtitle publishes only the 17 real cross-format routes backed by its writer matrix.
- Image Tools receive routes only when the editing workflow is implemented; roadmap ideas do not create fake placeholder pages.
- Product pages use substantive body copy, FAQ, internal links, and matching guides where useful.

## Production release gates

All live products must keep these shared gates green:
- Astro diagnostics (`npm run check`)
- production static build (`npm run build`)
- sitemap/canonical/title/description/internal-link regressions
- desktop/mobile layout checks
- Chromium/Firefox/WebKit coverage appropriate to the workflow
- safety/admission limits and cancellation semantics
- previous production-product regressions.

Converter categories additionally require real output conversion tests for their supported matrix. Subtitle remains Preview until `SUBTITLE_RELEASE_CHECKLIST.md` and Cloudflare/browser validation are completed.

Image Tools additionally require mask geometry and rotation, shared/individual state, local worker rasterization/repair, Before/After restoration, output/ZIP, touch interaction, and browser memory/cancel validation.

See:
- `IMAGE_RELEASE_CHECKLIST.md`
- `DATA_RELEASE_CHECKLIST.md`
- `ARCHIVE_RELEASE_CHECKLIST.md`
- `IMAGE_TOOLS_RELEASE_CHECKLIST.md`
- `SUBTITLE_RELEASE_CHECKLIST.md`

## Expansion rule

Add a public route only when its engine or interactive workflow is dependable, testable, and useful. Reuse the appropriate shared platform rather than copying a product-specific implementation.
