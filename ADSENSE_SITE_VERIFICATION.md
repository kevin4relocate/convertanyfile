# Google AdSense site verification (approval pending)

## Publisher identity and files

- The publisher supplied the site-verification JavaScript for ca-pub-4046271575630296.
- The AdSense script appears inside the shared HTML head on all generated static pages.
- A matching google-adsense-account meta tag provides a second supported ownership verification method.
- The ads.txt file contains: google.com, pub-4046271575630296, DIRECT, f08c47fec0942fa0.
- AdSense JavaScript is currently loaded only for ownership verification. There are no ad slots. The pauseAdRequests value is set to 1 before the script and is never cleared.
- Google Consent Mode v2 advertising signals remain denied by default. The analytics opt-in grants analytics_storage only.
- The Privacy Policy discloses the third-party AdSense verification request.

## Remaining steps in the AdSense UI (account owner)

1. In the existing AdSense account, open Sites > New site and add convertanyfile.net if not already listed.
2. Select a site ownership method as offered by the AdSense UI. Once Cloudflare deploys the exact commit, verify connection and choose Request review.
3. Complete any required account, payment or identity verification.
4. Check Sites for the ads.txt status; Google may need days to crawl the published line.
5. A passing GitHub Production Smoke confirms code is accessible. It does not constitute Google AdSense approval.

## Before serving advertisements

- Implement a Google-certified CMP with IAB TCF support where required for EEA, UK and Switzerland visitors.
- Confirm notices about data collection, cookies, partners and vendor settings meet applicable rules and update the Privacy Policy when ad serving begins.
- Keep AdSense Auto Ads disabled during verification. This implementation pauses all ad requests; a later, deliberate change will be needed to enable them.
- Do not clear the pause until site approval and proper consent management are in place.

## Build guard

The npm run check:adsense command checks all static HTML, publisher meta tags, script identity, request pause, denied-by-default Consent Mode signals and ads.txt.

Google references:
- https://support.google.com/adsense/answer/12131223
- https://support.google.com/adsense/answer/12169212
- https://support.google.com/adsense/answer/13554116
- https://support.google.com/adsense/answer/9042142
