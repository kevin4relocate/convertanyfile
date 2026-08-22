import type { ImageToolDefinition } from '../platform/image-tools/types';

const MIB = 1024 * 1024;

export const REMOVE_WATERMARK_TOOL: ImageToolDefinition = {
  id: 'remove-watermark',
  slug: 'remove-watermark',
  displayName: 'Remove Watermark',
  title: 'Free Watermark Remover — Batch, Text & Shape Masks | ConvertAnyFile',
  description: 'Remove visible watermarks from one image or a batch locally in your browser. Use Rectangle, Circle, Square, Diamond, 4-Point Star, or a movable text-shaped mask, then download repaired images or ZIP.',
  h1: 'Remove watermarks from images.',
  eyebrow: 'Image Tools',
  intro: 'Add one image or up to 50. Matching aspect ratios start with One mask for all; mixed layouts start with Edit individually. Choose the closest mask—or type visible watermark text to create a movable text mask—then repair locally and download the results.',
  status: 'live',
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileBytes: 10 * MIB,
  maxPixels: 20_000_000,
  maxDimension: 12_000,
  selectionModes: ['rect', 'circle', 'square', 'diamond', 'star4', 'text'],
  defaultSelectionMode: 'rect',
  removeActionLabel: 'Remove watermark',
  downloadSuffix: 'watermark-removed',
  policyNote: 'Best for visible marks that cover a relatively small area. Shape and text masks are manual editing aids, not automatic watermark or OCR detection. Keep important originals and review repaired details before reuse.',
};

export const GEMINI_AI_LOGO_REMOVER_TOOL: ImageToolDefinition = {
  id: 'gemini-ai-logo-remover',
  slug: 'gemini-ai-logo-remover',
  displayName: 'Gemini AI Logo Remover',
  title: 'Gemini Watermark Remover — Remove Visible AI Logo Free | ConvertAnyFile',
  description: 'Remove the visible Gemini watermark from JPG, PNG or WebP images free in your browser. Use a tight Circle or 4-Point Star mask for one image or a batch of up to 50, with no image upload.',
  h1: 'Remove the visible Gemini watermark from images',
  eyebrow: 'Free Gemini Watermark Remover',
  intro: 'Remove a small visible Gemini-style sparkle watermark from one image or up to 50 images directly in your browser. Fit a Circle or 4-Point Star over the mark, move, resize or rotate the mask, repair locally, then download the result or a ZIP—no account or source-image upload required.',
  status: 'live',
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileBytes: 10 * MIB,
  maxPixels: 20_000_000,
  maxDimension: 12_000,
  selectionModes: ['circle', 'star4'],
  defaultSelectionMode: 'star4',
  removeActionLabel: 'Remove Gemini watermark',
  downloadSuffix: 'gemini-watermark-removed',
  policyNote: 'Use one shared mask when the visible watermark stays at the same relative position and approximate size. Use individual masks for mixed layouts or exceptions. This tool edits visible selected pixels only; it does not claim to detect or remove invisible provenance, authenticity, Content Credentials, metadata, or SynthID-style signals.',
};

export const IMAGE_TOOL_ROADMAP = [
  { id: 'remove-watermark', label: 'Remove Watermark', status: 'live', description: 'Batch visible-watermark repair with six manual mask modes, including a movable text mask.', href: '/remove-watermark/' },
  { id: 'gemini-ai-logo-remover', label: 'Gemini AI Logo Remover', status: 'live', description: 'Free Gemini watermark remover for a small visible sparkle mark, with Circle or 4-Point-Star masks and smart batch editing.', href: '/gemini-ai-logo-remover/' },
  { id: 'resize-image', label: 'Resize Image', status: 'planned', description: 'Resize by pixels, percentage, or fit-to-box.', href: null },
  { id: 'compress-image', label: 'Compress Image', status: 'planned', description: 'Reduce image size with output-quality controls.', href: null },
  { id: 'crop-image', label: 'Crop Image', status: 'planned', description: 'Crop freely or use common aspect ratios.', href: null },
  { id: 'rotate-flip-image', label: 'Rotate / Flip', status: 'planned', description: 'Rotate or mirror an image locally.', href: null },
  { id: 'blur-image', label: 'Blur Image', status: 'planned', description: 'Blur an image or a selected region.', href: null },
  { id: 'remove-object', label: 'Remove Object', status: 'planned', description: 'Reuse the mask editor for larger manual object repair.', href: null },
  { id: 'remove-background', label: 'Remove Background', status: 'planned', description: 'Background isolation belongs to a later, separately validated engine.', href: null },
] as const;
