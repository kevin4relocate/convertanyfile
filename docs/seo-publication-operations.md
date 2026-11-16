# Daily SEO guide publication — operational notes

## Why a scheduled rebuild is necessary

The site is an Astro static export. `getPublishedToolSeoGuides()` includes guides whose `publishDate` is no later than the Vietnamese calendar date **at build time**. Simply storing future-dated guides in Git does **not** publish them automatically.

The 90 scheduled articles run daily from **2026-11-17** through **2027-02-14**. Their slugs, dates and SVG assets are kept intact. The first day's content only appears after a build on/after its publication date.

## Daily workflow

`.github/workflows/publish-scheduled-guides.yml` runs at **17:15 UTC**, equivalent to **00:15 Asia/Ho_Chi_Minh on the next calendar day**. UTC is fixed; Vietnam does not use daylight saving time.

1. Checks out `main` and builds the site, including SEO audits.
2. If the optional `CLOUDFLARE_DEPLOY_HOOK` GitHub Actions secret is configured, sends the deploy hook a POST request.
3. Otherwise pushes a single dated, empty Git commit to `main`; this is intended to trigger a Cloudflare Pages production build via an existing GitHub/Cloudflare Git integration.
4. Avoids duplicate daily empty commits when the same workflow runs repeatedly.
5. Stops creating publication triggers after 2027-02-14. Existing pages remain published.

**Recommended production configuration:** create a Cloudflare Pages production Deploy Hook and add its URL as GitHub Actions secret `CLOUDFLARE_DEPLOY_HOOK`. This bypasses branch-protection restrictions and is more direct than pushing an empty commit. Do not commit a deploy hook URL to Git.

**No-config fallback:** the empty-commit method requires `GITHUB_TOKEN` with `contents: write` to be allowed to push to `main`. If GitHub branch protection or Cloudflare's Git integration blocks that action, publication will not occur; use the Deploy Hook instead.

## How to verify that publication really happened

- In GitHub Actions, inspect `Publish scheduled SEO guides` for the day. A successful GitHub workflow only proves that a trigger was sent or a commit was pushed, not that Cloudflare finished deploying.
- In Cloudflare Pages, check the production deployment log and its completion status.
- Fetch `/guides/tool/<today-slug>/` with a normal GET request and confirm HTTP 200; also check that tomorrow's article is not already public.
- Fetch `/sitemap-index.xml` and confirm only already-published guides are included.
- In Google Search Console, inspect important URLs, indexing and page impressions. A successful static build does **not** guarantee Google indexing.

A first manual workflow dispatch is recommended after merging this feature to verify the deployment integration, and again after configuring the optional secret if needed. GitHub's scheduled runners may start late; the workflow does not promise publication at an exact minute.

## Content quality guardrails

`npm run check:content-seo` now checks each scheduled article's independent title/slug, at least 260 words, publish date, image/alt/caption, internal links and duplicate substantial paragraphs. It also rejects generic template descriptions and checks the ten new format converters have explanatory SEO content.

The SEO inventory `docs/tool-guide-coverage.csv` tracks **161 URLs**: 19 already covered with separate guides, 90 scheduled, and 52 without dedicated guide articles (including ten new format converters). The new converter pages have their own on-page explanatory content; an in-page FAQ is not counted as an independent guide.

## Hidden Gemini remover

The Gemini AI Logo Remover engine is retained in source but omitted from the public image manifest, navigation, sitemap and informational pages. Do not restore public references without an explicit release decision.
