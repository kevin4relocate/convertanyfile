import type {
  BlurSettings,
  CropSettings,
  DeterministicSettings,
  DeterministicToolId,
  ResizeSettings,
  RotateFlipSettings,
} from './types';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const integer = (value: number, fallback = 1): number => Math.max(1, Math.round(Number.isFinite(value) ? value : fallback));

export function resizeDimensions(width: number, height: number, settings: ResizeSettings): { width: number; height: number } {
  if (settings.mode === 'percent') {
    const factor = clamp(settings.percent, 1, 1000) / 100;
    return { width: integer(width * factor), height: integer(height * factor) };
  }
  if (settings.mode === 'fit') {
    const factor = Math.min(integer(settings.fitWidth, width) / Math.max(1, width), integer(settings.fitHeight, height) / Math.max(1, height));
    return { width: integer(width * factor), height: integer(height * factor) };
  }
  return { width: integer(settings.width, width), height: integer(settings.height, height) };
}

function cropRect(width: number, height: number, settings: CropSettings): { sx: number; sy: number; sw: number; sh: number } {
  let sw = clamp(settings.width, 1, 100) / 100 * width;
  let sh = clamp(settings.height, 1, 100) / 100 * height;
  let sx = clamp(settings.x, 0, 100) / 100 * width;
  let sy = clamp(settings.y, 0, 100) / 100 * height;
  const ratios: Record<Exclude<CropSettings['aspect'], 'free' | 'original'>, number> = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 };
  const target = settings.aspect === 'free' ? null : settings.aspect === 'original' ? width / Math.max(1, height) : ratios[settings.aspect];
  if (target) {
    const current = sw / Math.max(1, sh);
    if (current > target) { const next = sh * target; sx += (sw - next) / 2; sw = next; }
    else { const next = sw / target; sy += (sh - next) / 2; sh = next; }
  }
  sw = Math.min(sw, width); sh = Math.min(sh, height);
  sx = clamp(sx, 0, Math.max(0, width - sw)); sy = clamp(sy, 0, Math.max(0, height - sh));
  return { sx, sy, sw: Math.max(1, sw), sh: Math.max(1, sh) };
}

function scaledSize(width: number, height: number, maxDimension?: number): { width: number; height: number; scale: number } {
  if (!maxDimension || Math.max(width, height) <= maxDimension) return { width: integer(width), height: integer(height), scale: 1 };
  const scale = maxDimension / Math.max(width, height);
  return { width: integer(width * scale), height: integer(height * scale), scale };
}

function canvas2d(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas'); canvas.width = integer(width); canvas.height = integer(height);
  const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

function drawRotateFlip(bitmap: ImageBitmap, settings: RotateFlipSettings, maxDimension?: number): HTMLCanvasElement {
  const rotated = settings.rotation === 90 || settings.rotation === 270;
  const fullWidth = rotated ? bitmap.height : bitmap.width, fullHeight = rotated ? bitmap.width : bitmap.height;
  const size = scaledSize(fullWidth, fullHeight, maxDimension), { canvas, context } = canvas2d(size.width, size.height), sourceScale = size.scale;
  context.translate(canvas.width / 2, canvas.height / 2); context.rotate(settings.rotation * Math.PI / 180);
  context.scale(settings.flipHorizontal ? -1 : 1, settings.flipVertical ? -1 : 1);
  context.drawImage(bitmap, -bitmap.width * sourceScale / 2, -bitmap.height * sourceScale / 2, bitmap.width * sourceScale, bitmap.height * sourceScale);
  return canvas;
}

function drawBlur(bitmap: ImageBitmap, settings: BlurSettings, maxDimension?: number): HTMLCanvasElement {
  const size = scaledSize(bitmap.width, bitmap.height, maxDimension), { canvas, context } = canvas2d(size.width, size.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const radius = clamp(settings.radius, 1, 100) * size.scale;
  if (settings.scope === 'whole') {
    context.clearRect(0, 0, canvas.width, canvas.height); context.filter = `blur(${Math.max(0.5, radius)}px)`;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); context.filter = 'none'; return canvas;
  }
  const x = clamp(settings.x, 0, 100) / 100 * canvas.width, y = clamp(settings.y, 0, 100) / 100 * canvas.height;
  const width = clamp(settings.width, 1, 100) / 100 * canvas.width, height = clamp(settings.height, 1, 100) / 100 * canvas.height;
  const right = Math.min(canvas.width, x + width), bottom = Math.min(canvas.height, y + height);
  context.save(); context.beginPath(); context.rect(x, y, Math.max(1, right - x), Math.max(1, bottom - y)); context.clip();
  context.filter = `blur(${Math.max(0.5, radius)}px)`; context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); context.restore(); context.filter = 'none';
  return canvas;
}

export function renderToolCanvas(bitmap: ImageBitmap, toolId: DeterministicToolId, settings: DeterministicSettings, maxDimension?: number): HTMLCanvasElement {
  if (toolId === 'resize-image') {
    const dimensions = resizeDimensions(bitmap.width, bitmap.height, settings as ResizeSettings), size = scaledSize(dimensions.width, dimensions.height, maxDimension);
    const { canvas, context } = canvas2d(size.width, size.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); return canvas;
  }
  if (toolId === 'rotate-flip-image') return drawRotateFlip(bitmap, settings as RotateFlipSettings, maxDimension);
  if (toolId === 'crop-image') {
    const crop = cropRect(bitmap.width, bitmap.height, settings as CropSettings), size = scaledSize(crop.sw, crop.sh, maxDimension);
    const { canvas, context } = canvas2d(size.width, size.height); context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height); return canvas;
  }
  if (toolId === 'blur-image') return drawBlur(bitmap, settings as BlurSettings, maxDimension);
  // Compress and metadata removal both intentionally re-render decoded pixels.
  // Canvas encoding drops EXIF/GPS/software metadata while preserving visible pixels.
  const size = scaledSize(bitmap.width, bitmap.height, maxDimension), { canvas, context } = canvas2d(size.width, size.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); return canvas;
}

export function sourceMime(file: File): 'image/png' | 'image/jpeg' | 'image/webp' {
  if (file.type === 'image/jpeg') return 'image/jpeg';
  if (file.type === 'image/webp') return 'image/webp';
  if (file.type === 'image/png') return 'image/png';
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

export function sourceExtension(file: File): 'png' | 'jpg' | 'webp' {
  const mime = sourceMime(file); return mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
}
