# ConvertAnyFile Platform Architecture

## Principle

The website shell and the conversion engine are separate products inside one repository.

A new converter category must not require copying the header, footer, FAQ markup, batch queue, download logic, sitemap, robots file, or page layout.

## Shared platform

`SiteLayout.astro` owns document metadata, canonical URLs, structured data hooks, header and footer.

`ConverterShell.astro` owns the reusable dropzone, settings area, scrollable queue, progress area and sticky action bar.

`converter-app.ts` owns generic batch lifecycle: admission, append-by-drop, queue state, progress, cancel, retry, result statistics and ZIP download.

`EngineAdapter` is the boundary between the generic queue and category-specific conversion logic.

## Engine contract

A future engine provides accepted extensions, lightweight validation, lazy runtime initialization, runtime capabilities, available outputs, conversion implementation and reset/cancel behavior.

The image implementation lives entirely under `src/engines/image/`.

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

## Browser safety

Policies are supplied by the converter definition rather than hard-coded in UI components. Image currently uses 50 files, 75 MB per file, 300 MB total, and sequential processing.

The image adapter additionally rejects extreme decoded dimensions / estimated pixel memory before conversion. Compressed input bytes are not a sufficient safety signal.

Worker crash, message corruption, and timeout tear down the worker. A later request initializes a fresh worker. Deterministic corrupt/unsupported/memory failures are permanent and must not expose Retry; transient engine crash/timeout failures may expose Retry.

Future audio/archive/data engines can define different limits without changing shared UI code.

## Routing and SEO

`src/config/converters.ts` is the route registry for real converter pages. Static pair pages are generated from that registry and reuse the same converter shell.

Do not create a route until the conversion is real, testable, and useful. This avoids thin placeholder pages and keeps sitemap output aligned with product capability.

All dedicated converter pages render through `ConverterPageFrame` so the primary file action remains above the first desktop viewport. The homepage is the intentional marketing-layout exception and has its own viewport regression.

## Release gate

A category is production-ready only when static checks, browser UX regressions, category-specific real conversion tests, safety limits, and error semantics are green. The image release additionally requires the full certified-output matrix to encode every public output and decode that generated file back through the public converter path.
