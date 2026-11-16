# ConvertAnyFile — tool-by-tool SEO editorial coverage

Audit snapshot: 2026-11-16, branch `feat/content-seo-growth-batch-01`.
Source of truth: [tool-guide-coverage.csv](./tool-guide-coverage.csv), extracted from the active converter registries, live Image Tools manifests, Text Tools and Data Tools. Gemini Watermark Remover is intentionally excluded while unpublished.

## Verified inventory

| Product group | Tool / route entries |
| --- | ---: |
| Image converter (includes hub) | 29 |
| Data converter (includes hub) | 11 |
| Archive converter (includes hub) | 15 |
| Subtitle converter (includes hub) | 18 |
| Image Tools (including listed Preview tools) | 49 |
| Text Tools | 14 |
| Data processing tools | 15 |
| **Total** | **151** |

Strict **primary-guide** coverage after batch 02: **19 existing**, **40 scheduled across four batches**, **92 without a dedicated primary article**. The CSV deliberately does not count a mere mention or a "related" link as a primary guide. Static existing guides are mapped when they directly address a tool; existing image/conversion growth articles are mapped by their `toolHref`.

This is a *route audit*, not a claim of 151 separately differentiated editing engines. Summary hub routes and some Preview tools are included for tracking, and Preview features should not be promoted as live.

## Batch 01 — original editorial articles

One new English tutorial per day at 09:30 Vietnam time, from **Nov 17 through Nov 26, 2026**:

| Publish date (VN) | Topic | Tool |
| --- | --- | --- |
| Nov 17 | Format JSON without changing data | JSON Formatter |
| Nov 18 | JSON syntax vs schema | JSON Validator |
| Nov 19 | Unicode text to UTF-8 Base64 | Base64 Text Encoder |
| Nov 20 | Safe encoding of URL query parameters | URL Encoder |
| Nov 21 | UUID v4 identifiers and limitations | UUID Generator |
| Nov 22 | Required fields and data types with JSON Schema | JSON Schema Validator |
| Nov 23 | Merging CSVs with different columns | CSV File Merger |
| Nov 24 | Picking accurate HEX colors from images | Image Color Picker |
| Nov 25 | Image to Base64 data URLs | Image to Base64 |
| Nov 26 | Bulk renaming images without re-encoding | Bulk Rename Images |

Each guide includes a real tool-specific scenario, accurate constraints checked against tool definitions, distinct examples and mistakes, clear FAQs, a static self-authored SVG comparison diagram, accessible alt, descriptive caption, linking to the relevant tool and related active routes, Article JSON-LD, canonical and social-preview image. Existing articles are retained without cloning their copy.

## Publication mechanics

- `src/content/tool-seo-guides.ts` holds **prepared** articles and a `publishDate` in Asia/Ho_Chi_Minh date.
- `getPublishedToolSeoGuides()` filters by VN calendar date at **build time**. Future pages are absent from the built route set, Guides hub, structured ItemList, and HTML/XML sitemaps until their date.
- `.github/workflows/publish-tool-seo.yml` runs daily at **02:30 UTC = 09:30 Vietnam**. It only pushes one empty release-trigger commit on dates with a scheduled article; this prompts Cloudflare Git-based builds (if integrated) to regenerate the static site.
- This workflow **requires** GitHub Actions `contents: write` permission and permission to push to `main` under branch-protection policy. If Cloudflare does not automatically build on Git pushes, connect its deployment hook or trigger manually. Github scheduled jobs may be delayed; the workflow is not a guaranteed-to-the-minute delivery system.
- Manual `workflow_dispatch` is available for recovery. Same-day re-runs do not add a second release trigger if the date's commit already exists.
- The publication script **does not** modify any AdSense verification or advertising scripts. No future article is advertised before its publication date.

## Follow-on backlog (92 uncovered)

1. Prioritize remaining high-use, straightforward functionality: JSON Minifier/Decoder, URL Decoder, HTML Entity tools, CSV filters and transformations, image crop/compress/color utilities.
2. Expand detailed image utilities and advanced editors, using feature-specific examples verified against their real controls and limitations.
3. Cover format pair routes in **decision-led** clusters rather than producing dozens of near-duplicate "click Convert" pages. For example: HEIC handling across JPG, PNG, WebP; PNG transparency tradeoffs; archive compatibility and what metadata is preserved; subtitle formats and timing.
4. Cover converter hub pages with genuine task selection guides and avoid keyword-cannibalizing the format pair guides.

Editorial gate for every future article: test the actual tool; include a meaningful independent use case and example; explain accuracy/format caveats; write unique H1/title/description; include one relevant original visual; use helpful alt and caption; add direct internal links; verify accessibility, structured data, images, 404s and build. Never generate content for disabled Gemini routes while they are unpublished.


## Batch 02 — Nov 27 to Dec 06, 2026

Following the same one-article-per-day calendar (09:30 Asia/Ho_Chi_Minh), ten additional English tutorials are staged in `src/content/tool-seo-guides-batch-02.ts`. Each has its own SEO SVG diagram, alt and caption, practical examples, four distinct sections, FAQs and links to the real tool and relevant neighbors.

| Vietnam publish date | Primary guide / tool |
| --- | --- |
| Nov 27 | Minify JSON for APIs — JSON Minifier |
| Nov 28 | Decode UTF-8 Base64 — Base64 Text Decoder |
| Nov 29 | Percent-decoding and plus signs — URL Decoder |
| Nov 30 | HTML escaping — HTML Entity Encoder |
| Dec 01 | HTML entity decoding — HTML Entity Decoder |
| Dec 02 | Title case vs sentence case — Text Case Converter |
| Dec 03 | Numeric CSV sorting and leading zeros — CSV Row Sorter |
| Dec 04 | Literal CSV row filtering — CSV Row Filter |
| Dec 05 | CSV duplicates and key columns — CSV Duplicate Remover |
| Dec 06 | Dominant-color palettes — Color Palette Extractor |

**Updated audit:** 151 tool/route entries; 19 existing primary guides; 20 staged new guides across both batches; 112 missing primary guides. Next work should select from the remaining 112 rather than replicate the first 20.

The publication workflow now searches both content catalogs for the due date. Future articles remain absent from the static build until the date is reached and the main branch is rebuilt; no content is made public by the act of adding it to source control alone. A GitHub workflow run and Cloudflare deployment should be checked on the first scheduled publication date.


## Batch 03 — Dec 07 to Dec 16, 2026

The next ten guides follow the existing 09:30 Vietnam-time daily release workflow. Each is explicitly tied to one live tool, with four distinct sections, real operation-specific caveats, two FAQs, two relevant internal links and an original SVG illustration.

| Date (Vietnam) | Guide target |
| --- | --- |
| Dec 07 | CSV File Splitter: repeat headers and respect ZIP part cap |
| Dec 08 | CSV Column Selector: export exact named columns |
| Dec 09 | CSV Column Reorderer: retain unmentioned columns |
| Dec 10 | CSV Find & Replace: preserve CSV quoting |
| Dec 11 | CSV to SQL INSERT: escaping and textual identifiers |
| Dec 12 | SQL INSERT to CSV: supported literal statements only |
| Dec 13 | Image Dimension Inspector: pixels, aspect ratio and file size |
| Dec 14 | EXIF Metadata Viewer: supported tags, scope and GPS caution |
| Dec 15 | Image to Favicon: ICO sizes 16/32/48 |
| Dec 16 | App Icon Generator: PNG sizes and sample web app manifest |

The catalog is `src/content/tool-seo-guides-batch-03.ts`, loaded by `tool-seo-guides.ts`. The existing scheduled workflow glob `src/content/tool-seo-guides*.ts` recognizes the new dates automatically. Nothing is built or linked publicly before its Vietnam publication date. Updated primary-guide coverage: **151 total routes, 19 existing, 30 prepared, 102 uncovered**.


## Batch 04 — Dec 17 to Dec 26, 2026

A fourth ten-day daily queue is prepared with standalone practical tutorials, distinct SVG images, alt descriptions, captions, FAQs, and direct tool links. The unchanged GitHub Actions schedule (02:30 UTC = 09:30 Vietnam) automatically detects its dates via the existing content-file glob.

| Date (Vietnam) | Topic |
| --- | --- |
| Dec 17 | Word & Character Counter — graphemes versus UTF-8 bytes |
| Dec 18 | HEX / RGB / HSL Converter — CSS color equivalents |
| Dec 19 | Unix Timestamp Converter — seconds, milliseconds and timezones |
| Dec 20 | JSONPath Tester — supported safe expression subset |
| Dec 21 | JSON to XML — typed representation and round trip |
| Dec 22 | XML to JSON — generic attribute and repeated-element mapping |
| Dec 23 | CSV Data Profiler — missing values and numeric summaries |
| Dec 24 | Contact Sheet Maker — labeled photo overview grid |
| Dec 25 | Rotate / Flip Image — batch orientation and re-encoding |
| Dec 26 | Add Watermark — text/logo batch placement |

The fourth batch is stored in `src/content/tool-seo-guides-batch-04.ts`. **Updated coverage: 151 routes; 19 existing primary guides; 40 newly prepared and date-scheduled; 92 uncovered.** Do not publish future pages in the static build before their scheduled date, and keep the temporarily unpublished Gemini feature excluded.

After each 10-article batch, review Google Search Console impressions/indexing and engagement before expanding. Regular publication is an editorial cadence, **not** a ranking guarantee.
