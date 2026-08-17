export interface FormatReference {
  id: string;
  name: string;
  role: string;
  summary: string;
  compression: string;
  transparency: string;
  bestFor: string;
  tradeoffs: string;
  compatibility: string;
}

export const FORMAT_REFERENCE: Record<string, FormatReference> = {
  jpg: {
    id: 'jpg', name: 'JPG', role: 'Photos & broad compatibility',
    summary: 'A widely supported lossy image format that is especially practical for photographs and compact delivery copies.',
    compression: 'Lossy', transparency: 'No alpha transparency',
    bestFor: 'Photographs, email, general sharing, upload forms, compatibility-focused delivery.',
    tradeoffs: 'Repeated re-encoding can add artifacts, and transparent pixels cannot be represented as true alpha transparency.',
    compatibility: 'Extremely broad across browsers, operating systems, editors, and consumer applications.',
  },
  png: {
    id: 'png', name: 'PNG', role: 'Lossless graphics & transparency',
    summary: 'A lossless format commonly used for screenshots, graphics, text-heavy images, and transparent assets.',
    compression: 'Lossless', transparency: 'Yes',
    bestFor: 'Screenshots, logos, UI graphics, diagrams, overlays, and workflows that need lossless storage.',
    tradeoffs: 'Full-resolution photographs can be much larger than efficient lossy formats without gaining new source detail.',
    compatibility: 'Extremely broad across browsers, design tools, office software, and image editors.',
  },
  webp: {
    id: 'webp', name: 'WebP', role: 'Modern web delivery',
    summary: 'A modern image format used widely on the web with support for lossy, lossless, and transparent workflows.',
    compression: 'Lossy or lossless', transparency: 'Yes',
    bestFor: 'Website images, modern browser delivery, photos, and transparent web graphics.',
    tradeoffs: 'Older or specialized software may still prefer JPG or PNG, and quality settings are encoder-specific.',
    compatibility: 'Strong in current browsers and increasingly common in content and image pipelines.',
  },
  avif: {
    id: 'avif', name: 'AVIF', role: 'High-efficiency modern images',
    summary: 'A modern format capable of strong compression efficiency for many photographic and graphic images.',
    compression: 'Lossy or lossless depending on encoder', transparency: 'Yes',
    bestFor: 'Modern web delivery where small transfer size and current codec support are important.',
    tradeoffs: 'Encoding and decoding behavior, tooling support, and quality controls should be tested with the real workflow.',
    compatibility: 'Good in modern browsers, but legacy applications and older workflows may still require a fallback.',
  },
  heic: {
    id: 'heic', name: 'HEIC', role: 'Efficient phone photography',
    summary: 'A common HEIF-family image container used by modern Apple devices for efficient photo storage.',
    compression: 'Typically high-efficiency lossy photo compression', transparency: 'Container capabilities vary',
    bestFor: 'Keeping efficient originals inside ecosystems that understand HEIC/HEIF well.',
    tradeoffs: 'Compatibility outside modern phone and photo ecosystems is less universal than JPG or PNG.',
    compatibility: 'Common on Apple devices, but many upload forms and older desktop applications still prefer JPG or PNG.',
  },
  tiff: {
    id: 'tiff', name: 'TIFF', role: 'Scanning & professional imaging',
    summary: 'A flexible image container common in scanning, print, archival, and professional imaging workflows.',
    compression: 'Can use multiple compression modes', transparency: 'Capabilities depend on the TIFF content',
    bestFor: 'Scanning, archival sources, print workflows, high-quality intermediates, and professional imaging.',
    tradeoffs: 'Files can be large and may contain metadata or features that simple delivery formats cannot preserve.',
    compatibility: 'Strong in professional imaging software; less convenient for ordinary web or messaging delivery.',
  },
  gif: {
    id: 'gif', name: 'GIF', role: 'Legacy animation & simple graphics',
    summary: 'A long-standing palette-based image format known for simple animation and broad recognition.',
    compression: 'Lossless palette compression', transparency: 'Limited transparency',
    bestFor: 'Simple legacy animations and small palette-based graphics.',
    tradeoffs: 'Limited color palette and inefficient photographic storage; animation may be lost when converting to a still format.',
    compatibility: 'Very broad, especially for playback of simple animations.',
  },
  bmp: {
    id: 'bmp', name: 'BMP', role: 'Simple bitmap storage',
    summary: 'A straightforward bitmap format that is easy to decode but often inefficient for everyday delivery.',
    compression: 'Often uncompressed or lightly compressed', transparency: 'Not a dependable transparency workflow',
    bestFor: 'Legacy Windows bitmap workflows and simple interchange with software that explicitly requests BMP.',
    tradeoffs: 'File size can be dramatically larger than compressed alternatives such as JPG, PNG, or WebP.',
    compatibility: 'Widely recognized, but rarely the best choice for web or general-purpose delivery.',
  },
  ico: {
    id: 'ico', name: 'ICO', role: 'Icons & favicons',
    summary: 'A container used for Windows icons and website favicons, often carrying one or more icon-sized images.',
    compression: 'Container-specific', transparency: 'Commonly supported',
    bestFor: 'Favicons, Windows icons, and software that explicitly requires ICO.',
    tradeoffs: 'Not intended as a general-purpose photo or document image format.',
    compatibility: 'Strong for icon-specific use cases rather than ordinary image delivery.',
  },
};

export const PRIMARY_FORMATS = ['jpg','png','webp','avif','heic','tiff','gif','bmp','ico'] as const;
