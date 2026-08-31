export interface GuideIndexLink {
  href: string;
  title: string;
  text: string;
}

export const STATIC_GUIDES: readonly GuideIndexLink[] = [
  { href:'/guides/how-to-convert-srt-to-vtt/',title:'How to convert SRT to VTT for web video',text:'Convert SubRip captions into WebVTT syntax for browsers and HTML5 video while understanding timing, metadata and compatibility.' },
  { href:'/guides/how-to-convert-vtt-to-srt/',title:'How to convert VTT to SRT for broader compatibility',text:'Turn WebVTT into a simpler SRT compatibility copy and understand which VTT-only metadata cannot follow.' },
  { href:'/guides/srt-vs-vtt/',title:'SRT vs VTT: which subtitle format should you use?',text:'Compare compatibility, browser playback, cue settings, document metadata and conversion trade-offs.' },
  { href:'/guides/ass-vs-srt/',title:'ASS vs SRT: styling, compatibility and conversion',text:'Understand why ASS/SSA can carry styling, positioning, karaoke and effects that plain SRT cannot preserve.' },
  { href:'/guides/how-to-shift-subtitle-timing/',title:'How to shift subtitle timing by milliseconds',text:'Fix subtitles that are consistently early or late with a precise positive or negative timing offset.' },
  { href:'/guides/subtitle-to-plain-text/',title:'How to convert subtitles to plain text',text:'Export SRT, VTT, ASS, SSA or SBV as readable TXT with optional timestamp context.' },
  { href:'/guides/utf-8-bom-subtitles/',title:'UTF-8 BOM in subtitle files: what it is and when to use it',text:'Learn when a BOM can help legacy software, how it differs from LF/CRLF, and when to leave it off.' },
  { href:'/guides/sbv-vs-srt/',title:'SBV vs SRT: subtitle format differences',text:'Compare timestamp syntax, compatibility and common workflows for two simple timed-text formats.' },
  { href:'/guides/how-to-remove-gemini-watermark-from-image/',title:'How to remove the Gemini watermark from an image',text:'Remove the small visible Gemini sparkle watermark with a tight Circle or 4-Point-Star mask, including batch workflow, edge placement and visible-vs-invisible watermark limits.' },
  { href:'/guides/how-to-remove-watermark-from-image/',title:'How to remove a visible watermark from an image',text:'Choose a tight mask, move, resize or rotate it, use shared or individual batch editing, repair locally, and review the result.' },
  { href:'/guides/how-to-remove-text-watermark-from-image/',title:'How to remove a visible text watermark',text:'Create a solid auto-fitted text mask, move, resize or rotate it over visible characters, and understand where manual text masking works best.' },
  { href:'/guides/jpg-vs-png/',title:'JPG vs PNG: which format should you use?',text:'A practical comparison of photo compression, transparency, screenshots, graphics, and what format conversion can or cannot improve.' },
  { href:'/guides/webp-vs-jpg/',title:'WebP vs JPG: which image format should you use?',text:'Compare modern web delivery, file size, compatibility, transparency, quality, fallbacks, and when each format makes sense.' },
  { href:'/guides/webp-vs-avif/',title:'WebP vs AVIF for modern websites',text:'How to compare compression, compatibility, quality settings, decode behavior, and fallback strategy with real delivery workflows.' },
  { href:'/guides/heic-explained/',title:'HEIC explained: why phones use it and when to convert',text:'What HEIC is, why compatibility problems happen, when JPG or PNG makes sense, and why keeping the original can matter.' },
  { href:'/guides/how-to-convert-heic-to-jpg/',title:'How to convert HEIC to JPG without uploading photos',text:'A practical step-by-step guide to HEIC to JPG conversion, quality, batch processing, and browser-first privacy.' },
  { href:'/guides/csv-vs-json/',title:'CSV vs JSON: which format should you use?',text:'Compare tables, APIs, nested data, types, spreadsheets, conversion rules, and the trade-offs between CSV and JSON.' },
  { href:'/guides/image-quality-compression/',title:'Image quality and compression without the myths',text:'Lossy vs lossless, quality sliders, generation loss, pixel dimensions, browser memory, and practical delivery copies.' },
  { href:'/guides/how-to-convert-rar-to-zip/',title:'How to convert RAR to ZIP in your browser',text:'When ZIP compatibility is useful, what happens to archive metadata, and why password-protected RAR files need a different workflow.' },
  { href:'/guides/how-to-convert-7z-to-zip/',title:'How to convert 7Z to ZIP locally',text:'A step-by-step browser-first 7Z to ZIP workflow with notes on compatibility, compression, privacy, and archive safety.' },
  { href:'/guides/how-to-convert-tar-gz-to-zip/',title:'How to convert TAR.GZ or TGZ to ZIP',text:'Understand the gzip + TAR layers, when ZIP is easier to share, and what the converter preserves while repackaging.' },
  { href:'/guides/zip-vs-tar/',title:'ZIP vs TAR: which archive format should you use?',text:'Compare desktop compatibility, Unix workflows, compression behavior, metadata, and when TAR.GZ is a better fit.' },
  { href:'/guides/gzip-vs-zip/',title:'GZIP vs ZIP: why .gz is not the same as .zip',text:'Learn the difference between a single-file compression stream and a multi-file archive, plus when conversion makes sense.' },
];
