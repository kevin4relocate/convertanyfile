import type { ImageToolDefinition, MaskImageToolDefinition, ImageToolManifestEntry, ImageToolDirectoryGroup } from '../platform/image-tools/types';

const MIB = 1024 * 1024;

const commonLimits = {
  acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'] as const,
  acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  maxFileBytes: 10 * MIB,
  maxPixels: 20_000_000,
  maxDimension: 12_000,
  maxFiles: 50,
};

export const REMOVE_WATERMARK_TOOL = {
  ...commonLimits,
  id: 'remove-watermark' as const, slug: 'remove-watermark', displayName: 'Remove Watermark', category: 'mask',
  title: 'Free Watermark Remover — Batch, Text & Shape Masks | ConvertAnyFile',
  description: 'Remove visible watermarks from one image or a batch locally in your browser. Use Rectangle, Circle, Square, Diamond, 4-Point Star, or a movable text-shaped mask, then download repaired images or ZIP.',
  h1: 'Remove watermarks from images.', eyebrow: 'Image Tools',
  intro: 'Add one image or up to 50. Matching aspect ratios start with One mask for all; mixed layouts start with Edit individually. Choose the closest mask—or type visible watermark text to create a movable text mask—then repair locally and download the results.',
  status: 'live',
  selectionModes: ['rect', 'circle', 'square', 'diamond', 'star4', 'text'], defaultSelectionMode: 'rect', removeActionLabel: 'Remove watermark',
  downloadSuffix: 'watermark-removed',
  policyNote: 'Best for visible marks that cover a relatively small area. Shape and text masks are manual editing aids, not automatic watermark or OCR detection. Keep important originals and review repaired details before reuse.',
} satisfies MaskImageToolDefinition;

export const GEMINI_AI_LOGO_REMOVER_TOOL = {
  ...commonLimits,
  id: 'gemini-ai-logo-remover' as const, slug: 'gemini-ai-logo-remover', displayName: 'Gemini AI Logo Remover', category: 'mask',
  title: 'Gemini Watermark Remover — Remove AI Logo Free | ConvertAnyFile',
  description: 'Remove the visible Gemini watermark from JPG, PNG or WebP images free in your browser. Process one image or up to 50 locally with no account or image upload.',
  h1: 'Remove the visible Gemini watermark from images', eyebrow: 'Free Gemini Watermark Remover',
  intro: 'Remove the visible Gemini sparkle watermark from one image or up to 50 images in your browser. Fit a Circle or 4-Point Star over the mark, repair locally, then download.',
  status: 'live',
  selectionModes: ['circle', 'star4'], defaultSelectionMode: 'star4', removeActionLabel: 'Remove Gemini watermark',
  downloadSuffix: 'gemini-logo-removed',
  policyNote: 'Use one shared mask when the visible watermark stays at the same relative position and approximate size. Use individual masks for mixed layouts or exceptions. This tool edits visible selected pixels only; it does not claim to detect or remove invisible provenance, authenticity, Content Credentials, metadata, or SynthID-style signals.',
} satisfies MaskImageToolDefinition;

const liveBase = {
  ...commonLimits,
  status: 'live' as const,
};

export const RESIZE_IMAGE_TOOL = {
  ...liveBase, id: 'resize-image' as const, slug: 'resize-image', displayName: 'Resize Image', category: 'transform',
  title: 'Resize Images Online Free — Batch JPG, PNG & WebP | ConvertAnyFile',
  description: 'Resize one image or up to 50 JPG, PNG and WebP images by pixels, percentage, or fit-to-box directly in your browser.',
  h1: 'Resize images in your browser.', eyebrow: 'Image Tools',
  intro: 'Resize one image or a batch by exact pixels, percentage, or a maximum bounding box. Apply one setup to all images or switch to per-image overrides, preview the result, then download one file or a ZIP.',
  downloadSuffix: 'resized', policyNote: 'Large upscales can soften source detail. Keep originals when image quality matters and inspect the preview before downloading.',
} satisfies ImageToolDefinition;

export const COMPRESS_IMAGE_TOOL = {
  ...liveBase, id: 'compress-image' as const, slug: 'compress-image', displayName: 'Compress Image', category: 'encode',
  title: 'Compress Images Online Free — Batch JPG, PNG & WebP | ConvertAnyFile',
  description: 'Compress JPG, PNG and WebP images locally with adjustable output quality, batch processing, per-image overrides and ZIP download.',
  h1: 'Compress images locally.', eyebrow: 'Image Tools',
  intro: 'Reduce image file size without uploading source images. Choose output format and quality, apply the same setup to the batch or edit images individually, then download successful results as files or ZIP.',
  downloadSuffix: 'compressed', policyNote: 'JPEG and WebP respond to the quality slider. PNG output remains lossless, so file-size reduction can vary considerably by image.',
} satisfies ImageToolDefinition;

export const ROTATE_FLIP_IMAGE_TOOL = {
  ...liveBase, id: 'rotate-flip-image' as const, slug: 'rotate-flip-image', displayName: 'Rotate / Flip Image', category: 'transform',
  title: 'Rotate or Flip Images Online — Batch Tool | ConvertAnyFile',
  description: 'Rotate images 90, 180 or 270 degrees and flip horizontally or vertically in a browser-only batch workflow.',
  h1: 'Rotate or flip images.', eyebrow: 'Image Tools',
  intro: 'Rotate or mirror one image or a batch locally. Use one setup for every image, or switch to individual mode when only some images need a different orientation.',
  downloadSuffix: 'rotated', policyNote: 'Rotation and flipping are applied to decoded pixels. Output re-encoding can change metadata and file size even when dimensions are preserved.',
} satisfies ImageToolDefinition;

export const CROP_IMAGE_TOOL = {
  ...liveBase, id: 'crop-image' as const, slug: 'crop-image', displayName: 'Crop Image', category: 'geometry',
  title: 'Crop Images Online Free — Circle & Square Cropper | ConvertAnyFile',
  description: 'Crop JPG, PNG and WebP images locally. Drag Rectangle, Square, Circle or Triangle crops, use aspect-ratio presets, preview and batch download.',
  h1: 'Crop images online by shape or aspect ratio.', eyebrow: 'Image Tools',
  intro: 'Choose Rectangle, Square, Circle or Triangle, then drag the crop directly on the image and resize it from a corner. Use Free, Original, 1:1, 4:3, 3:2, 16:9 or 9:16 framing, apply one crop across a batch or customize individual images.',
  downloadSuffix: 'cropped', policyNote: 'Shared crop settings work best when subjects sit in similar relative positions. Circle and Triangle crops keep the outside area transparent, so PNG or WebP output is used for those shapes.',
} satisfies ImageToolDefinition;

export const BLUR_IMAGE_TOOL = {
  ...liveBase, id: 'blur-image' as const, slug: 'blur-image', displayName: 'Blur Image', category: 'geometry',
  title: 'Blur Image Online Free — Blur Part of an Image | ConvertAnyFile',
  description: 'Blur a whole image or a selected Rectangle or Circle area locally. Drag and resize the blur area, preview the effect, batch process and download.',
  h1: 'Blur images online or blur a selected area.', eyebrow: 'Image Tools',
  intro: 'Blur the whole image or choose Selected area, then use a Rectangle or Circle selection. Drag the highlighted area directly on the image, resize it from a corner, adjust blur strength, and reuse the setup across a batch or customize individual images.',
  downloadSuffix: 'blurred', policyNote: 'Selected-area blur is manual and supports Rectangle or Circle. It does not automatically detect faces, text, license plates, or other sensitive content, so review the exported pixels when privacy matters.',
} satisfies ImageToolDefinition;

export const FADE_IMAGE_EDGES_TOOL = {
  ...commonLimits,
  status: 'preview',
  id: 'fade-image-edges' as const, slug: 'fade-image-edges', displayName: 'Fade Image Edges', category: 'geometry',
  title: 'Fade Image Edges — Soft Blur for Subtitles | ConvertAnyFile',
  description: 'Preview a soft blur fade from the bottom, top, left, right or all image edges. Create smooth or organic subtitle-safe areas locally in your browser.',
  h1: 'Fade image edges for subtitles and text.', eyebrow: 'Image Tools · Preview',
  intro: 'Create a gradual blur from one edge or all four edges while keeping the center clear. Adjust fade depth, blur strength and softness, then switch between a clean Smooth fade and a gently irregular Organic fade for a more natural paper-wash look.',
  downloadSuffix: 'edge-faded',
  policyNote: 'Preview feature. The fade is a visual editing effect, not a privacy-redaction tool. Review the full-resolution export before placing subtitles or important text over the faded area.',
} satisfies ImageToolDefinition;

export const REMOVE_IMAGE_METADATA_TOOL = {
  ...liveBase, id: 'remove-image-metadata' as const, slug: 'remove-image-metadata', displayName: 'Remove Image Metadata', category: 'metadata',
  title: 'Remove Image Metadata Online — Strip EXIF & GPS Locally | ConvertAnyFile',
  description: 'Strip EXIF, GPS and software metadata from JPG, PNG and WebP images by re-encoding visible pixels locally in your browser.',
  h1: 'Remove metadata from images.', eyebrow: 'Image Tools',
  intro: 'Create clean copies without uploading source images. Choose one output format and quality for the batch, remove EXIF, GPS and common software tags locally, then download the cleaned files or a ZIP.',
  downloadSuffix: 'metadata-removed',
  policyNote: 'This tool removes metadata by decoding visible pixels and encoding a new image. It does not guarantee removal of information that is visibly embedded in the pixels themselves.',
} satisfies ImageToolDefinition;

export const BULK_RENAME_IMAGES_TOOL = {
  ...liveBase, id: 'bulk-rename-images' as const, slug: 'bulk-rename-images', displayName: 'Bulk Rename Images', category: 'naming',
  title: 'Bulk Rename Images Online Free — Rename JPG, PNG & WebP | ConvertAnyFile',
  description: 'Rename up to 50 image files at once with number tokens, shared patterns and per-image filename overrides without changing image bytes.',
  h1: 'Bulk rename image files.', eyebrow: 'Image Tools',
  intro: 'Build a shared filename pattern for the batch, switch to individual mode for exceptions, preview every resulting filename, then download the original image bytes under their new names.',
  downloadSuffix: 'renamed',
  policyNote: 'Renaming changes filenames only. The original image extension, bytes, quality, metadata and visible pixels are left unchanged.',
} satisfies ImageToolDefinition;

export const ADD_WATERMARK_TOOL = {
  ...liveBase, id: 'add-watermark' as const, slug: 'add-watermark', displayName: 'Add Watermark', category: 'watermark',
  title: 'Add Watermark to Image Online — Text or Logo, Batch & ZIP | ConvertAnyFile',
  description: 'Add a text or logo watermark to JPG, PNG and WebP images locally. Drag the watermark into position, adjust size and opacity, process a batch, then download files or ZIP.',
  h1: 'Add a watermark to images.', eyebrow: 'Image Tools',
  intro: 'Add one image or a batch, type a text watermark or upload a logo, then drag it directly on the preview. Adjust size, opacity and color, apply the same placement across the batch, and download the finished image or ZIP.',
  downloadSuffix: 'watermarked',
  policyNote: 'Watermark placement is stored as relative coordinates so the same setup can be reused across different image sizes. Review mixed portrait and landscape batches before downloading because the same relative position can cover different content.',
} satisfies ImageToolDefinition;

/**
 * The manifest is the single source for discoverability and runtime selection.
 * Its tool definitions also supply the canonical IDs, slugs, status, SEO metadata
 * and browser safety limits. Keep preview tools accessible but out of the live menu.
 */
export const IMAGE_TOOL_MANIFEST = [
  { tool: ADD_WATERMARK_TOOL, runtime: 'watermark', directoryGroup: 'watermarks', navigationHint: 'Text · logo · batch', summary: 'Add draggable text or logo watermarks to one image or a batch, then download files or ZIP.' },
  { tool: REMOVE_WATERMARK_TOOL, runtime: 'mask', directoryGroup: 'watermarks', navigationHint: 'Shapes · text mask', summary: 'Batch visible-watermark repair with six manual mask modes, including a movable text mask.' },
  { tool: GEMINI_AI_LOGO_REMOVER_TOOL, runtime: 'mask', directoryGroup: 'watermarks', navigationHint: 'Circle · 4-Point Star', navigationLabel: 'Gemini Watermark Remover', summary: 'Focused local repair for a small visible sparkle mark.' },
  { tool: RESIZE_IMAGE_TOOL, runtime: 'deterministic', directoryGroup: 'everyday', navigationHint: 'Pixels · percentage · fit', summary: 'Resize by pixels, percentage, or fit-to-box with batch and individual settings.' },
  { tool: COMPRESS_IMAGE_TOOL, runtime: 'deterministic', directoryGroup: 'everyday', navigationHint: 'Format · quality', summary: 'Reduce image size with output-format and quality controls.' },
  { tool: ROTATE_FLIP_IMAGE_TOOL, runtime: 'deterministic', directoryGroup: 'everyday', navigationHint: 'Rotate · mirror', navigationLabel: 'Rotate / Flip', summary: 'Rotate or mirror one image or a batch locally.' },
  { tool: CROP_IMAGE_TOOL, runtime: 'deterministic', directoryGroup: 'everyday', navigationHint: 'Free · aspect ratios', summary: 'Drag Rectangle, Square, Circle or Triangle crops with common aspect-ratio presets.' },
  { tool: BLUR_IMAGE_TOOL, runtime: 'deterministic', directoryGroup: 'everyday', navigationHint: 'Whole image · region', summary: 'Blur the whole image or drag a Rectangle or Circle over a selected area.' },
  { tool: FADE_IMAGE_EDGES_TOOL, runtime: 'edge-fade', directoryGroup: 'preview', navigationHint: 'Subtitle-safe soft fades', summary: 'Fade blur naturally from one edge or all edges to create a subtitle-safe text area.' },
  { tool: BULK_RENAME_IMAGES_TOOL, runtime: 'rename', directoryGroup: 'cleanup', navigationHint: 'Patterns · numbering', summary: 'Rename a batch without changing image bytes or source extensions.' },
  { tool: REMOVE_IMAGE_METADATA_TOOL, runtime: 'metadata', directoryGroup: 'cleanup', navigationHint: 'EXIF · GPS · software', summary: 'Strip EXIF, GPS and software metadata locally.' },
] as const satisfies readonly ImageToolManifestEntry[];

export type RegisteredImageTool = (typeof IMAGE_TOOL_MANIFEST)[number];
export type RegisteredImageToolId = RegisteredImageTool['tool']['id'];

export function getImageToolManifest(id: string): RegisteredImageTool | undefined {
  return IMAGE_TOOL_MANIFEST.find((entry) => entry.tool.id === id);
}

/** Kept as a compatibility view for cards, navigation and existing SEO pages. */
export const IMAGE_TOOL_ROADMAP = IMAGE_TOOL_MANIFEST.map((entry) => ({
  id: entry.tool.id,
  label: ('navigationLabel' in entry ? entry.navigationLabel : undefined) ?? entry.tool.displayName,
  status: entry.tool.status,
  description: entry.summary,
  href: `/${entry.tool.slug}/`,
}));

export const IMAGE_TOOL_DIRECTORY_SECTIONS = [
  { id: 'everyday', filterLabel: 'Everyday', kicker: 'Resize, compress and compose', heading: 'Everyday image edits with one familiar batch workflow.', description: 'Use these tools to change dimensions, encoding, orientation, framing or blur. Start with a shared setup, then customize individual images.', white: false },
  { id: 'preview', filterLabel: 'Preview', kicker: 'Preview lab', heading: 'Try new image workflows before they move to Live.', description: 'Experimental image tools remain available for hands-on testing without being promoted into the main navigation.', white: true },
  { id: 'cleanup', filterLabel: 'Cleanup', kicker: 'File cleanup and organization', heading: 'Clean metadata or rename files without another upload step.', description: 'Remove image metadata by re-encoding locally, or rename source files without modifying the image bytes.', white: false },
  { id: 'watermarks', filterLabel: 'Watermarks', kicker: 'Watermarking and visible-pixel repair', heading: 'Add a watermark or repair a small visible mark.', description: 'Use a draggable text or logo watermark for branding, or choose a manual mask workflow for visible-pixel reconstruction.', white: true },
] as const satisfies readonly { id: ImageToolDirectoryGroup; filterLabel: string; kicker: string; heading: string; description: string; white: boolean }[];

export function imageToolIdsForGroup(group: ImageToolDirectoryGroup): RegisteredImageToolId[] {
  return IMAGE_TOOL_MANIFEST.filter((entry) => entry.directoryGroup === group).map((entry) => entry.tool.id);
}
