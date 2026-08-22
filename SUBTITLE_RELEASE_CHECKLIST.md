# Subtitle Premium Preview Release Checklist

Use this checklist before promoting Subtitle from Preview to production. Re-run it whenever parser rules, public formats, preflight metadata, timing transforms, generic output controls, safety limits, or homepage routing change.

## Product contract

- [ ] Subtitle remains a deterministic timed-text converter, not OCR, speech-to-text, translation, auto-sync, frame-rate retiming, or video muxing.
- [ ] Public inputs are SRT, VTT/WebVTT, ASS, SSA, and SBV.
- [ ] Public outputs are SRT, VTT, SBV, and TXT.
- [ ] ASS and SSA remain input-only until a writer with an explicit style/fidelity contract exists.
- [ ] Same-format SEO routes are not published merely to increase route count.
- [ ] Every published pair route is backed by a real conversion path.

## Full-file preflight

- [ ] Admission parses the complete subtitle in the Subtitle worker rather than trusting an extension or partial sample.
- [ ] A file with a valid first cue and malformed later cue is rejected before Ready.
- [ ] Ambiguous SRT containing multiple timestamp lines inside one cue block is rejected.
- [ ] Queue metadata shows cue count.
- [ ] Queue metadata shows timeline end.
- [ ] Queue metadata shows detected text encoding.
- [ ] Queue metadata flags WebVTT document/cue metadata where detected.
- [ ] Queue metadata flags richer formatted sources such as ASS/SSA.
- [ ] Preflight worker timeout/crash follows recoverable engine semantics instead of being mislabeled as a corrupt file.

## Parsing and fidelity

- [ ] SRT numbered cues and millisecond timestamps parse deterministically.
- [ ] VTT requires a WEBVTT header and parses cue identifiers/settings without treating NOTE, STYLE, REGION, or X-TIMESTAMP-MAP metadata as dialogue.
- [ ] No-transform VTT → VTT validates the file but preserves the original decoded document body so STYLE, REGION, NOTE, X-TIMESTAMP-MAP, cue IDs, and cue settings are not discarded by normalization alone.
- [ ] VTT transforms explicitly document that rebuilding from cues cannot guarantee document-level metadata preservation.
- [ ] ASS/SSA Event Format mapping finds Start, End, and Text fields and keeps commas inside Dialogue text.
- [ ] ASS/SSA override tags, positioning, karaoke, styles, drawing commands, and effects are not falsely claimed as preserved in simpler outputs.
- [ ] ASS `\\N` / `\\n` line breaks become actual cue line breaks.
- [ ] SBV timestamp pairs parse and serialize deterministically.
- [ ] Overlapping cues remain in source order; cues are not silently merged or sorted.
- [ ] A cue whose end precedes its start is rejected.
- [ ] Files with no valid cues are rejected.
- [ ] Parser stops above the 100,000-cue safety guard.

## Premium transforms and generic numeric control

- [ ] Shared `number` output-control rendering does not alter existing range/select/checkbox behavior.
- [ ] Timing shift renders as a numeric input with `ms` suffix.
- [ ] Timing shift accepts exact values from `-600000` to `+600000` milliseconds.
- [ ] Non-round values such as `+1350` and `-780` are applied exactly.
- [ ] Out-of-range timing shifts fail clearly and do not expose Retry.
- [ ] A negative shift that would move any cue before `00:00` fails instead of silently clipping timestamps.
- [ ] Plain text only is opt-in for timed SRT/VTT/SBV outputs.
- [ ] Plain text cleanup removes inline tags and ASS-style override commands without reordering cues.
- [ ] Voice labels such as WebVTT `<v Speaker>` remain readable in plain-text output.
- [ ] TXT always emits readable plain text.
- [ ] TXT timestamp mode supports none, start time, and start → end range.
- [ ] TXT cue spacing supports blank-line and single-line modes.

## Encoding and output bytes

- [ ] UTF-8 input works with and without BOM.
- [ ] UTF-16LE BOM input works.
- [ ] UTF-16BE BOM input works.
- [ ] Windows-1252 fallback is used only after strict UTF-8 decoding fails.
- [ ] Detected encoding is visible in preflight metadata.
- [ ] Generated text output is UTF-8.
- [ ] LF / CRLF control changes output line endings.
- [ ] UTF-8 BOM output control changes the downloaded bytes.
- [ ] Numeric and common named entities are decoded safely in plain-text/TXT output.

## Worker and failure semantics

- [ ] Worker readiness handshake reaches `Private converter ready`.
- [ ] Preflight analysis, parser, transforms, and serializer work are performed in the Subtitle worker rather than the main UI thread.
- [ ] Worker crash, message corruption, analysis timeout, or conversion timeout is recoverable and can expose Retry where appropriate.
- [ ] Deterministic malformed timed-text structure is permanent and does not expose Retry.
- [ ] Unsupported formats are permanent unsupported-input failures.
- [ ] Invalid timing-shift results are permanent for that setting and do not enter a retry loop.
- [ ] Cancel/reset invalidates stale in-flight results.

## Batch safety

- [ ] Maximum 50 files.
- [ ] Maximum 5 MB per source file.
- [ ] Maximum 50 MB total source batch.
- [ ] Full-file preflight does not allow invalid files to consume valid batch capacity.
- [ ] Batch conversion remains sequential and successful files survive another file failing.
- [ ] Successful multi-file results can be downloaded as a ZIP.

## Homepage and premium UX

- [ ] Homepage shows Subtitle as Preview rather than Live.
- [ ] Subtitle tab accepts SRT, VTT/WebVTT, ASS, SSA, and SBV.
- [ ] Homogeneous subtitle drops auto-route to Subtitle.
- [ ] Mixed-category drops remain on the selected tab and only files supported by that category are admitted.
- [ ] Main page label is `Subtitle Converter`, not generic `File Converter`.
- [ ] Main dropzone visibly lists supported subtitle input families.
- [ ] Queue metadata remains readable with long filenames on desktop and mobile.
- [ ] Numeric timing input, formatting cleanup, transcript mode, cue spacing, LF/CRLF, and BOM wrap without horizontal scrolling.
- [ ] Numeric timing input has a visible `ms` unit and keyboard-accessible label.
- [ ] ASS/SSA fidelity warning and WebVTT metadata caveat are visible in relevant content.
- [ ] Subtitle premium styling does not alter Image, Data, or Archive converter appearance.

## SEO and real routes

- [ ] `/subtitle-converter/` builds as a real converter page.
- [ ] SRT routes: `/srt-to-vtt/`, `/srt-to-sbv/`, `/srt-to-txt/`.
- [ ] VTT routes: `/vtt-to-srt/`, `/vtt-to-sbv/`, `/vtt-to-txt/`.
- [ ] ASS routes: `/ass-to-srt/`, `/ass-to-vtt/`, `/ass-to-sbv/`, `/ass-to-txt/`.
- [ ] SSA routes: `/ssa-to-srt/`, `/ssa-to-vtt/`, `/ssa-to-sbv/`, `/ssa-to-txt/`.
- [ ] SBV routes: `/sbv-to-srt/`, `/sbv-to-vtt/`, `/sbv-to-txt/`.
- [ ] Total public cross-format pair routes are 17; no placeholder/same-format routes are added for route count alone.
- [ ] Subtitle pair pages use Subtitle-specific explanatory content and FAQ, never Image copy.
- [ ] Subtitle pages appear in the generated sitemap and retain production canonical URLs.

## Regression coverage before Live

- [ ] Full worker preflight metadata regression.
- [ ] SRT → VTT baseline conversion.
- [ ] Exact +1350 ms shift + plain-text cleanup regression.
- [ ] Negative timing-shift zero-boundary regression.
- [ ] Out-of-range timing-shift regression.
- [ ] VTT metadata detection and VTT → SRT compatibility regression.
- [ ] No-transform VTT → VTT metadata-preservation regression.
- [ ] ASS → SRT rich-format regression.
- [ ] SSA pair-route real conversion regression.
- [ ] SBV timing regression.
- [ ] TXT range timestamps + cue spacing + CRLF + BOM regression.
- [ ] Windows-1252 detection/export regression.
- [ ] Late malformed cue preflight rejection regression.
- [ ] Ambiguous multi-timestamp SRT rejection regression.
- [ ] 17-route inventory regression.
- [ ] Homepage auto-route and mixed-category regressions.

## Browser matrix before Live

- [ ] Chromium desktop.
- [ ] Chromium mobile viewport.
- [ ] Firefox desktop.
- [ ] WebKit desktop.
- [ ] Mobile Safari or equivalent WebKit device test with real subtitle files.
