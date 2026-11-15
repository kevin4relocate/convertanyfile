# Google AdSense site verification — waiting for approval

## Publisher identity

The site owner supplied an AdSense JavaScript code snippet containing publisher ID ca-pub-4046271575630296. The website uses this verified ID in **two Google-supported non-executable ownership verification methods**:

1. Every HTML page contains a Google AdSense account meta tag with ID ca-pub-4046271575630296.
2. The public ads.txt contains: google.com, pub-4046271575630296, DIRECT, f08c47fec0942fa0

**The ad JavaScript snippet supplied by the owner is intentionally not executed yet.** A pre-approval test showed the script generated network requests and some browsers exhibited unrelated tool-test failures. Google allows verification through either an account meta tag or ads.txt, avoiding third-party requests before ad approval.

No ad slots, Auto Ads, or AdSense JavaScript are enabled. The existing Google Analytics opt-in remains separate.

## Required AdSense UI actions

1. Sign in to the existing AdSense account.
2. Go to Sites and add convertanyfile.net if it is not already listed.
3. In the site's Connect/Verify screen, **select the meta tag or ads.txt ownership verification option**. Do not select "AdSense code snippet" unless you actually intend to enable the executable ad script in a future deployment.
4. After Cloudflare deploys this repository change, open https://convertanyfile.net/ads.txt and view page source on https://convertanyfile.net/ to confirm publisher metadata is served.
5. Click Verify / Next / Request review as offered by the AdSense interface. Complete any payment and identity requirements.
6. A site may show status Requires review, Getting ready, Needs attention or Ready. No ads may be served before the site is approved and Ready.

Google's review often takes a few days, but can take 2–4 weeks. ads.txt status may not update immediately after Google crawls it.

## When the site is approved

Ad serving is a **separate future change**:
- Configure a Google-certified CMP with the appropriate IAB TCF integration where required, including EEA, UK and Switzerland audiences.
- Update Privacy Policy to disclose actual advertising data practices and partners.
- Review Google Auto Ads settings and placements, CLS and performance before activation.
- Only then add the real AdSense JavaScript and any ad units, respecting consent choices.

## Build guard

The check:adsense build command verifies publisher metadata on every generated HTML page, real ads.txt identity, denied-by-default ad consent signals and the absence of executable advertising JavaScript and ad slots.

Official references:
- https://support.google.com/adsense/answer/12131223
- https://support.google.com/adsense/answer/12169212
- https://support.google.com/adsense/answer/12171612
- https://support.google.com/adsense/answer/13554116
