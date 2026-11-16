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

Strict **primary-guide** coverage: **19 existing**, **10 scheduled in this batch**, **122 without a dedicated primary article**. The CSV deliberately does not count a mere mention or a "related" link as a primary guide. Static existing guides are mapped when they directly address a tool; existing image/conversion growth articles are mapped by their `toolHref`.

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

## Follow-on backlog (122 uncovered)

1. Prioritize remaining high-use, straightforward functionality: JSON Minifier/Decoder, URL Decoder, HTML Entity tools, CSV filters and transformations, image crop/compress/color utilities.
2. Expand detailed image utilities and advanced editors, using feature-specific examples verified against their real controls and limitations.
3. Cover format pair routes in **decision-led** clusters rather than producing dozens of near-duplicate "click Convert" pages. For example: HEIC handling across JPG, PNG, WebP; PNG transparency tradeoffs; archive compatibility and what metadata is preserved; subtitle formats and timing.
4. Cover converter hub pages with genuine task selection guides and avoid keyword-cannibalizing the format pair guides.

Editorial gate for every future article: test the actual tool; include a meaningful independent use case and example; explain accuracy/format caveats; write unique H1/title/description; include one relevant original visual; use helpful alt and caption; add direct internal links; verify accessibility, structured data, images, 404s and build. Never generate content for disabled Gemini routes while they are unpublished.

After each 10-article batch, review Google Search Console impressions/indexing and engagement before expanding. Regular publication is an editorial cadence, **not** a ranking guarantee.
