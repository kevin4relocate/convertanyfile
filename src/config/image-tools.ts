import type { ImageToolDefinition, MaskImageToolDefinition } from '../platform/image-tools/types';

const MIB = 1024 * 1024;

const commonLimits = {
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'] as const,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maxFileBytes: 10 * MIB,
  maxPixels: 20_000_000,
  maxDimension: 12_000,
  maxFiles: 50,
};

export const REMOVE_WATERMARK_TOOL: MaskImageToolDefinition = {
  ...commonLimits,
  id: 'remove-watermark', slug: 'remove-watermark', displayName: 'Remove Watermark', category: 'mask',
  title: 'Free Watermark Remover — Batch, Text & Shape Masks | ConvertAnyFile',
  description: 'Remove visible watermarks from one image or a batch locally in your browser. Use Rectangle, Circle, Square, Diamond, 4-Point Star, or a movable text-shaped mask, then download repaired images or ZIP.',
  h1: 'Remove watermarks from images.', eyebrow: 'Image Tools',
  intro: 'Add one image or up to 50. Matching aspect ratios start with One mask for all; mixed layouts start with Edit individually. Choose the closest mask—or type visible watermark text to create a movable text mask—then repair locally and download the results.',
  status: 'live',
  selectionModes: ['rect', 'circle', 'square', 'diamond', 'star4', 'text'], defaultSelectionMode: 'rect', removeActionLabel: 'Remove watermark',
  downloadSuffix: 'watermark-removed',
  policyNote: 'Best for visible marks that cover a relatively small area. Shape and text masks are manual editing aids, not automatic watermark or OCR detection. Keep important originals and review repaired details before reuse.',
};

export const GEMINI_AI_LOGO_REMOVER_TOOL: MaskImageToolDefinition = {
  ...commonLimits,
  id: 'gemini-ai-logo-remover', slug: 'gemini-ai-logo-remover', displayName: 'Gemini AI Logo Remover', category: 'mask',
  title: 'Gemini Watermark Remover — Remove AI Logo Free | ConvertAnyFile',
  description: 'Remove the visible Gemini watermark from JPG, PNG or WebP images free in your browser. Process one image or up to 50 locally with no account or image upload.',
  h1: 'Remove the visible Gemini watermark from images', eyebrow: 'Free Gemini Watermark Remover',
  intro: 'Remove a small visible Gemini-style sparkle watermark from one image or up to 50 images directly in your browser. Fit a Circle or 4-Point Star over the mark, move, resize or rotate the mask, repair locally, then download the result or a ZIP—no account or source-image upload required.',
  status: 'live',
  selectionModes: ['circle', 'star4'], defaultSelectionMode: 'star4', removeActionLabel: 'Remove Gemini watermark',
  downloadSuffix: 'gemini-logo-removed',
  policyNote: 'Use one shared mask when the visible watermark stays at the same relative position and approximate size. Use individual masks for mixed layouts or exceptions. This tool edits visible selected pixels only; it does not claim to detect or remove invisible provenance, authenticity, Content Credentials, metadata, or SynthID-style signals.',
};

const previewBase = {
  ...commonLimits,
  status: 'preview' as const,
};

export const RESIZE_IMAGE_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'resize-image', slug: 'resize-image', displayName: 'Resize Image', category: 'transform',
  title: 'Resize Images Online Free — Batch JPG, PNG & WebP | ConvertAnyFile',
  description: 'Resize one image or up to 50 JPG, PNG and WebP images by pixels, percentage, or fit-to-box directly in your browser.',
  h1: 'Resize images in your browser.', eyebrow: 'Image Tools · Preview',
  intro: 'Resize one image or a batch by exact pixels, percentage, or a maximum bounding box. Apply one setup to all images or switch to per-image overrides, preview the result, then download one file or a ZIP.',
  downloadSuffix: 'resized', policyNote: 'Large upscales can soften source detail. Keep originals when image quality matters and inspect the preview before downloading.',
};

export const COMPRESS_IMAGE_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'compress-image', slug: 'compress-image', displayName: 'Compress Image', category: 'encode',
  title: 'Compress Images Online Free — Batch JPG, PNG & WebP | ConvertAnyFile',
  description: 'Compress JPG, PNG and WebP images locally with adjustable output quality, batch processing, per-image overrides and ZIP download.',
  h1: 'Compress images locally.', eyebrow: 'Image Tools · Preview',
  intro: 'Reduce image file size without uploading source images. Choose output format and quality, apply the same setup to the batch or edit images individually, then download successful results as files or ZIP.',
  downloadSuffix: 'compressed', policyNote: 'JPEG and WebP respond to the quality slider. PNG output remains lossless, so file-size reduction can vary considerably by image.',
};

export const ROTATE_FLIP_IMAGE_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'rotate-flip-image', slug: 'rotate-flip-image', displayName: 'Rotate / Flip Image', category: 'transform',
  title: 'Rotate or Flip Images Online — Batch Tool | ConvertAnyFile',
  description: 'Rotate images 90, 180 or 270 degrees and flip horizontally or vertically in a browser-only batch workflow.',
  h1: 'Rotate or flip images.', eyebrow: 'Image Tools · Preview',
  intro: 'Rotate or mirror one image or a batch locally. Use one setup for every image, or switch to individual mode when only some images need a different orientation.',
  downloadSuffix: 'rotated', policyNote: 'Rotation and flipping are applied to decoded pixels. Output re-encoding can change metadata and file size even when dimensions are preserved.',
};

export const CROP_IMAGE_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'crop-image', slug: 'crop-image', displayName: 'Crop Image', category: 'geometry',
  title: 'Crop Images Online Free — Batch Aspect Ratios | ConvertAnyFile',
  description: 'Crop JPG, PNG and WebP images by percentage coordinates or common aspect ratios with shared or per-image settings.',
  h1: 'Crop images in a batch.', eyebrow: 'Image Tools · Preview',
  intro: 'Choose a free crop or common aspect ratio, adjust position and size as percentages, preview the active image, and reuse the crop across a batch or override individual images.',
  downloadSuffix: 'cropped', policyNote: 'Crop coordinates are relative to each image. For mixed compositions, use Edit individually and inspect each preview before processing.',
};

export const BLUR_IMAGE_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'blur-image', slug: 'blur-image', displayName: 'Blur Image', category: 'geometry',
  title: 'Blur Images Online Free — Whole Image or Region | ConvertAnyFile',
  description: 'Blur an entire image or a percentage-based region locally with batch and per-image settings for JPG, PNG and WebP.',
  h1: 'Blur images or selected regions.', eyebrow: 'Image Tools · Preview',
  intro: 'Blur the whole image or define a rectangular region using percentage coordinates. Apply one setup to the batch, customize exceptions individually, and preview locally before processing.',
  downloadSuffix: 'blurred', policyNote: 'Region blur is a manual rectangle and does not automatically detect faces, text, license plates, or other sensitive content.',
};

export const REMOVE_IMAGE_METADATA_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'remove-image-metadata', slug: 'remove-image-metadata', displayName: 'Remove Image Metadata', category: 'metadata',
  title: 'Remove Image Metadata Online — Strip EXIF & GPS Locally | ConvertAnyFile',
  description: 'Strip EXIF, GPS and software metadata from JPG, PNG and WebP images by re-encoding visible pixels locally in your browser.',
  h1: 'Remove metadata from images.', eyebrow: 'Image Tools · Preview',
  intro: 'Create clean copies without uploading source images. Choose one output format and quality for the batch, remove EXIF, GPS and common software tags locally, then download the cleaned files or a ZIP.',
  downloadSuffix: 'metadata-removed',
  policyNote: 'This tool removes metadata by decoding visible pixels and encoding a new image. It does not guarantee removal of information that is visibly embedded in the pixels themselves.',
};

export const BULK_RENAME_IMAGES_TOOL: ImageToolDefinition = {
  ...previewBase, id: 'bulk-rename-images', slug: 'bulk-rename-images', displayName: 'Bulk Rename Images', category: 'naming',
  title: 'Bulk Rename Images Online Free — Rename JPG, PNG & WebP | ConvertAnyFile',
  description: 'Rename up to 50 image files at once with number tokens, shared patterns and per-image filename overrides without changing image bytes.',
  h1: 'Bulk rename image files.', eyebrow: 'Image Tools · Preview',
  intro: 'Build a shared filename pattern for the batch, switch to individual mode for exceptions, preview every resulting filename, then download the original image bytes under their new names.',
  downloadSuffix: 'renamed',
  policyNote: 'Renaming changes filenames only. The original image extension, bytes, quality, metadata and visible pixels are left unchanged.',
};

export const IMAGE_TOOL_ROADMAP = [
  { id: 'remove-watermark', label: 'Remove Watermark', status: 'live', description: 'Batch visible-watermark repair with six manual mask modes, including a movable text mask.', href: '/remove-watermark/' },
  { id: 'gemini-ai-logo-remover', label: 'Gemini AI Logo Remover', status: 'live', description: 'Focused local repair for a small visible sparkle mark.', href: '/gemini-ai-logo-remover/' },
  { id: 'resize-image', label: 'Resize Image', status: 'preview', description: 'Resize by pixels, percentage, or fit-to-box with batch and individual settings.', href: '/resize-image/' },
  { id: 'compress-image', label: 'Compress Image', status: 'preview', description: 'Reduce image size with output-format and quality controls.', href: '/compress-image/' },
  { id: 'rotate-flip-image', label: 'Rotate / Flip', status: 'preview', description: 'Rotate or mirror one image or a batch locally.', href: '/rotate-flip-image/' },
  { id: 'crop-image', label: 'Crop Image', status: 'preview', description: 'Crop by percentage coordinates or common aspect ratios.', href: '/crop-image/' },
  { id: 'blur-image', label: 'Blur Image', status: 'preview', description: 'Blur an image or a selected rectangular region.', href: '/blur-image/' },
  { id: 'bulk-rename-images', label: 'Bulk Rename Images', status: 'preview', description: 'Rename a batch without changing image bytes or source extensions.', href: '/bulk-rename-images/' },
  { id: 'remove-image-metadata', label: 'Remove Image Metadata', status: 'preview', description: 'Strip EXIF, GPS and software metadata locally.', href: '/remove-image-metadata/' },
] as const;
