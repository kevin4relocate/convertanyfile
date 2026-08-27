export const SITE = {
  name: 'ConvertAnyFile',
  domain: 'convertanyfile.net',
  origin: 'https://convertanyfile.net',
  tagline: 'Fast, private file conversion and image tools in your browser.',
  description:
    'Convert supported image, archive, structured-data, and subtitle files and use focused image tools directly in your browser with local processing, privacy-first workflows, and no account required.',
} as const;

export const NAV_ITEMS = [
  { label: 'Converters', href: '/#converters' },
  { label: 'Image Tools', href: '/image-tools/' },
  { label: 'Formats', href: '/formats/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'About', href: '/about/' },
] as const;

export const FOOTER_GROUPS = [
  {
    title: 'Tools',
    links: [
      { label: 'Image Converter', href: '/image-converter/' },
      { label: 'Data Converter', href: '/data-converter/' },
      { label: 'Archive Converter', href: '/archive-converter/' },
      { label: 'Subtitle Converter', href: '/subtitle-converter/' },
      { label: 'Image Tools', href: '/image-tools/' },
      { label: 'Resize Image', href: '/resize-image/' },
      { label: 'Compress Image', href: '/compress-image/' },
      { label: 'Remove Metadata', href: '/remove-image-metadata/' },
      { label: 'Remove Watermark', href: '/remove-watermark/' },
      { label: 'Gemini Watermark Remover', href: '/gemini-ai-logo-remover/' },
      { label: 'HEIC to JPG', href: '/heic-to-jpg/' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Guides', href: '/guides/' },
      { label: 'Resize Without Stretching', href: '/guides/resize-image-without-stretching/' },
      { label: 'Reduce Image File Size', href: '/guides/reduce-image-file-size-without-resizing/' },
      { label: 'Remove EXIF Data', href: '/guides/remove-exif-from-photo/' },
      { label: 'Crop Image to Circle', href: '/guides/crop-image-to-circle/' },
      { label: 'SRT to VTT', href: '/srt-to-vtt/' },
      { label: 'Remove Watermark Guide', href: '/guides/how-to-remove-watermark-from-image/' },
      { label: 'Gemini Watermark Guide', href: '/guides/how-to-remove-gemini-watermark-from-image/' },
      { label: 'Formats', href: '/formats/' },
      { label: 'FAQ', href: '/faq/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'Privacy', href: '/privacy/' },
      { label: 'Terms', href: '/terms/' },
    ],
  },
] as const;

export const PLATFORM_CATEGORIES = [
  {
    id: 'image',
    label: 'Images',
    status: 'live',
    description: 'JPG, PNG, WebP, HEIC, AVIF, TIFF and more.',
    href: '/image-converter/',
  },
  {
    id: 'data',
    label: 'Data',
    status: 'live',
    description: 'CSV, TSV, JSON, JSONL and NDJSON conversion in your browser.',
    href: '/data-converter/',
  },
  {
    id: 'archive',
    label: 'Archives',
    status: 'live',
    description: '7Z, RAR, ZIP, TAR, TAR.GZ/TGZ and GZIP conversion with local browser processing.',
    href: '/archive-converter/',
  },
  {
    id: 'subtitle',
    label: 'Subtitles',
    status: 'live',
    description: 'SRT, VTT, ASS, SSA and SBV with full-file preflight, timing tools, text cleanup and transcript export.',
    href: '/subtitle-converter/',
  },
] as const;
