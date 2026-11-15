# Cloudflare Pages deployment recovery

## Evidence and status

- The GitHub CI for release 0445c992ef449021610ff4b5238cfc6036b96bca passed on 2026-11-15.
- The follow-up live Production Smoke failed after 24 requests to https://convertanyfile.net/build-info.json all returned HTTP 404.
- This does **not** prove the custom domain is broken, nor that the GitHub build failed. It shows that the required build fingerprint was not being served on the production domain.
- The GitHub CI now checks that dist/build-info.json exists and contains the expected build commit SHA. This distinguishes a missing build artifact from a missing production deployment.

## First choice: repair the native Cloudflare Pages Git integration

1. Open Cloudflare Dashboard > Workers & Pages > your existing Pages project > Deployments.
2. Check whether the latest **Production** deployment lists the repository kevin4relocate/convertanyfile, branch main and intended commit SHA.
3. If the latest deploy failed, open View details > Build log and fix the specific error.
4. If no deployment was started, open Settings > Builds > Branch control: make sure production branch is main and automatic production deployments are enabled. Check Settings > Builds > Git Repository if the integration became disconnected.
5. Set build command to npm run build, build output directory to dist and build root to repository root. Cloudflare Pages injects CF_PAGES_COMMIT_SHA automatically into Git-connected builds.
6. Redeploy a main commit. Then visit https://convertanyfile.net/build-info.json, which should return a JSON object with revision matching the deployed SHA.
7. Rerun GitHub > Actions > Production Smoke and confirm all tests pass.

Cloudflare documentation:
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/debugging-pages/

## Optional manual GitHub deployment (only if native Git deployment cannot be restored)

The manual-only workflow lives at .github/workflows/cloudflare-manual-recovery.yml. It is **not** triggered on pushes. It will not send a deployment until someone deliberately enters the existing Pages project name, selects deploy-production, and runs it on the main branch.

Before using:

1. In Cloudflare, verify the existing Pages project name (not convertanyfile.net unless that is literally the project name), Cloudflare account ID, and issue an API token with Cloudflare Pages edit access restricted to the intended account/project as available.
2. In this GitHub repository, Settings > Secrets and variables > Actions > Secrets, add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN. Never commit tokens to repository files.
3. If a public support email is configured in Cloudflare Pages, also configure the same PUBLIC_SUPPORT_EMAIL as a GitHub Actions **variable** so the separate GitHub build does not lose it.
4. In GitHub Actions, select Deploy Cloudflare Pages (manual recovery) and choose the main branch. Enter the verified Pages project name. Explicitly select deploy-production.
5. The workflow validates credentials, rebuilds the project, checks dist/build-info.json, runs Wrangler Pages Deploy for main, waits for the exact commit at the public domain, and finally runs live conversion smoke tests. Failed checks produce a failed job rather than a misleading green deploy indicator.

Important: Prefer **one** production deployment mechanism. The manual workflow is a fallback for a broken or paused Git integration, not an invitation to have two systems racing to publish different builds. Review Cloudflare's Pages Git integration restrictions before deciding to use Wrangler.

Cloudflare manual upload documentation:
- https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- https://developers.cloudflare.com/workers/wrangler/commands/pages/

## Not covered by the deployment fix

Passing production smoke would still not prove that Google Search Console indexed the site, that PageSpeed scores pass, or that the AdSense team will approve. No publisher ID, ads.txt placeholder, or ads have been activated.
