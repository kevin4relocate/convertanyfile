# Phase 3 — Production / AdSense Readiness Audit

This audit is based on deployed evidence, not an assumption that a merged GitHub commit is live on Cloudflare.

## Automatic checks

### At build time
- Astro type check, production build, current SEO checks and Cloudflare security asset audit.
- A new internal navigation check scans all generated HTML and resolves each local link against built HTML or static assets; missing links fail the build.
- A static /build-info.json response exposes only site, revision and builtAt. On Cloudflare Pages, revision is from CF_PAGES_COMMIT_SHA; on GitHub Actions it is from GITHUB_SHA.

### After CI on main
- Production Smoke starts only after successful main-branch CI.
- It now waits up to four minutes for /build-info.json to match the exact commit validated by CI. If production is still old, the workflow fails explicitly rather than testing stale code.
- The production suite checks HTTP responses, canonical URLs, robots, sitemap, security headers, Phase 2 content, narrow mobile layout, privacy settings, real Text/Data operations and CSV/image download workflows.

## Required manual confirmations

1. Confirm Cloudflare Pages deploys branch main and publishes dist/.
2. Check /build-info.json on the live domain: its revision should be a 40-character commit hash that matches the intended deployment. If the value is unknown, verify CF_PAGES_COMMIT_SHA is available at Cloudflare build time.
3. Provide a public support channel. Astro accepts PUBLIC_SUPPORT_EMAIL as a Cloudflare Pages build-time variable; when absent, the Contact page uses the public maintainer profile.
4. Inspect Google Search Console: verify site ownership, submit https://convertanyfile.net/sitemap-index.xml, inspect exclusions / indexing / rendering issues and prioritize actual errors rather than forcing indexing of thin pages.
5. Check Core Web Vitals and PageSpeed Insights for important pages. An automated smoke test does not imply a passing performance score.
6. Add AdSense verification code and an ads.txt declaration only after obtaining the authentic publisher ID. No ad service is enabled in this phase.
7. An Analytics choice dialog is not a certified advertising Consent Management Platform (CMP). Implement an approved CMP and appropriate disclosures before serving ads in regions where required.

## Workflow

On PRs: pass build and Playwright tests before merge. On main: pass CI, wait for Cloudflare to serve the same commit, then run production smoke. A manual test may be launched via GitHub Actions > Production Smoke > Run workflow; manual runs skip the commit-identity gate but still check production functionality. Never mark production as verified based on skipped checks or on an older release.
