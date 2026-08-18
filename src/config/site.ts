export const SITE = {
  name: 'ConvertAnyFile',
  domain: 'convertanyfile.net',
  origin: 'https://convertanyfile.net',
  tagline: 'Fast, private file conversion in your browser.',
  description:
    'Convert supported image and structured-data files directly in your browser with local processing, batch workflows, and no account required.',
} as const;

export const NAV_ITEMS = [
  { label: 'Converters', href: '/#converters' },
  { label: 'Formats', href: '/formats/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'About', href: '/about/' },
] as const;

export const FOOTER_GROUPS = [
  {
    title: 'Convert',
    links: [
      { label: 'Image Converter', href: '/image-converter/' },
      { label: 'Data Converter', href: '/data-converter/' },
      { label: 'HEIC to JPG', href: '/heic-to-jpg/' },
      { label: 'CSV to JSON', href: '/csv-to-json/' },
      { label: 'JSON to CSV', href: '/json-to-csv/' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Formats', href: '/formats/' },
      { label: 'Guides', href: '/guides/' },
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
] as const;
