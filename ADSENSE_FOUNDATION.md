# Google AdSense Foundation — operations guide

This branch prepares ConvertAnyFile.net for a future AdSense application. **It does not activate ads, provision a Google AdSense account, or install a certified advertising CMP.**

## Available now

- `/contact/`: feedback and troubleshooting instructions. Configure `PUBLIC_SUPPORT_EMAIL` as a publicly acceptable support email in the Cloudflare Pages build environment if desired. If unset, the page directs visitors to the public maintainer GitHub profile.
- The footer provides a permanent **Privacy choices** entry point.
- Analytics consent: the site does not load GA4 without affirmative opt-in. Consent selection is persisted per browser using `convertanyfile-analytics-consent-v1`. The platform never treats analytics consent as ad consent. On production, Google's four Consent Mode v2 signals default to denied; only `analytics_storage` can be granted from this banner.
- `public/_headers` includes common AdSense script/frame/image/connect origins, but verify again in a browser after receiving real ad markup. Do not loosen `default-src`, `object-src`, `frame-ancestors` or converter-worker protections broadly.

## Still required before an AdSense application

1. Create a Google AdSense publisher account and add `convertanyfile.net` in the Sites section.
2. Review and complete publisher legal/contact information and support address, including the visible Contact page.
3. Obtain your real `ca-pub-...` identifier. Add the official site verification snippet to the shared layout (restricted to production), then check site verification and request review.
4. Once Google provides the `pub-...` ID, publish `/ads.txt` with the official format, for example: `google.com, pub-REPLACE_WITH_REAL_ID, DIRECT, f08c47fec0942fa0`. **Never deploy a placeholder.**
5. Before actually serving personalized ads in the EEA, UK or Switzerland, implement Google's supported certified CMP and a valid IAB TCF integration. This simple analytics consent panel is **not** a certified CMP and does not collect advertising consent.
6. Update `/privacy/` with actual advertiser/cookie/vendor disclosures at or before ad launch. Confirm ad delivery domains by observing CSP violations in browser devtools and add only the required origins.
7. Confirm sitemap/indexability in Search Console and run production smoke and full conversion flow tests after deployment.

## Test and release commands

```bash
npm ci
npm run build
npm run test:text-tools
npm run test:e2e -- --project=chromium-desktop
npm run test:production
```

The production smoke suite deliberately aborts outgoing Google tag requests to prevent synthetic analytics traffic. It still tests DOM-level bootstrapping and CSP. Because actual ad delivery is disabled, live AdSense behavior cannot be verified in this phase.

## Privacy implementation notes

- Consent defaults to denied. The tag is injected only for the two production hosts and only after a saved or new opt-in.
- A previous opt-in can be revoked from the footer; if the GA tag was already loaded, the page reloads to end the current measurement execution. Previously transmitted analytics events cannot be withdrawn by revoking consent.
- Browser extensions or disabled storage may affect persistence. Hosting/CDN security logging remains separate from Google Analytics.
