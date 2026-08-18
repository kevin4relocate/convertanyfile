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
    id: 'heic', name: 'HEIC', role: 'Efficient phone photography input',
    summary: 'A common HEIF-family image container used by modern Apple devices for efficient photo storage. It is an input family in the current ConvertAnyFile release rather than a certified output.',
    compression: 'Typically high-efficiency lossy photo compression', transparency: 'Container capabilities vary',
    bestFor: 'Keeping efficient originals inside ecosystems that understand HEIC/HEIF well, then converting to a more broadly accepted delivery format when needed.',
    tradeoffs: 'The packaged WASM runtime does not currently expose a HEIC writer, so HEIC is not offered as an output.',
    compatibility: 'Common on Apple devices, but many upload forms and older desktop applications still prefer JPG or PNG.',
  },
  jxl: {
    id: 'jxl', name: 'JXL', role: 'Modern high-efficiency imaging',
    summary: 'JPEG XL is designed for efficient still-image compression with modern fidelity features and flexible lossless or lossy workflows.',
    compression: 'Lossy or lossless', transparency: 'Yes',
    bestFor: 'Modern archival or specialist pipelines that explicitly support JPEG XL.',
    tradeoffs: 'Application and browser support is not as universal as JPG, PNG, or WebP.',
    compatibility: 'Best treated as an advanced output for tools that explicitly advertise JPEG XL support.',
  },
  jp2: {
    id: 'jp2', name: 'JP2', role: 'JPEG 2000 interchange',
    summary: 'JPEG 2000 is used in archival, imaging, document, and specialist workflows that need its wavelet-based compression model.',
    compression: 'Lossy or lossless', transparency: 'Can support alpha/channel data depending on workflow',
    bestFor: 'Archival, imaging, geospatial, medical, and legacy professional pipelines that require JPEG 2000.',
    tradeoffs: 'Consumer and web compatibility is much lower than JPG or PNG.',
    compatibility: 'Strong only in software and workflows that explicitly support JPEG 2000.',
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
    tradeoffs: 'Limited color palette and inefficient photographic storage; the current single-image converter exports one frame.',
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
    tradeoffs: 'Not intended as a general-purpose photo format; single-image conversions use the best available icon frame.',
    compatibility: 'Strong for icon-specific use cases rather than ordinary image delivery.',
  },
  pcx: {
    id: 'pcx', name: 'PCX', role: 'Legacy bitmap interchange',
    summary: 'An older raster format associated with classic PC graphics and paint applications.',
    compression: 'Run-length encoded raster data', transparency: 'No dependable modern alpha workflow',
    bestFor: 'Legacy software, preservation, or interchange where PCX is explicitly required.',
    tradeoffs: 'Rare in modern consumer workflows and usually larger or less convenient than current formats.',
    compatibility: 'Specialist and legacy rather than mainstream.',
  },
  tga: {
    id: 'tga', name: 'TGA', role: 'Legacy graphics & texture workflows',
    summary: 'Truevision TGA remains useful in some graphics, game-development, and texture pipelines.',
    compression: 'Uncompressed or run-length encoded', transparency: 'Can carry alpha',
    bestFor: 'Legacy graphics tools, game assets, textures, and pipelines that explicitly request TGA.',
    tradeoffs: 'File sizes can be large and web/browser use is uncommon.',
    compatibility: 'Good in graphics software; weak for ordinary web delivery.',
  },
  qoi: {
    id: 'qoi', name: 'QOI', role: 'Simple lossless image interchange',
    summary: 'Quite OK Image is a compact, simple lossless raster format designed for fast encoding and decoding.',
    compression: 'Lossless', transparency: 'Yes',
    bestFor: 'Developer tools, experiments, and applications that explicitly support QOI.',
    tradeoffs: 'Small ecosystem compared with PNG, WebP, or JPG.',
    compatibility: 'Niche; use only when the destination explicitly supports QOI.',
  },
  pnm: {
    id: 'pnm', name: 'PNM', role: 'Portable bitmap family',
    summary: 'The Netpbm family is intentionally simple and useful for command-line, scientific, and interchange workflows.',
    compression: 'Typically uncompressed/simple raster storage', transparency: 'No general alpha model',
    bestFor: 'Unix tools, scientific workflows, testing, and simple raster interchange.',
    tradeoffs: 'Large files and very limited consumer-facing usefulness.',
    compatibility: 'Strong in technical tooling; uncommon in consumer applications.',
  },
  hdr: {
    id: 'hdr', name: 'HDR', role: 'Radiance high-dynamic-range images',
    summary: 'Radiance RGBE stores high-dynamic-range image data for lighting, rendering, and environment-map workflows.',
    compression: 'HDR-oriented RGBE encoding', transparency: 'Not a general alpha workflow',
    bestFor: '3D rendering, lighting, environment maps, and HDR technical pipelines.',
    tradeoffs: 'Not intended for ordinary sharing, websites, or office applications.',
    compatibility: 'Specialist 3D, VFX, and imaging software.',
  },
  exr: {
    id: 'exr', name: 'EXR', role: 'Professional HDR & VFX imaging',
    summary: 'OpenEXR is a professional high-dynamic-range format used heavily in VFX, compositing, rendering, and production pipelines.',
    compression: 'Multiple lossless and lossy professional modes', transparency: 'Supports alpha and multiple channels',
    bestFor: 'VFX, CGI, compositing, rendering, and high-dynamic-range production interchange.',
    tradeoffs: 'Advanced channel/layer semantics may not map to simpler single-image outputs.',
    compatibility: 'Excellent in professional VFX and 3D software; limited in consumer applications.',
  },
};

export const PRIMARY_FORMATS = ['jpg','png','webp','avif','tiff','gif','bmp','ico','jxl','jp2','hdr','exr','pcx','tga','qoi','pnm'] as const;
