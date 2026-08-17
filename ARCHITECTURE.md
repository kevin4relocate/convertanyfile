# ConvertAnyFile Platform Architecture

## Principle

The website shell and the conversion engine are separate products inside one repository.

A new converter category must not require copying the header, footer, FAQ markup, batch queue, download logic, sitemap, robots file, or page layout.

## Shared platform

`SiteLayout.astro` owns document metadata, canonical URLs, structured data hooks, header and footer.

`ConverterShell.astro` owns the reusable dropzone, settings area, scrollable queue, progress area and sticky action bar.

`converter-app.ts` owns generic batch lifecycle: admission, queue state, progress, cancel, retry, result statistics and ZIP download.

`EngineAdapter` is the boundary between the generic queue and category-specific conversion logic.

## Engine contract

A future engine provides accepted extensions, lightweight validation, lazy runtime initialization, runtime capabilities, available outputs, conversion implementation and reset/cancel behavior.

The image implementation lives entirely under `src/engines/image/`.

## Routing and SEO

`src/config/converters.ts` is the route registry for real converter pages. Static pair pages are generated from that registry and reuse the same converter shell.

Do not create a route until the conversion is real, testable, and useful. This avoids thin placeholder pages and keeps sitemap output aligned with product capability.

## Browser safety

Policies are supplied by the converter definition rather than hard-coded in UI components. Image currently uses 50 files, 75 MB per file, 300 MB total, and sequential processing.

Future audio/archive/data engines can define different limits without changing shared UI code.
