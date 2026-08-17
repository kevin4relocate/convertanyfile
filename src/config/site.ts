export const SITE = {
  name: 'ConvertAnyFile',
  domain: 'convertanyfile.net',
  origin: 'https://convertanyfile.net',
  tagline: 'Fast, private file conversion in your browser.',
  description:
    'Convert supported files directly in your browser. Start with image conversion today, with a platform designed for more local file types over time.',
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
      { label: 'HEIC to JPG', href: '/heic-to-jpg/' },
      { label: 'WebP to PNG', href: '/webp-to-png/' },
      { label: 'PNG to WebP', href: '/png-to-webp/' },
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
    description: 'JPG, PNG, WebP, HEIC, AVIF, TIFF, RAW and more.',
    href: '/image-converter/',
  },
  {
    id: 'audio',
    label: 'Audio',
    status: 'planned',
    description: 'A browser-first audio converter is planned for a later release.',
  },
  {
    id: 'archive',
    label: 'Archives',
    status: 'planned',
    description: 'ZIP, RAR, 7Z and archive workflows are planned for a later release.',
  },
  {
    id: 'data',
    label: 'Data',
    status: 'planned',
    description: 'CSV, JSON, XML and spreadsheet conversion is planned for a later release.',
  },
] as const;
