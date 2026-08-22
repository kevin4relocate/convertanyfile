# Image Tools Watermark Editors — Release Candidate Checklist

This checklist covers the shared batch mask editor used by Remove Watermark and Gemini AI Logo Remover.

## Architecture
- [ ] Both pages mount `BatchMaskEditorShell.astro` and `src/image-tools/shared/batch-mask-editor.ts`.
- [ ] No obsolete separate Gemini or Remove Watermark editor remains.
- [ ] Converter EngineAdapters remain independent from Image Tools.
- [ ] Rebase or retarget onto the intended production `main` before release and review the final diff again.

## Product modes
- [ ] Remove Watermark exposes exactly Rectangle, Circle, Square, Diamond, 4-Point Star, and Text.
- [ ] Remove Watermark has no legacy Auto Select, Brush, or Eraser controls.
- [ ] Text creates a solid bold text-shaped mask, auto-sizes to typed content, and is described as manual rather than OCR.
- [ ] A one-character Text mask remains compact enough to move close to every image edge.
- [ ] Diamond and 4-Point Star rasterize as real shapes rather than their bounding rectangles.
- [ ] Gemini exposes exactly Circle and 4-Point Star.
- [ ] Gemini defaults to 4-Point Star and exposes no Rectangle, Square, Diamond, Text, Brush, Eraser, or logo Auto Select.

## Batch behavior
- [ ] Maximum 50 images, 10 MB per image, and 200 MB total source input.
- [ ] 20 MP and 12,000-pixel-side decoded guards remain active.
- [ ] Same-ratio batches automatically start with One mask for all.
- [ ] Mixed-ratio batches remain accepted and automatically start with Edit individually.
- [ ] Automatic mode is a recommendation; manual toggle choice persists.
- [ ] Manual shared mode on mixed layouts is allowed and shows a compatibility warning.
- [ ] Shared masks copy into individual mode; queue states distinguish Shared copy, Custom, and Needs mask.
- [ ] Rotation is preserved when a shared mask becomes per-image copies.
- [ ] The entire queue card selects an image; the × control only removes it.

## Mask interaction
- [ ] New masks are selected and show four square resize handles plus one round rotation handle.
- [ ] Dragging inside moves the selected mask.
- [ ] Corner handles resize masks while keeping them usable inside the image.
- [ ] The round handle rotates shape and Text masks and records the edit in Undo history.
- [ ] Rotation-aware hit testing still lets a rotated mask be selected and moved.
- [ ] The rotation handle flips to the opposite side when the preferred side would sit outside the canvas.
- [ ] Circle, Square, Diamond, and 4-Point Star preserve square bounds during resize.
- [ ] Undo and Clear mask work in shared and individual contexts.
- [ ] Text-mask edits participate in Undo and per-image state.
- [ ] Mask edits invalidate stale results.
- [ ] Worker rasterization matches visible rotation for rectangle, ellipse, diamond, star, and text operations.
- [ ] Repair rejects masks above the 15% local safety threshold.

## Processing and output
- [ ] Full-resolution decoded pixels are processed in the local worker.
- [ ] Text repair rasterizes solid bold glyph pixels rather than only a thin outline.
- [ ] Batch processing is sequential and can be cancelled.
- [ ] Cancel preserves successful results already completed.
- [ ] Clicking a completed queue card restores its After preview.
- [ ] Same as source / PNG / JPG / WebP output controls work.
- [ ] PNG disables quality; JPEG/WebP use the quality value.
- [ ] One successful result downloads directly; multiple results download as a browser-generated ZIP.
- [ ] General outputs use `-watermark-removed`; Gemini outputs use `-gemini-logo-removed`.

## UX and responsive behavior
- [ ] Shared editor inherits the same site/system font stack as converters.
- [ ] Batch queue remains a compact horizontal filmstrip.
- [ ] Routine successful uploads do not show redundant added-count notices.
- [ ] Edit-mode toggle does not add a layout-shifting Auto badge.
- [ ] Text-mask helper aligns vertically with the text field on desktop and stacks cleanly on mobile.
- [ ] Before/After, output controls, queue, mask handles, and Cancel remain usable at 390–430px widths.
- [ ] Mobile page has no horizontal overflow.

## Navigation and content
- [ ] Header Image Tools submenu links All Image Tools, Remove Watermark, and Gemini AI Logo Remover.
- [ ] Header copy distinguishes general batch/shapes/text from focused Circle/4-Point-Star editing.
- [ ] Footer links both tools and all three image-editing guides.
- [ ] Homepage and `/image-tools/` accurately describe six general modes versus two Gemini modes.
- [ ] Remove Watermark title, description, H1, schema, FAQ, and body match the shared batch product including rotation and solid Text masks.
- [ ] Gemini title, description, H1, schema, FAQ, and body mention only Circle and 4-Point Star while documenting rotation.
- [ ] General watermark, text-mask, and Gemini guides match current move/resize/rotate behavior.
- [ ] Text guide clearly says the text field is not OCR or automatic detection.
- [ ] Gemini pages include visible non-affiliation copy.
- [ ] Privacy and Terms cover local Image Tools processing and destructive edits.

## Regression and final validation
- [ ] Remove Watermark tests cover six modes, shared/mixed auto mode, solid Text mask, one-character corner placement, rotation, ZIP, full-card selection, and mobile layout.
- [ ] Gemini tests cover exactly two modes, star default, rotation, shared/mixed auto mode, overrides, ZIP, After restore, and mobile layout.
- [ ] Existing Image/Data/Archive converter suites remain unaffected.
- [ ] Cloudflare Preview builds from the final squashed commit.
- [ ] Chromium desktop and mobile smoke tests complete.
- [ ] Safari/WebKit manually validates upload, mask move/resize/rotate, processing, output, ZIP, and Text-mode behavior.
- [ ] A 20–50 image manual batch validates cancellation and browser memory behavior.
- [ ] GitHub Actions counts as QA only when jobs contain real steps; empty-step runner failures do not count as executed tests.
