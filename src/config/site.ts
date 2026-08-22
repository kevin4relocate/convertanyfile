export const SITE = {
  name: 'ConvertAnyFile',
  domain: 'convertanyfile.net',
  origin: 'https://convertanyfile.net',
  tagline: 'Fast, private file conversion and image tools in your browser.',
  description:
    'Convert supported files and use focused image tools directly in your browser with local processing, privacy-first workflows, and no account required.',
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
      { label: 'Image Tools', href: '/image-tools/' },
      { label: 'Remove Watermark', href: '/remove-watermark/' },
      { label: 'Gemini Watermark Remover', href: '/gemini-ai-logo-remover/' },
      { label: 'HEIC to JPG', href: '/heic-to-jpg/' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Guides', href: '/guides/' },
      { label: 'Remove Watermark Guide', href: '/guides/how-to-remove-watermark-from-image/' },
      { label: 'Remove Text Watermark', href: '/guides/how-to-remove-text-watermark-from-image/' },
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
] as const;
