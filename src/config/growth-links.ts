export interface GrowthLink {
  href: string;
  label: string;
  description: string;
}

export interface GrowthLinkGroup {
  title: string;
  links: readonly GrowthLink[];
}

export const POPULAR_IMAGE_TOOLS: readonly GrowthLink[] = [
  { href: '/resize-image/', label: 'Resize Image', description: 'Resize JPG, PNG or WebP by pixels, percentage or fit-to-box.' },
  { href: '/compress-image/', label: 'Compress Image', description: 'Reduce file size with output-format and quality controls.' },
  { href: '/crop-image/', label: 'Crop Image', description: 'Crop by shape or aspect ratio with direct drag and live preview.' },
  { href: '/remove-image-metadata/', label: 'Remove Image Metadata', description: 'Create clean copies without common EXIF, GPS or software tags.' },
  { href: '/remove-watermark/', label: 'Remove Watermark', description: 'Repair small visible watermark areas with manual shape or text masks.' },
  { href: '/gemini-ai-logo-remover/', label: 'Gemini Watermark Remover', description: 'Focused Circle or 4-Point Star repair for the visible sparkle mark.' },
];

export const POPULAR_IMAGE_CONVERSIONS: readonly GrowthLink[] = [
  { href: '/heic-to-jpg/', label: 'HEIC to JPG', description: 'Create broadly compatible JPEG copies from supported HEIC photos.' },
  { href: '/png-to-webp/', label: 'PNG to WebP', description: 'Create modern WebP delivery copies while keeping the PNG source.' },
  { href: '/jpg-to-webp/', label: 'JPG to WebP', description: 'Convert JPEG photos into WebP for modern delivery workflows.' },
  { href: '/webp-to-jpg/', label: 'WebP to JPG', description: 'Create JPEG compatibility copies for forms and older software.' },
  { href: '/png-to-jpg/', label: 'PNG to JPG', description: 'Create smaller photo-style JPEG copies when transparency is not needed.' },
  { href: '/avif-to-jpg/', label: 'AVIF to JPG', description: 'Create a familiar JPEG fallback from a modern AVIF source.' },
  { href: '/jpg-to-png/', label: 'JPG to PNG', description: 'Move JPEG pixels into a PNG container when a PNG workflow is required.' },
  { href: '/heic-to-png/', label: 'HEIC to PNG', description: 'Create a broadly supported lossless PNG copy from HEIC.' },
];

export const POPULAR_DATA_CONVERSIONS: readonly GrowthLink[] = [
  { href: '/csv-to-json/', label: 'CSV to JSON', description: 'Turn table rows into predictable JSON records without uploading the source file.' },
  { href: '/json-to-csv/', label: 'JSON to CSV', description: 'Flatten JSON records into a spreadsheet-friendly CSV table.' },
  { href: '/jsonl-to-json/', label: 'JSONL to JSON', description: 'Turn one-record-per-line JSON into a standard JSON document.' },
  { href: '/json-to-jsonl/', label: 'JSON to JSONL', description: 'Create one compact JSON value per line for line-oriented workflows.' },
  { href: '/csv-to-jsonl/', label: 'CSV to JSONL', description: 'Convert CSV rows into one JSON object per output line.' },
  { href: '/jsonl-to-csv/', label: 'JSONL to CSV', description: 'Create a table from newline-delimited JSON records.' },
];

export const POPULAR_IMAGE_GUIDES: readonly GrowthLink[] = [
  { href: '/guides/resize-image-without-stretching/', label: 'Resize without stretching', description: 'Keep aspect ratio intact and learn when cropping is the better choice.' },
  { href: '/guides/resize-image-to-1920x1080/', label: 'Resize to 1920 × 1080', description: 'Handle exact 16:9 output without distorting the source image.' },
  { href: '/guides/reduce-image-file-size-without-resizing/', label: 'Reduce file size without resizing', description: 'Keep the same dimensions while changing encoding and quality.' },
  { href: '/guides/compress-images-for-web/', label: 'Compress images for the web', description: 'Choose practical dimensions, formats and quality for delivery copies.' },
  { href: '/guides/crop-image-to-circle/', label: 'Crop an image to a circle', description: 'Create a true circular crop with transparent corners.' },
  { href: '/guides/blur-part-of-image/', label: 'Blur part of an image', description: 'Position a Rectangle or Circle blur area directly on the preview.' },
  { href: '/guides/remove-exif-from-photo/', label: 'Remove EXIF from a photo', description: 'Create a clean sharing copy without common camera and software tags.' },
  { href: '/guides/remove-gps-location-from-image/', label: 'Remove GPS location metadata', description: 'Remove embedded coordinates and review visible location clues.' },
];

export const POPULAR_CONVERSION_GUIDES: readonly GrowthLink[] = [
  { href: '/guides/how-to-convert-csv-to-json/', label: 'How to convert CSV to JSON', description: 'Understand headers, quoted fields and string preservation before creating JSON records.' },
  { href: '/guides/how-to-convert-json-to-csv/', label: 'How to convert JSON to CSV', description: 'Flatten records into a table without hiding nested or complex values.' },
  { href: '/guides/how-to-convert-jpg-to-webp/', label: 'How to convert JPG to WebP', description: 'Create practical WebP delivery copies and compare actual size and visual quality.' },
  { href: '/guides/how-to-convert-webp-to-jpg/', label: 'How to convert WebP to JPG', description: 'Create a JPEG compatibility copy and understand transparency loss.' },
  { href: '/guides/how-to-convert-png-to-jpg/', label: 'How to convert PNG to JPG', description: 'Know when JPEG suits photographic PNG files and when PNG should stay PNG.' },
  { href: '/guides/how-to-convert-jpg-to-png/', label: 'How to convert JPG to PNG', description: 'Create a PNG workflow copy without expecting lost JPEG detail to return.' },
];

export const POPULAR_TEXT_TOOLS: readonly GrowthLink[] = [
  { href: '/text/json-formatter/', label: 'JSON Formatter', description: 'Pretty-print and validate JSON without uploading code.' },
  { href: '/text/base64-text-encoder/', label: 'Base64 Text Encoder', description: 'Encode UTF-8 text and emoji as Base64 in your browser.' },
  { href: '/text/word-character-counter/', label: 'Word & Character Counter', description: 'Check word, grapheme, line and byte counts.' },
  { href: '/text/color-code-converter/', label: 'HEX, RGB & HSL Converter', description: 'Convert between common web color formats.' },
];

export const HOME_GROWTH_LINK_GROUPS: readonly GrowthLinkGroup[] = [
  { title: 'Popular image tools', links: POPULAR_IMAGE_TOOLS },
  { title: 'Popular image conversions', links: POPULAR_IMAGE_CONVERSIONS.slice(0, 6) },
  { title: 'Popular data conversions', links: POPULAR_DATA_CONVERSIONS.slice(0, 4) },
  { title: 'Popular text tools', links: POPULAR_TEXT_TOOLS },
  { title: 'Helpful guides', links: [...POPULAR_CONVERSION_GUIDES.slice(0, 3), ...POPULAR_IMAGE_GUIDES.slice(0, 3)] },
];
