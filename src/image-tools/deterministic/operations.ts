import type {
  BlurSettings,
  CropSettings,
  DeterministicSettings,
  DeterministicToolId,
  EdgeFadeSettings,
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
  if (settings.lockAspect) {
    const ratio = width / Math.max(1, height);
    if (settings.pixelAnchor === 'height') {
      const targetHeight = integer(settings.height, height);
      return { width: integer(targetHeight * ratio, width), height: targetHeight };
    }
    const targetWidth = integer(settings.width, width);
    return { width: targetWidth, height: integer(targetWidth / Math.max(1e-6, ratio), height) };
  }
  return { width: integer(settings.width, width), height: integer(settings.height, height) };
}

function cropRect(width: number, height: number, settings: CropSettings): { sx: number; sy: number; sw: number; sh: number } {
  let sw = clamp(settings.width, 1, 100) / 100 * width;
  let sh = clamp(settings.height, 1, 100) / 100 * height;
  let sx = clamp(settings.x, 0, 100) / 100 * width;
  let sy = clamp(settings.y, 0, 100) / 100 * height;
  const ratios: Record<Exclude<CropSettings['aspect'], 'free' | 'original'>, number> = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '9:16': 9 / 16 };
  const shapeRatio = settings.shape === 'square' || settings.shape === 'circle' ? 1 : null;
  const target = shapeRatio ?? (settings.aspect === 'free' ? null : settings.aspect === 'original' ? width / Math.max(1, height) : ratios[settings.aspect]);
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
  const regionWidth = clamp(settings.width, 1, 100) / 100 * canvas.width, regionHeight = clamp(settings.height, 1, 100) / 100 * canvas.height;
  const right = Math.min(canvas.width, x + regionWidth), bottom = Math.min(canvas.height, y + regionHeight);
  const clippedWidth = Math.max(1, right - x), clippedHeight = Math.max(1, bottom - y);
  context.save(); context.beginPath();
  if (settings.shape === 'circle') context.ellipse(x + clippedWidth / 2, y + clippedHeight / 2, clippedWidth / 2, clippedHeight / 2, 0, 0, Math.PI * 2);
  else context.rect(x, y, clippedWidth, clippedHeight);
  context.clip(); context.filter = `blur(${Math.max(0.5, radius)}px)`; context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); context.restore(); context.filter = 'none';
  return canvas;
}

function drawCrop(bitmap: ImageBitmap, settings: CropSettings, maxDimension?: number): HTMLCanvasElement {
  const crop = cropRect(bitmap.width, bitmap.height, settings), size = scaledSize(crop.sw, crop.sh, maxDimension);
  const { canvas, context } = canvas2d(size.width, size.height);
  if (settings.shape === 'circle' || settings.shape === 'triangle') {
    context.save(); context.beginPath();
    if (settings.shape === 'circle') context.ellipse(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2, 0, 0, Math.PI * 2);
    else { context.moveTo(canvas.width / 2, 0); context.lineTo(canvas.width, canvas.height); context.lineTo(0, canvas.height); context.closePath(); }
    context.clip();
    context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    context.restore(); return canvas;
  }
  context.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height); return canvas;
}

function edgeExtendedBlur(source: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const safeRadius = Math.max(0.5, radius);
  const pad = Math.max(2, Math.ceil(safeRadius * 2.2));
  const padded = canvas2d(source.width + pad * 2, source.height + pad * 2);
  const p = padded.context;
  p.drawImage(source, pad, pad);
  p.drawImage(source, 0, 0, 1, source.height, 0, pad, pad, source.height);
  p.drawImage(source, source.width - 1, 0, 1, source.height, pad + source.width, pad, pad, source.height);
  p.drawImage(source, 0, 0, source.width, 1, pad, 0, source.width, pad);
  p.drawImage(source, 0, source.height - 1, source.width, 1, pad, pad + source.height, source.width, pad);
  p.drawImage(source, 0, 0, 1, 1, 0, 0, pad, pad);
  p.drawImage(source, source.width - 1, 0, 1, 1, pad + source.width, 0, pad, pad);
  p.drawImage(source, 0, source.height - 1, 1, 1, 0, pad + source.height, pad, pad);
  p.drawImage(source, source.width - 1, source.height - 1, 1, 1, pad + source.width, pad + source.height, pad, pad);

  const blurred = canvas2d(padded.canvas.width, padded.canvas.height);
  blurred.context.filter = `blur(${safeRadius}px)`;
  blurred.context.drawImage(padded.canvas, 0, 0);
  blurred.context.filter = 'none';

  const result = canvas2d(source.width, source.height);
  result.context.drawImage(blurred.canvas, pad, pad, source.width, source.height, 0, 0, source.width, source.height);
  return result.canvas;
}

function organicWave(x: number, y: number): number {
  const a = Math.sin(x * 17.3 + y * 5.1 + 0.7);
  const b = Math.sin(x * 6.2 - y * 13.7 + 1.9);
  const c = Math.sin(x * 31.1 + y * 19.4 + 2.6);
  return a * 0.5 + b * 0.32 + c * 0.18;
}

function edgeDistance(direction: EdgeFadeSettings['direction'], x: number, y: number): number {
  if (direction === 'top') return y;
  if (direction === 'left') return x;
  if (direction === 'right') return 1 - x;
  if (direction === 'all') return Math.min(x, 1 - x, y, 1 - y);
  return 1 - y;
}

function edgeFadeMask(width: number, height: number, settings: EdgeFadeSettings): HTMLCanvasElement {
  const maskSize = scaledSize(width, height, 640);
  const { canvas, context } = canvas2d(maskSize.width, maskSize.height);
  const image = context.createImageData(canvas.width, canvas.height);
  const depth = clamp(settings.depth, 5, 100) / 100;
  const softness = clamp(settings.softness, 0, 100) / 100;
  const texture = settings.style === 'organic' ? clamp(settings.texture, 0, 60) / 100 : 0;
  // High softness should create a longer visible transition, not make the effect disappear.
  const exponent = 1.6 - softness * 0.9;

  for (let py = 0; py < canvas.height; py++) {
    const y = canvas.height <= 1 ? 0 : py / (canvas.height - 1);
    for (let px = 0; px < canvas.width; px++) {
      const x = canvas.width <= 1 ? 0 : px / (canvas.width - 1);
      const distance = edgeDistance(settings.direction, x, y);
      const wave = texture ? organicWave(x * 4.2, y * 4.2) * texture * depth * 0.16 : 0;
      const shiftedDistance = Math.max(0, distance - wave);
      let t = clamp((depth - shiftedDistance) / Math.max(0.001, depth), 0, 1);
      if (texture) t = clamp(t + organicWave(x * 8.1 + 1.4, y * 8.1 + 2.2) * texture * 0.04 * t * (1 - t), 0, 1);
      if (distance < Math.min(depth * 0.035, 0.02)) t = Math.max(t, 0.995);
      const alpha = Math.round(Math.pow(t, exponent) * 255);
      const offset = (py * canvas.width + px) * 4;
      image.data[offset] = 255;
      image.data[offset + 1] = 255;
      image.data[offset + 2] = 255;
      image.data[offset + 3] = alpha;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function drawEdgeFade(bitmap: ImageBitmap, settings: EdgeFadeSettings, maxDimension?: number): HTMLCanvasElement {
  const size = scaledSize(bitmap.width, bitmap.height, maxDimension);
  const original = canvas2d(size.width, size.height);
  original.context.drawImage(bitmap, 0, 0, original.canvas.width, original.canvas.height);

  const scaledRadius = Math.max(0.5, clamp(settings.radius, 0, 180) * size.scale);
  const blurred = scaledRadius > 0.5 ? edgeExtendedBlur(original.canvas, scaledRadius) : original.canvas;
  const mask = edgeFadeMask(original.canvas.width, original.canvas.height, settings);
  const contrast = clamp(settings.contrast, 0, 100);
  const wash = clamp(settings.wash, 0, 100) / 100;

  const effect = canvas2d(original.canvas.width, original.canvas.height);
  const contrastPercent = Math.round(100 - contrast * 0.55);
  const saturationPercent = Math.round(100 - contrast * 0.18);
  const brightnessPercent = settings.washColor === 'light'
    ? Math.round(100 + contrast * 0.10)
    : Math.round(100 - contrast * 0.05);
  effect.context.filter = `contrast(${contrastPercent}%) saturate(${saturationPercent}%) brightness(${brightnessPercent}%)`;
  effect.context.drawImage(blurred, 0, 0);
  effect.context.filter = 'none';

  if (wash > 0) {
    effect.context.save();
    effect.context.globalAlpha = wash;
    effect.context.fillStyle = settings.washColor === 'light' ? '#ffffff' : '#000000';
    effect.context.fillRect(0, 0, effect.canvas.width, effect.canvas.height);
    effect.context.restore();
  }

  effect.context.globalCompositeOperation = 'destination-in';
  effect.context.imageSmoothingEnabled = true;
  effect.context.drawImage(mask, 0, 0, mask.width, mask.height, 0, 0, effect.canvas.width, effect.canvas.height);
  effect.context.globalCompositeOperation = 'source-over';

  original.context.drawImage(effect.canvas, 0, 0);
  return original.canvas;
}

export function renderToolCanvas(bitmap: ImageBitmap, toolId: DeterministicToolId, settings: DeterministicSettings, maxDimension?: number): HTMLCanvasElement {
  if (toolId === 'resize-image') {
    const dimensions = resizeDimensions(bitmap.width, bitmap.height, settings as ResizeSettings), size = scaledSize(dimensions.width, dimensions.height, maxDimension);
    const { canvas, context } = canvas2d(size.width, size.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); return canvas;
  }
  if (toolId === 'rotate-flip-image') return drawRotateFlip(bitmap, settings as RotateFlipSettings, maxDimension);
  if (toolId === 'crop-image') return drawCrop(bitmap, settings as CropSettings, maxDimension);
  if (toolId === 'blur-image') return drawBlur(bitmap, settings as BlurSettings, maxDimension);
  if (toolId === 'fade-image-edges') return drawEdgeFade(bitmap, settings as EdgeFadeSettings, maxDimension);
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
