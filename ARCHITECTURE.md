# ConvertAnyFile Platform Architecture

## Principle

ConvertAnyFile has one static Astro site shell with two local-processing product families:

1. **Converters** — category engines behind the generic `EngineAdapter` batch pipeline.
2. **Image Tools** — focused browser-side workflows for visual edits or file utilities.

A new product should reuse the appropriate platform rather than duplicating header/footer, SEO layout, queue, download logic or processing infrastructure.

## Shared site platform

`SiteLayout.astro` owns:
- canonical URLs;
- title and meta description;
- robots metadata;
- Open Graph and Twitter metadata;
- structured-data hooks;
- shared header/footer and global styles.

Astro emits static crawlable routes. Browser code is loaded only for the interactive workflow used by the page.

`@astrojs/sitemap` builds the sitemap from real generated routes. `scripts/check-static-seo.mjs` audits the generated HTML and sitemap before a production build is accepted.

## Converter platform

`ConverterShell.astro` owns the reusable dropzone, settings area, queue, progress area and action bar.

`converter-app.ts` owns generic converter lifecycle:
- admission;
- append-by-drop;
- queue state;
- progress;
- cancel/retry;
- result statistics;
- per-file download and ZIP download.

`EngineAdapter` separates generic batch UI from category-specific conversion logic.

Current public engine families are Image, Data, Archive and Subtitle. Each category supplies accepted inputs, safety policy, output capabilities, controls and conversion implementation without forking the shared batch controller.

## Subtitle contract

Subtitle is a deterministic timed-text converter, not a media transcoder.

Inputs:
- SRT;
- VTT / WebVTT;
- ASS;
- SSA;
- SBV.

Outputs:
- SRT;
- VTT;
- SBV;
- TXT.

ASS/SSA remain input-only because simpler output formats cannot reproduce their full style/positioning/effect model.

The engine chain is:

```text
ConverterPageFrame
  → ConverterShell
    → converter-app.ts
      → engine-registry.ts
        → engines/subtitle/runtime.ts
          → worker-client.ts
            → subtitle-engine.worker.ts
              → codec.ts
```

Full-file preflight occurs in the worker before a subtitle becomes Ready. Public routes expose the 17 real cross-format pairs backed by the writer matrix; same-format placeholders are not created for route count.

## Image Tools platform

Image Tools are separated by workflow instead of forcing every feature through one editor.

### Deterministic visual tools

Public tools:
- Resize Image;
- Compress Image;
- Rotate / Flip Image;
- Crop Image;
- Blur Image.

Chain:

```text
ImageToolPageFrame
  → DeterministicImageToolShell
    → image-tool-app.ts
      → image-tools/core/tool-registry.ts
        → image-tools/deterministic/deterministic-platform-editor.ts
          → operations.ts
          → output-encoder.ts
```

The runtime owns shared/individual settings, one active preview, sequential batch processing, cancellation, output blobs and ZIP/download behavior. Active previews are rendered with a bounded maximum dimension rather than at every source image's full resolution.

### Metadata cleanup

`Remove Image Metadata` uses a dedicated file-utility workflow because metadata removal does not need a Before/After image editor.

```text
ImageToolPageFrame
  → MetadataCleanupShell
    → image-tool-app.ts
      → tool-registry.ts
        → image-tools/metadata/metadata-cleanup-editor.ts
```

It shows files, cleanup settings and per-file status. It does not keep image preview object URLs or render a preview canvas. Processing creates new encoded image copies without intentionally copying common EXIF, GPS or software tags.

### Bulk rename

`Bulk Rename Images` is a filename utility. It keeps source image bytes unchanged and owns only naming patterns, per-file overrides, result-name preparation and download/ZIP packaging.

### Visible watermark repair

Public tools:
- Remove Watermark;
- Gemini Watermark Remover.

Chain:

```text
ImageToolPageFrame
  → BatchMaskEditorShell
    → image-tool-app.ts
      → image-tools/mask/mask-platform-editor.ts
        → image-tools/shared/batch-mask-editor.ts
          → mask-geometry.ts
          → remove-watermark/worker-client.ts
            → remove-watermark.worker.ts
              → inpaint.ts
```

The shared mask editor owns:
- input admission and batch queue;
- shared vs individual masks;
- active-image selection;
- move/resize/rotate/Undo/Clear;
- normalized mask geometry;
- sequential local repair;
- cancellation;
- result restoration;
- output encoding and ZIP download.

Remove Watermark exposes Rectangle, Circle, Square, Diamond, 4-Point Star and manual Text masks. Gemini Watermark Remover intentionally exposes only Circle and 4-Point Star.

The repair worker is deterministic visible-pixel reconstruction from nearby unmasked context. It is not a semantic cloud generative-fill model.

## Retired experimental Image Tools

`Remove Object` and `Remove Background` are not in the current release surface.

Their public routes, navigation entries and release runtime were removed after browser-performance/reliability problems. The background-removal ONNX/model synchronization code is also absent from the release branch, so production builds do not download or ship that AI runtime.

If either feature returns, it should be reintroduced as a separate tested change with explicit browser-memory, quality and cancellation gates rather than being silently re-enabled from historical code.

## Image Tool configuration contract

`src/config/image-tools.ts` is the public source of truth for released Image Tools and shared safety limits. `ImageToolGrid` and public navigation should derive only from that released surface.

Do not create a route or navigation entry for a planned/experimental tool until its workflow is dependable enough to ship.

## Browser safety

Compressed source size alone is not a sufficient memory signal. Products enforce admission and decoded/runtime limits where needed.

Converter category policies currently include:
- Image: 50 files, 75 MB per file, 300 MB input batch plus decoded-memory guards;
- Data: 50 files, 20 MB per file, 100 MB input batch;
- Archive: archive-specific source/expanded-entry limits and sequential work;
- Subtitle: 50 files, 5 MB per file, 50 MB input batch and 100,000 cues per parsed file.

Public Image Tools currently share, unless a stricter tool policy is introduced:
- 50 images maximum;
- 10 MB per source image;
- 20 megapixels maximum decoded image;
- 12,000 pixels maximum side.

Important runtime properties:
- deterministic Image Tools process one image at a time;
- deterministic previews render only the active image and cap preview dimensions;
- metadata cleanup processes sequentially and does not create image previews;
- watermark repair runs through a worker and processes sequentially;
- Bulk Rename avoids pixel decoding/re-encoding;
- completed output blobs can remain in memory until download/ZIP creation, so unusually large batches still depend on the browser/device memory ceiling.

Cancel/reset must invalidate active work. A stale operation must not publish a successful artifact after reset.

## Routing and SEO

Public product routes must be real, testable and useful.

- Converter pages render through `ConverterPageFrame`.
- Current Image Tool pages render through the shell appropriate to their workflow.
- Product pages include crawlable explanation below the interactive tool.
- Image Tool SEO content lives in `src/content/image-tool-seo.ts` for shared core-tool pages; watermark pages retain focused hand-tuned content.
- `imageToolSchemas()` provides WebApplication/Breadcrumb/FAQ structured data for core Image Tool pages.
- `SiteLayout` provides canonical/robots/OG/Twitter metadata globally.
- `scripts/check-static-seo.mjs` fails the build on missing or duplicate core metadata, bad canonicals, missing sitemap entries or links to retired heavy tools.

## Build and release gates

`npm run build` runs:
1. required runtime synchronization;
2. `astro check` diagnostics;
3. `astro build`;
4. full generated-page SEO audit;
5. Cloudflare static-asset count/size guard.

GitHub CI then runs the browser regression suite on Chromium desktop/mobile, Firefox and WebKit for pull requests and `main`.

Production smoke tests verify the deployed shell, robots/sitemap, converter outputs and public Image Tool route inventory.

A release should not merge while any of these gates are red.

## Expansion rule

Add a public route only when its engine or interactive workflow is dependable, testable and useful. Reuse the appropriate platform and keep product-specific behavior localized rather than accumulating global DOM/CSS patches.
