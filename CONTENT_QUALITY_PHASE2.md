# Content Quality & SEO — AdSense preparation, Phase 2

## Principle

ConvertAnyFile is a utility site. The most useful page is a functioning tool with truthful instructions and clear limitations. Publishing hundreds of similar keyword pages is not a substitute for user value.

Google's people-first guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
Google's spam policy on scaled content: https://developers.google.com/search/docs/essentials/spam-policies

## Shipped in this change

1. Remove the duplicate \`PAIR_CONTENT.when\` paragraph from image conversion pages. The short quick answer remains; the why section retains the actual why.
2. Add six curated, scenario-specific guidance blocks for important image conversions: HEIC→JPG, JPG→WebP, PNG→JPG, WebP→JPG, JPG→PNG, PNG→WebP. No synthetic speed/size benchmarks.
3. Add tailored worked examples for all 14 live Text Tools and all 15 live Data Processing Tools. Each explains a user problem, concrete input, expected behavior, real limitation and relevant next tool.
4. Keep tools and routes unchanged. The editorial additions render server-side as ordinary crawlable HTML rather than requiring a JavaScript hydration.
5. Add regression tests verifying canonical metadata, content coverage, unique examples, internal links, example output copy and an unchanged functioning editor.
6. Change the image conversion preflight anchor from \`#faq\` to \`#preflight\` so the in-page table of contents does not misleadingly label a preparation checklist as the FAQ.

## Manual review checklist

- Run \`npm ci && npm run build && npm run test:e2e -- --project=chromium-desktop\`.
- Verify readable code examples on a narrow mobile viewport, including text wrapping.
- Inspect each example against the actual tool operation when backend logic changes.
- Validate links and avoid adding SEO-only pages without unique user intent or functioning tools.
- Keep Google Search Console and AdSense review findings separate: these changes cannot guarantee acceptance or indexing.

## Next content improvements (based on evidence, not mass page generation)

- Consult Search Console for which routes get impressions, crawl issues, and search intent mismatch before adding further guides.
- Add measured example output sizes **only** when the exact input fixture and codec/settings are documented and repeatable.
- Collect real bug reports and transform recurring troubleshooting scenarios into clear, verified examples.
- Audit the remaining archive/subtitle converter pages for factual accuracy, not word-count targets.
