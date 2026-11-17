# Daily SEO guide publication — operations and deployment verification

## Why the previous schedule was insufficient

Astro builds static pages. Each guide is included only when its `publishDate` is on or before the current Vietnamese date **at build time**.

The original workflow was merged on **2026-11-17 at 00:57 Asia/Ho_Chi_Minh**, after that day's **00:15** scheduled event. The initial scheduled run therefore could not start on November 17. A Cloudflare production build triggered by the merge could still publish the first guide, but a GitHub merge alone is not proof that the production URL exists.

## Updated release workflow

`.github/workflows/publish-scheduled-guides.yml` now runs at **17:15 UTC every day** (00:15 the next morning in Vietnam). It can also be started manually via GitHub Actions, and a change to the workflow file on `main` triggers a **one-time bootstrap run**. The bootstrap covers deployments when a workflow is merged after the daily cron event.

1. Reads the dated guide catalog directly via `scripts/seo-publication-plan.mjs`. There are 90 consecutive entries from **2026-11-17** to **2027-02-14**. No first or last dates are hard-coded in the workflow.
2. Runs `npm run test:seo-publication` to validate day boundaries and ensure the catalog is contiguous.
3. If a guide is due that day, runs the full production build, content checks and SEO checks. The due guide must exist in `dist/guides/tool/<slug>/index.html`.
4. Triggers Cloudflare production. If the GitHub Actions secret `CLOUDFLARE_DEPLOY_HOOK` exists, it sends a POST to that hook. Otherwise it attempts a dated, empty Git commit to `main` as a fallback for projects already using Cloudflare's GitHub integration.
5. **Checks the live production site** via `scripts/verify-live-seo-publication.mjs`. The target article must return HTTP 200 with its canonical URL and publication metadata, and the XML sitemap must include its exact URL.
6. The production verification retries for approximately six minutes to allow Cloudflare build and propagation. If the site or sitemap is not updated, the GitHub workflow **fails** with a deployment warning instead of claiming that publication succeeded.

Days outside the catalog do not cause empty commits or unnecessary builds. Each day's empty-commit trigger is idempotent for manual reruns. GitHub Actions scheduled jobs can be delayed or occasionally skipped; they do not guarantee an exact publication minute.

## Cloudflare setup and first verification

For the most reliable deployment, create a **Cloudflare Pages production Deploy Hook** in the Cloudflare project for ConvertAnyFile and save its full URL in the GitHub repository's Actions secret named `CLOUDFLARE_DEPLOY_HOOK`.

The fallback without a hook can work if GitHub Actions is permitted to push to `main` and Cloudflare's Git integration creates builds from those pushes. It is **not guaranteed**: organization policies, GitHub branch rules or Cloudflare Git integration may prevent it. Production verification detects many such failures.

After merging the revised workflow:

1. Open **GitHub → Actions → Publish scheduled SEO guides** and look for the bootstrap run triggered by the workflow file change. If necessary, select **Run workflow** manually.
2. Check the job logs: a successful *build* and a successful *Cloudflare trigger* are not enough; the final **Confirm guide and XML sitemap are live** step must pass.
3. Open Cloudflare Pages and confirm a new production deployment completed successfully.
4. Check today's published guide at `https://convertanyfile.net/guides/tool/<slug>/` and verify that tomorrow's guide is not already public.
5. In Search Console, examine index coverage, chosen canonicals and impressions. Successful publication does **not** guarantee indexing.

The live verification checks HTTP and sitemap responses. It does not replace Cloudflare deployment logs, Google Search Console, manual content review, or Core Web Vitals measurement.

## SEO content inventory

`docs/tool-guide-coverage.csv` tracks 161 tool URLs: 19 with independent guides, 90 scheduled guides, and 52 without independent guides (including 10 new format converter pages with their own on-page examples and FAQ).

The editorial checker rejects duplicate substantial paragraphs and generic descriptions in the scheduled queue. Keep every article's slug, date, image, alt text and caption stable unless explicitly updating the publishing plan.

The Gemini AI Logo Remover engine is retained in source and stays hidden from public navigation, promotional copy and sitemap until explicitly requested.
