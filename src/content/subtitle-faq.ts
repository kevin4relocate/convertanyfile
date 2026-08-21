export const SUBTITLE_FAQ = [
  {
    question: 'Which subtitle formats can I add?',
    answer: 'The Preview accepts SRT, VTT/WebVTT, ASS, SSA, and SBV. Before a file becomes Ready, the complete subtitle is parsed in a local worker so malformed later cues are caught during admission rather than after conversion starts.',
  },
  {
    question: 'Which subtitle formats can I export?',
    answer: 'Certified Preview outputs are SRT, VTT, SBV, and plain TXT. The public catalog exposes 17 useful cross-format routes. ASS and SSA remain input-only because their richer styling, positioning, karaoke, and effect model cannot be recreated faithfully by the simpler outputs.',
  },
  {
    question: 'What does the preflight analysis show?',
    answer: 'Accepted files report cue count, timeline end, detected text encoding, and a flag when richer formatting or WebVTT metadata is present. This is calculated locally from the full file before it enters the ready queue.',
  },
  {
    question: 'Can I shift subtitle timing precisely?',
    answer: 'Yes. Timing shift accepts an exact millisecond offset from -600000 to +600000 ms, so values such as +1350 or -780 work across the whole batch. If a negative shift would move any cue before 00:00, conversion fails instead of silently clipping the timestamp.',
  },
  {
    question: 'Can I remove subtitle formatting?',
    answer: 'For SRT, VTT, and SBV output you can enable Plain text only to remove inline formatting from cue text. TXT output is always plain readable text and removes subtitle markup automatically.',
  },
  {
    question: 'What TXT transcript options are available?',
    answer: 'TXT can export dialogue with no timestamps, each cue start time, or complete start-to-end ranges. Cue spacing can use a blank line or a single line break, and LF/CRLF plus optional UTF-8 BOM are available for downstream compatibility.',
  },
  {
    question: 'Are my subtitle files uploaded?',
    answer: 'No. Preflight analysis, parsing, timing transforms, text cleanup, and serialization run inside a browser worker. The selected subtitle is not sent to a ConvertAnyFile conversion server.',
  },
  {
    question: 'What happens to ASS or SSA styling?',
    answer: 'Dialogue start time, end time, and readable text are carried into the target. ASS/SSA override tags, named styles, fonts, colors, positioning, karaoke instructions, drawing commands, and effects are intentionally not preserved in SRT, VTT, SBV, or TXT output.',
  },
  {
    question: 'What happens to WebVTT metadata?',
    answer: 'SRT, SBV, and TXT cannot represent WebVTT STYLE, REGION, NOTE, X-TIMESTAMP-MAP, cue positioning, or other VTT-only metadata. A no-transform VTT-to-VTT export preserves the original validated WebVTT body by default; applying timing or text transforms rebuilds cues and cannot guarantee document-level metadata preservation.',
  },
  {
    question: 'Which text encodings are supported?',
    answer: 'UTF-8 is preferred. UTF-8, UTF-16LE, and UTF-16BE BOMs are recognized. Files without a BOM are decoded as strict UTF-8 first, with Windows-1252 as a compatibility fallback. The detected encoding is shown in queue metadata; generated text output is UTF-8.',
  },
  {
    question: 'Why does the Subtitle converter have file-size limits?',
    answer: 'Subtitle conversion is lightweight, but complete preflight parsing and unexpectedly large timed-text files can still consume browser memory and CPU. Preview limits are 50 files, 5 MB per file, 50 MB total input, and a 100,000-cue parser guard.',
  },
] as const;
