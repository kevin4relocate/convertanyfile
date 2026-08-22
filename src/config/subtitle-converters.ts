import { SUBTITLE_BATCH_POLICY } from '../platform/converter/batch-policy';
import type { ConverterDefinition } from '../platform/converter/types';

const subtitleBase = {
  engine: 'subtitle' as const,
  category: 'subtitle' as const,
  batchPolicy: SUBTITLE_BATCH_POLICY,
  quickOutputs: ['srt', 'vtt', 'sbv', 'txt'],
};

export const SUBTITLE_CONVERTERS: readonly ConverterDefinition[] = [
  {
    ...subtitleBase,
    slug: 'subtitle-converter',
    title: 'Free Subtitle Converter — SRT, VTT, ASS & More | ConvertAnyFile',
    description: 'Convert SRT, WebVTT, ASS, SSA and SBV locally with preflight cue analysis, timing shift, formatting cleanup, transcript export, batch conversion and no upload.',
    h1: 'Free online subtitle converter',
    eyebrow: 'Subtitle converter',
    intro: 'Inspect and convert common timed-text subtitle formats in a browser worker without uploading the source file.',
  },
  {
    ...subtitleBase, slug: 'srt-to-vtt', input: 'srt', output: 'vtt',
    title: 'SRT to VTT Converter — Free & Private | ConvertAnyFile',
    description: 'Convert SRT subtitles to WebVTT locally with optional timing shift, formatting cleanup, line-ending controls and no upload.',
    h1: 'Convert SRT to VTT', eyebrow: 'SRT → VTT',
    intro: 'Turn SubRip subtitles into browser-friendly WebVTT while keeping timing tools and conversion local.',
    related: ['vtt-to-srt', 'srt-to-sbv', 'srt-to-txt'],
  },
  {
    ...subtitleBase, slug: 'srt-to-sbv', input: 'srt', output: 'sbv',
    title: 'SRT to SBV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert SRT subtitles to SBV locally with deterministic timestamps, optional timing shift and formatting cleanup.',
    h1: 'Convert SRT to SBV', eyebrow: 'SRT → SBV',
    intro: 'Create an SBV timed-caption copy from SRT without uploading the subtitle file.',
    related: ['sbv-to-srt', 'srt-to-vtt', 'srt-to-txt'],
  },
  {
    ...subtitleBase, slug: 'srt-to-txt', input: 'srt', output: 'txt',
    title: 'SRT to TXT Converter — Extract Subtitle Text | ConvertAnyFile',
    description: 'Convert SRT to plain TXT locally. Choose no timestamps, start times, or start-to-end ranges and control cue spacing.',
    h1: 'Convert SRT to TXT', eyebrow: 'SRT → TXT',
    intro: 'Extract readable subtitle text from SRT with flexible timestamp and cue-spacing options.',
    related: ['vtt-to-txt', 'ass-to-txt', 'srt-to-vtt'],
  },
  {
    ...subtitleBase, slug: 'vtt-to-srt', input: 'vtt', output: 'srt',
    title: 'VTT to SRT Converter — WebVTT to SubRip | ConvertAnyFile',
    description: 'Convert WebVTT or .webvtt subtitles to SRT locally with preflight metadata detection and optional timing shift.',
    h1: 'Convert VTT to SRT', eyebrow: 'VTT → SRT',
    intro: 'Create a widely compatible SRT copy of a WebVTT subtitle file without uploading it.',
    related: ['srt-to-vtt', 'vtt-to-sbv', 'vtt-to-txt'],
  },
  {
    ...subtitleBase, slug: 'vtt-to-sbv', input: 'vtt', output: 'sbv',
    title: 'VTT to SBV Converter — WebVTT to SBV | ConvertAnyFile',
    description: 'Convert WebVTT captions to SBV locally while keeping cue order and timing and making VTT-only metadata loss explicit.',
    h1: 'Convert VTT to SBV', eyebrow: 'VTT → SBV',
    intro: 'Turn WebVTT cues into a simple SBV timed-caption file in your browser.',
    related: ['vtt-to-srt', 'sbv-to-vtt', 'vtt-to-txt'],
  },
  {
    ...subtitleBase, slug: 'vtt-to-txt', input: 'vtt', output: 'txt',
    title: 'VTT to TXT Converter — Extract WebVTT Text | ConvertAnyFile',
    description: 'Convert WebVTT subtitles to plain TXT locally with optional timestamp ranges and cue spacing.',
    h1: 'Convert VTT to TXT', eyebrow: 'VTT → TXT',
    intro: 'Extract readable text from WebVTT cues without uploading the subtitle file.',
    related: ['srt-to-txt', 'vtt-to-srt', 'sbv-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ass-to-srt', input: 'ass', output: 'srt',
    title: 'ASS to SRT Converter — Advanced SubStation Alpha | ConvertAnyFile',
    description: 'Convert ASS subtitles to SRT locally. Dialogue timing and readable text are kept while styling, positioning, karaoke and effects are removed.',
    h1: 'Convert ASS to SRT', eyebrow: 'ASS → SRT',
    intro: 'Extract dialogue timing and readable text from ASS into a simple SRT compatibility copy.',
    related: ['ssa-to-srt', 'ass-to-vtt', 'ass-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ass-to-vtt', input: 'ass', output: 'vtt',
    title: 'ASS to VTT Converter — Free & Private | ConvertAnyFile',
    description: 'Convert ASS dialogue to WebVTT locally with timing shift controls while rich ASS styling is intentionally removed.',
    h1: 'Convert ASS to VTT', eyebrow: 'ASS → VTT',
    intro: 'Create a WebVTT compatibility copy from ASS dialogue in your browser.',
    related: ['ass-to-srt', 'ass-to-sbv', 'ass-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ass-to-sbv', input: 'ass', output: 'sbv',
    title: 'ASS to SBV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert ASS dialogue to SBV locally, preserving cue timing and readable text while removing ASS-only presentation data.',
    h1: 'Convert ASS to SBV', eyebrow: 'ASS → SBV',
    intro: 'Create a simple SBV caption copy from ASS dialogue without uploading the source.',
    related: ['ass-to-srt', 'ass-to-vtt', 'ass-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ass-to-txt', input: 'ass', output: 'txt',
    title: 'ASS to TXT Converter — Extract Dialogue Text | ConvertAnyFile',
    description: 'Extract readable dialogue from ASS to TXT locally with optional timestamps while styling and override commands are removed.',
    h1: 'Convert ASS to TXT', eyebrow: 'ASS → TXT',
    intro: 'Create a transcript-like TXT copy from ASS dialogue with optional timing context.',
    related: ['ass-to-srt', 'ssa-to-txt', 'srt-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ssa-to-srt', input: 'ssa', output: 'srt',
    title: 'SSA to SRT Converter — SubStation Alpha | ConvertAnyFile',
    description: 'Convert SSA subtitles to SRT locally while retaining dialogue timing and text and removing SSA-only styling and layout metadata.',
    h1: 'Convert SSA to SRT', eyebrow: 'SSA → SRT',
    intro: 'Turn SubStation Alpha dialogue into a simple SRT subtitle file directly in your browser.',
    related: ['ass-to-srt', 'ssa-to-vtt', 'ssa-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ssa-to-vtt', input: 'ssa', output: 'vtt',
    title: 'SSA to VTT Converter — Free & Private | ConvertAnyFile',
    description: 'Convert SSA dialogue to WebVTT locally with timing controls and explicit styling-loss behavior.',
    h1: 'Convert SSA to VTT', eyebrow: 'SSA → VTT',
    intro: 'Create a browser-friendly WebVTT compatibility copy from SSA dialogue.',
    related: ['ssa-to-srt', 'ssa-to-sbv', 'ssa-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ssa-to-sbv', input: 'ssa', output: 'sbv',
    title: 'SSA to SBV Converter — Free & Private | ConvertAnyFile',
    description: 'Convert SSA dialogue to SBV locally while preserving timing and readable text where the simpler target can represent it.',
    h1: 'Convert SSA to SBV', eyebrow: 'SSA → SBV',
    intro: 'Turn SSA dialogue into a simple SBV timed-caption file without uploading it.',
    related: ['ssa-to-srt', 'ssa-to-vtt', 'ssa-to-txt'],
  },
  {
    ...subtitleBase, slug: 'ssa-to-txt', input: 'ssa', output: 'txt',
    title: 'SSA to TXT Converter — Extract Dialogue Text | ConvertAnyFile',
    description: 'Extract readable SSA dialogue to TXT locally with optional timestamps and cue spacing.',
    h1: 'Convert SSA to TXT', eyebrow: 'SSA → TXT',
    intro: 'Create a clean transcript-like TXT copy from SSA dialogue in your browser.',
    related: ['ass-to-txt', 'ssa-to-srt', 'srt-to-txt'],
  },
  {
    ...subtitleBase, slug: 'sbv-to-srt', input: 'sbv', output: 'srt',
    title: 'SBV to SRT Converter — Free & Private | ConvertAnyFile',
    description: 'Convert SBV captions to SRT locally with deterministic timestamp conversion, optional timing shift and no upload.',
    h1: 'Convert SBV to SRT', eyebrow: 'SBV → SRT',
    intro: 'Convert simple SBV timed captions into numbered SubRip cues.',
    related: ['srt-to-sbv', 'sbv-to-vtt', 'sbv-to-txt'],
  },
  {
    ...subtitleBase, slug: 'sbv-to-vtt', input: 'sbv', output: 'vtt',
    title: 'SBV to VTT Converter — Free & Private | ConvertAnyFile',
    description: 'Convert SBV captions to WebVTT locally with optional timing shift and no upload step.',
    h1: 'Convert SBV to VTT', eyebrow: 'SBV → VTT',
    intro: 'Turn SBV timed captions into WebVTT cues for browser and web-video workflows.',
    related: ['sbv-to-srt', 'srt-to-vtt', 'sbv-to-txt'],
  },
  {
    ...subtitleBase, slug: 'sbv-to-txt', input: 'sbv', output: 'txt',
    title: 'SBV to TXT Converter — Extract Caption Text | ConvertAnyFile',
    description: 'Convert SBV captions to plain TXT locally with optional start times or full timestamp ranges.',
    h1: 'Convert SBV to TXT', eyebrow: 'SBV → TXT',
    intro: 'Extract readable text from SBV captions with optional timing context.',
    related: ['srt-to-txt', 'vtt-to-txt', 'sbv-to-srt'],
  },
] as const;

export const SUBTITLE_CONVERTER = SUBTITLE_CONVERTERS[0];
export const SUBTITLE_PAIR_CONVERTERS = SUBTITLE_CONVERTERS.filter((converter) => converter.input && converter.output);

export function getSubtitleConverter(slug: string): ConverterDefinition | undefined {
  return SUBTITLE_CONVERTERS.find((converter) => converter.slug === slug);
}
