import type { ImageToolDefinition } from '../platform/image-tools/types';

const MIB = 1024 * 1024;

export const REMOVE_WATERMARK_TOOL: ImageToolDefinition = {
  id: 'remove-watermark',
  slug: 'remove-watermark',
  title: 'Free Image Watermark Remover — Private & Browser-Based | ConvertAnyFile',
  description: 'Remove small visible watermarks and corner logos from JPG, PNG and WebP images locally in your browser. Auto-select the bottom-right area or refine it with rectangle and brush tools.',
  h1: 'Remove a watermark from an image.',
  eyebrow: 'Image Tools · Preview',
  intro: 'Auto-select a small bottom-right watermark or mark it yourself, repair the selected pixels locally, compare before and after, then download a new image.',
  status: 'preview',
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileBytes: 40 * MIB,
  maxPixels: 20_000_000,
  maxDimension: 12_000,
};

export const IMAGE_TOOL_ROADMAP = [
  { id: 'remove-watermark', label: 'Remove Watermark', status: 'preview', description: 'Auto-select or paint over a small visible logo, then repair it locally.', href: '/remove-watermark/' },
  { id: 'resize-image', label: 'Resize Image', status: 'planned', description: 'Resize by pixels, percentage, or fit-to-box.', href: null },
  { id: 'compress-image', label: 'Compress Image', status: 'planned', description: 'Reduce image size with output-quality controls.', href: null },
  { id: 'crop-image', label: 'Crop Image', status: 'planned', description: 'Crop freely or use common aspect ratios.', href: null },
  { id: 'rotate-flip-image', label: 'Rotate / Flip', status: 'planned', description: 'Rotate or mirror an image locally.', href: null },
  { id: 'blur-image', label: 'Blur Image', status: 'planned', description: 'Blur an image or a selected region.', href: null },
  { id: 'remove-object', label: 'Remove Object', status: 'planned', description: 'Reuse the mask editor for larger manual object repair.', href: null },
  { id: 'remove-background', label: 'Remove Background', status: 'planned', description: 'Background isolation belongs to a later, separately validated engine.', href: null },
] as const;
