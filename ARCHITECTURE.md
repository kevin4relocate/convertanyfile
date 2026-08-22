# ConvertAnyFile Platform Architecture

## Principle

ConvertAnyFile has one static site shell with two local-processing product families:

1. **Converters** — category engines behind the generic `EngineAdapter` batch pipeline.
2. **Image Tools** — interactive visual editing behind a shared canvas/mask batch editor.

A new product must reuse the appropriate platform instead of copying header, footer, SEO layout, queue, download logic, or product-specific editor code.

## Shared site platform

`SiteLayout.astro` owns document metadata, canonical URLs, structured data hooks, header, and footer.

Static Astro routes provide crawlable product and guide content. Browser code is loaded only for the interactive workflow needed by the page.

## Converter platform

`ConverterShell.astro` owns the reusable dropzone, engine-declared settings area, queue, progress area, and action bar.

`converter-app.ts` owns generic converter batch lifecycle: admission, append-by-drop, queue state, progress, cancel, retry, result statistics, and ZIP download.

`EngineAdapter` is the boundary between the generic queue and category-specific conversion logic.

Production converter engine families include Image, Data, and Archive. Subtitle is integrated through the same contract as a Preview category. Each category supplies accepted inputs, safety policy, output capabilities, category controls, conversion implementation, and reset/cancel behavior without forking the shared queue.

Generic output controls currently support range, number, select, and checkbox inputs. Category-specific controls must be declared by an output definition rather than hard-coded into the shared controller.

## Subtitle Preview contract

Subtitle is a deterministic timed-text converter, not a media transcoder or subtitle editor.

Public Preview inputs:
- SRT
- VTT / WebVTT
- ASS
- SSA
- SBV

Public outputs:
- SRT
- VTT
- SBV
- TXT

ASS and SSA remain input-only because SRT, VTT, SBV, and TXT cannot reproduce their full style, positioning, karaoke, drawing, and effect model.

The Subtitle engine chain is:

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

Full-file preflight occurs in the Subtitle worker before admission. A Ready subtitle has already passed complete timed-text parsing rather than only an extension check or partial sample.

Preflight metadata includes:
- cue count;
- timeline end;
- detected text encoding;
- richer-format / WebVTT metadata flags.

The parser supports UTF-8, UTF-16LE/BE BOM input, then Windows-1252 fallback only after strict UTF-8 fails. Generated text output is UTF-8.

The current transform contract includes:
- exact whole-millisecond timing shift from -600000 to +600000 ms;
- rejection when a negative shift would move a cue before `00:00`;
- opt-in plain-text cleanup for timed outputs;
- TXT timestamp modes and cue spacing;
- LF / CRLF and optional UTF-8 BOM output.

A no-transform VTT → VTT export validates the source but preserves the decoded WebVTT document body so document-level metadata is not discarded merely by normalization. Timing or text transforms rebuild parsed cues and therefore do not promise preservation of VTT document-level metadata.

## Image Tools platform

Image Tools are not `EngineAdapter` converters. They need stateful visual interaction: masks, active-image selection, Before/After canvases, shared/per-image editing state, and destructive visual edits.

The watermark products use this chain:

```text
ImageToolPageFrame
  → BatchMaskEditorShell
    → image-tool-app.ts
      → image-tools/shared/batch-mask-editor.ts
        → image-tools/shared/mask-geometry.ts
        → image-tools/remove-watermark/worker-client.ts
          → remove-watermark.worker.ts
            → inpaint.ts
```

`BatchMaskEditorShell.astro` owns the common editor DOM contract: batch queue, edit-mode toggle, mask toolbar, text-mask field when supported, Before/After panels, output controls, progress, Cancel, and download actions.

`batch-mask-editor.ts` owns common runtime state:
- input admission and limits;
- aspect-ratio compatibility checks;
- automatic `One mask for all` vs `Edit individually` recommendation;
- manual mode override persistence;
- normalized shared masks and per-image copies/overrides;
- active image selection;
- move/resize/rotate/Undo/Clear interaction;
- compact auto-fit Text-mask bounds;
- sequential local processing and cancellation;
- result restoration, encoding, and ZIP download.

`mask-geometry.ts` owns normalized mask geometry, rotation-aware hit testing and handles, edge-aware rotation-handle placement, and conversion to worker operations.

The current shared worker performs deterministic visible-pixel repair from nearby unmasked pixels. It is not a semantic image-generation model and must not be presented as one.

## Image Tool configuration contract

Product-specific mask choices live in `src/config/image-tools.ts`.

**Remove Watermark** exposes:
- Rectangle
- Circle
- Square
- Diamond
- 4-Point Star
- Text

Text creates a manual solid bold glyph-shaped mask with content-fitted bounds. It is not OCR or automatic text detection.

**Gemini AI Logo Remover / Gemini Watermark Remover** intentionally exposes only:
- Circle
- 4-Point Star

The 4-Point Star is the default. The focused Gemini product must not regain Rectangle or unrelated general-editor controls merely because the runtime supports them.

Both tools use the same batch and output engine. A feature or bug fix that belongs to shared behavior should be made once in the shared runtime.

## Shared / individual mask contract

Aspect ratio is used only to recommend a starting workflow:
- same-ratio batch → `One mask for all`;
- mixed-ratio batch → `Edit individually`.

Mixed-ratio files are not rejected solely because of ratio. The user can always change the mode manually.

A shared mask is normalized to image dimensions and stores rotation with its geometry. Switching to individual editing copies the shared operations into each image as a starting point. An edited copy becomes `Custom`; an unedited inherited copy remains `Shared copy`; an image without a mask is `Needs mask`.

The whole queue item is a selection target while the remove control remains a separate action.

## Mask geometry and worker contract

The shared editor passes only explicit visible-pixel operations to the worker:
- rectangle;
- ellipse;
- diamond;
- four-point star;
- text.

Square is an editor constraint and is rasterized as a square rectangle. All worker operations can carry rotation, and rasterization must match the visible rotated preview.

Text is rasterized locally as a solid bold filled glyph mask. Edge-safe placement may leave part of a selection outside the image; only intersecting in-image pixels are processed. The worker must not silently substitute a broad rectangular mask for text.

The repair worker rejects masks above the configured local safety threshold and never claims to remove invisible provenance, Content Credentials, metadata authenticity systems, or SynthID-style signals.

## Image codec contract

The image-converter product keeps separate concepts for recognized inputs, runtime capabilities, and product-certified outputs. The UI may offer an output only when it is both product-certified and writable by the packaged runtime.

Animated, multi-page, layered, and multi-size sources are not advertised as preserving all frames/pages/layers/sizes unless explicitly implemented and tested.

## Structured Data contract

The Data converter is deterministic: valid documented input, explicit delimited parsing, string-preserving tabular values, defined nested-JSON flattening, JSONL/NDJSON line semantics, and output controls for headers, line endings, BOM, and pretty printing. It is a format converter, not an ETL engine.

## Browser safety

Compressed file size alone is not a sufficient memory signal. Every product defines admission limits plus decoded/runtime safety where needed.

Current Subtitle Preview limits:
- 50 files per batch;
- 5 MB per source file;
- 50 MB total source input;
- 100,000 cues maximum per parsed file;
- sequential conversion;
- worker startup/analysis/conversion timeouts;
- timing shift limited to whole milliseconds from -600000 to +600000.

Current watermark-editor limits:
- 50 images per batch;
- 10 MB per source image;
- 200 MB total source input;
- 20 megapixels decoded;
- 12,000 pixels maximum side;
- sequential processing;
- masks above 15% of decoded image pixels are rejected by local repair.

Cancel/reset invalidates active worker work. A stale request must not publish a successful artifact after reset.

## Routing and SEO

Do not create a public route until the converter or editing workflow is real, testable, and useful. Planned Image Tools may appear as roadmap items without hrefs, but must not create thin placeholder routes.

Dedicated converter pages render through `ConverterPageFrame`. Watermark editor pages render through `ImageToolPageFrame` and the shared batch editor shell.

Subtitle exposes exactly 17 cross-format pair routes backed by its actual writer matrix. Same-format placeholder routes are not created for route count alone.

Product-specific explanation belongs below the shared interactive surface and must accurately describe current behavior.

## Release gate

A product is production-ready only when static checks, real browser workflow tests, safety limits, cancellation semantics, sitemap/canonical/internal-link checks, responsive UX, and existing-product regressions are green.

Subtitle remains Preview until:
- `SUBTITLE_RELEASE_CHECKLIST.md` is completed;
- static build/check execute successfully;
- Chromium desktop/mobile, Firefox, and WebKit regressions execute;
- real SRT/VTT/ASS/SSA/SBV files are smoke-tested;
- homepage auto-routing and 17 route inventory are verified;
- existing Image/Data/Archive and Image Tools regressions remain green.

Watermark Image Tools additionally require:
- exact mask-set regression for each public tool;
- real mask geometry, rotation, and rasterization checks;
- one-character Text-mask edge-placement regression;
- shared/mixed automatic mode behavior;
- manual override and per-image Custom state;
- Before/After restoration;
- output and ZIP behavior;
- text-mask behavior in supported browsers;
- mobile touch/no-overflow validation;
- manual Safari/WebKit and large-batch cancellation checks.

See `IMAGE_TOOLS_RELEASE_CHECKLIST.md` and `SUBTITLE_RELEASE_CHECKLIST.md` for product-specific gates.