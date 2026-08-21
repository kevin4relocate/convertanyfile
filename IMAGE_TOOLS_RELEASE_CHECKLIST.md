# Image Tools / Remove Watermark Preview Release Checklist

Keep this checklist independent from converter-category release checklists. Remove Watermark must be releasable after other converter previews without forcing them into the same branch or deployment decision.

## Branch isolation

- [ ] Feature branch is based on the intended production `main`, not on another preview branch.
- [ ] Converter EngineAdapter registry and `converter-app.ts` are unchanged by Image Tools.
- [ ] Existing Image/Data/Archive homepage converter tabs behave exactly as before.
- [ ] If another preview is merged first, rebase this branch onto the new `main` and re-run every gate before release.

## Product contract

- [ ] `/image-tools/` is the Image Tools category landing page.
- [ ] `/remove-watermark/` is a real working tool page, not a placeholder.
- [ ] Planned Resize/Compress/Crop/Rotate/Blur/Remove Object/Remove Background items do not create fake public routes.
- [ ] The tool edits visible selected pixels only and does not claim to remove invisible provenance or authenticity systems.
- [ ] The product does not claim AI detection or remote AI inference.

## Input and browser safety

- [ ] JPG/JPEG input works.
- [ ] PNG input works, including alpha.
- [ ] WebP input works in browsers that can decode it.
- [ ] 40 MB file limit is enforced before decode.
- [ ] 20 megapixel and 12,000-pixel-side decoded guards are enforced.
- [ ] Unsupported file types fail before entering the editor.
- [ ] Original source file remains unchanged.

## Auto Select and mask editing

- [ ] Auto Select produces a visible bottom-right suggestion on a small corner mark.
- [ ] Low-confidence Auto Select is described as a suggestion, not a guaranteed detection.
- [ ] Rectangle creates a new mask region with mouse and touch/pointer input.
- [ ] Brush adds to the mask.
- [ ] Eraser subtracts from the mask.
- [ ] Undo removes the latest mask operation.
- [ ] Reset mask clears mask state without unloading the source image.
- [ ] Editing the mask invalidates a stale After result.
- [ ] Mask larger than the local-repair safety threshold fails clearly.

## Local repair

- [ ] Full-resolution pixels, not only preview pixels, are sent to the local worker.
- [ ] Repair runs off the UI thread.
- [ ] Worker timeout/crash produces a visible error and does not publish a stale result.
- [ ] New image/reset invalidates in-flight work.
- [ ] Repaired output keeps decoded source pixel dimensions.
- [ ] Complex backgrounds are described honestly; the UI does not promise semantic reconstruction.

## Preview and export

- [ ] Before canvas remains unchanged.
- [ ] Purple selection mask is clearly visible but does not alter source pixels.
- [ ] After preview is shown only after a successful repair.
- [ ] Same-as-source export works for PNG/JPEG/WebP source families when the browser encoder supports it.
- [ ] PNG export works.
- [ ] JPEG export flattens transparency to deterministic white and respects quality.
- [ ] WebP export either produces real `image/webp` or fails with a clear fallback message.
- [ ] Download filename ends in `-watermark-removed.<ext>`.

## Privacy and trust

- [ ] Tool page states that source pixels are processed locally.
- [ ] Privacy page includes Image Tools local processing.
- [ ] Terms explain destructive editing and re-encoding limitations.
- [ ] Page does not imply affiliation with Google or Gemini.
- [ ] User is reminded to keep important originals and only edit images they have the right to modify.

## SEO and content

- [ ] Unique title, description, H1, canonical, and WebApplication schema are present.
- [ ] Tool remains above the main explanatory content.
- [ ] How It Works is substantive.
- [ ] Resolution/quality behavior is substantive.
- [ ] FAQ is substantive and responsive.
- [ ] Related Image Tools section contains no links to unimplemented routes.
- [ ] `/image-tools/` and `/remove-watermark/` appear in the generated sitemap only when this branch is intended for release.

## Responsive/browser matrix

- [ ] Chromium desktop.
- [ ] Chromium mobile.
- [ ] Firefox desktop.
- [ ] WebKit desktop.
- [ ] Real mobile Safari touch test before Live.
- [ ] No horizontal overflow at 390–430 px widths.
- [ ] Toolbar remains usable with touch input.
- [ ] Before/After panels stack cleanly on mobile.

## Existing-product regression

- [ ] Homepage Images/Data/Archives switching still works.
- [ ] Homogeneous converter drops still auto-route.
- [ ] Mixed converter drops still respect the selected category.
- [ ] Existing converter queues remain independent.
- [ ] Dark theme/FAQ regressions remain green.
- [ ] Image Converter conversion matrix remains green.
- [ ] Data and Archive regression suites remain green.
