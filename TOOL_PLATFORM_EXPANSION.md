# Tool Platform Expansion Plan

This document is the working contract for growing ConvertAnyFile from a small catalog into a dependable multi-tool platform.

## Current state

The deployed product uses static Astro pages with client-side processing (WebAssembly, Web Workers, Canvas, browser APIs). Its four converter families share an `EngineAdapter` queue. Image Tools have several different specialized UI runtimes. Those distinctions should remain: not every tool can use the same editor.

### Existing platform families

| Family | Engine / UI platform | Best for |
| --- | --- | --- |
| Image conversion | `EngineAdapter` + ImageMagick WASM | Real image format conversions |
| Data conversion | `EngineAdapter` + text worker | CSV, JSON, TSV and structured-data formats |
| Archive conversion | `EngineAdapter` + bounded decoder | Container repackaging and extraction |
| Subtitle conversion | `EngineAdapter` + timed-text worker | SRT, VTT, ASS, SSA, SBV and timing operations |
| Deterministic image editing | Shared image editor, Canvas operations | Resize, compress, crop, flip, rotate, blur |
| Mask-based image editing | Dedicated mask editor and repair worker | Manual watermark-area repair |
| Filename & metadata utilities | Dedicated focused workflows | Rename without re-encode; metadata cleanup |

## Platform quality gates (apply to every new tool)

1. **Real implementation.** Do not publish a landing page until a functioning engine, appropriate supported formats, and a tested output exist.
2. **Single source of truth.** Every published tool must have one typed ID, slug, status, category, runtime family, navigation metadata, and SEO content owner. Derive navigation and directory pages from the catalog.
3. **No unbounded work.** Reject unsupported/corrupt inputs before heavy processing, set admission and decoded-memory budgets, and process batches sequentially or with explicit concurrency limits.
4. **Explicit cancellation.** Cancel, clear and navigation/reset must invalidate stale async operations; never show stale results.
5. **Private by default.** Process user files in the browser without submitting file bytes to analytics, conversion servers, or external APIs, unless a tool explicitly changes this contract and displays a clear notice.
6. **Accurate claims.** Document what format conversion preserves, what it can lose, and which browser capabilities are required. Never claim that local pixel editing removes invisible AI provenance.
7. **Reusable UX.** Use shared dropzone, validation, batch state, progress, cancel/retry, downloads and ZIP export where the workflow truly matches; otherwise implement a focused editor.
8. **SEO integrity.** Unique tool intent, visible useful content, canonical URL, legitimate FAQ/schema, and internal linking. Experimental tools stay out of sitemap/navigation until released.
9. **Verification.** TypeScript check + build + Playwright desktop/mobile/Firefox/WebKit, boundary inputs, downloadable output validation and a production smoke test.

## Refactoring phases

### Phase 1 — production safety and catalog consistency (started in PR #56)

- Fix eager ZIP CRC validation that can inflate an oversized archive before enforcing limits.
- Run Astro's TypeScript diagnostics as a mandatory production build gate.
- Derive desktop/mobile tool links from the published tool roadmap.
- Type-check tool loader IDs against roadmap IDs.
- Add archive adversarial regression tests.

### Phase 2 — real typed tool manifest

Move the *released* tool inventory to one declarative manifest with:

- stable ID, category, slug and human-readable name;
- publication status (`live` / `preview` / `planned`);
- runtime family/loader key (not a full dynamic import path embedded in page markup);
- accepted inputs, output types, file/decoded-size budget and batch limits;
- search/navigation labels, SEO metadata and description;
- feature flags: batch, preview, local-only, ZIP, cancel, per-image overrides.

Migration should preserve current URLs and exports. The manifest must fail build validation if IDs, slugs, runtime registrations, routes, or metadata are missing or duplicated.

### Phase 3 — shared execution infrastructure

Factor common logic into small explicit modules rather than another giant base class:

- `core/file-admission`: extensions, MIME, signatures, memory thresholds;
- `core/batch-session`: jobs, statuses, cancellation token/generation, retry;
- `core/output`: filename validation, Blob URL cleanup, ZIP export;
- `core/capabilities`: browser APIs and WASM/worker support;
- `core/observability`: privacy-safe error codes and performance metrics.

Keep masks, rendering, transforms, naming and conversion codec work inside specialized runtimes. Only move code when a regression test establishes equivalent behavior.

### Phase 4 — scalable discovery and navigation

Use a category-driven directory with search/filter, related tool suggestions, popular/featured groups and keyboard/mobile navigation. Do not place hundreds of tools in a single dropdown. Preserve crawlable server-rendered category pages and links.

### Phase 5 — expansion in tested batches

Add small groups of related tools per pull request. Prefer tools that share an existing local engine and provide a distinct useful outcome.

**Image editing ideas:** image-to-base64, base64-to-image, image color picker, grayscale, brightness/contrast, border, rounded corners, pixelate, split image, combine images, contact sheet, social-media image sizing, image dimensions, favicon generation.

**Document/text ideas:** text case converter, JSON formatter/validator, XML formatter, YAML/JSON conversion with safe parser, CSV column reorder, CSV deduplication, TSV-to-CSV enhancements, text diff, duplicate-line remover.

**Developer/file utilities:** hash (SHA-256), filename sanitizer, file-size inspector, MIME signature viewer, URL encoding/decoding, Base64 text, UUID generator, color conversion, timestamp formatting.

**Subtitle utilities:** shift timing, merge/split cues, remove HTML/ASS tags, SRT-to-text, cue numbering repair, line wrapping and reading-speed checks.

Any proposed new format must be verified in the deployed runtime; choosing an extension alone is not proof of working conversion.

## CI and release policy

No automatic merge. Every batch should pass `npm run build` and existing browser tests before merge. Monitor Cloudflare Pages output size and asset counts. Production smoke tests should be run against the updated deployment. Avoid mass-generating low-value, near-duplicate landing pages for search engines.

## Refactor progress — 2026-11-11

- **Phase 1:** ZIP extraction budget enforcement, CRC regression tests, strict Astro type diagnostics and reliable navigation. The prior commit passed CI across Chromium, Firefox and WebKit.
- **Phase 2:** The `IMAGE_TOOL_MANIFEST` in `src/config/image-tools.ts` is now the central source for released tool definitions and discovery/runtime metadata. IDs, slugs, statuses, SEO text and admission budgets come from the tool definitions. The roadmap, desktop/mobile navigation, directory groups and editor runtime selection are derived from it. `tests/image-tool-manifest.spec.ts` covers routes, metadata and mountability.
- **Phase 3 started:** `downloadResultBatch` in `src/image-tools/core/download.ts` eliminates repeated single-file/ZIP branching in four image editor families. Mask-editor ZIP progress and error UX remain specialized.
- **Release gate:** These follow-up changes must pass the full CI suite before merging. A green build alone is not sufficient.

### Adding a tool using the existing editor

1. Implement a real operation in the appropriate runtime and expose its settings in its dedicated editor shell.
2. Add the typed public `ImageToolDefinition` with limits and unique SEO content in `src/config/image-tools.ts`.
3. Add an `IMAGE_TOOL_MANIFEST` entry with runtime family, directory group and short navigation/summary copy. Do not add separate manual entries to the menu or roadmap.
4. Add the actual Astro tool route (or use an appropriate future route factory), validation tests and output-fidelity coverage.
5. Keep the tool in Preview and out of the live navigation until quality, cancellation, memory budgets and downloads pass.
