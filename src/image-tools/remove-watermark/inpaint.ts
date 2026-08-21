import type { MaskOperation, PixelPoint, PixelRect } from '../../platform/image-tools/types';

function clamp(value: number, min: number, max: number): number { return Math.min(max, Math.max(min, value)); }

function setMaskPixel(mask: Uint8Array, width: number, height: number, x: number, y: number, value: 0 | 1): void {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return;
  mask[py * width + px] = value;
}

function paintCircle(mask: Uint8Array, width: number, height: number, center: PixelPoint, radius: number, value: 0 | 1): void {
  const r = Math.max(1, Math.round(radius));
  const minX = clamp(Math.floor(center.x - r), 0, width - 1);
  const maxX = clamp(Math.ceil(center.x + r), 0, width - 1);
  const minY = clamp(Math.floor(center.y - r), 0, height - 1);
  const maxY = clamp(Math.ceil(center.y + r), 0, height - 1);
  const r2 = r * r;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - center.x;
      const dy = y - center.y;
      if (dx * dx + dy * dy <= r2) setMaskPixel(mask, width, height, x, y, value);
    }
  }
}

function paintStroke(mask: Uint8Array, width: number, height: number, points: readonly PixelPoint[], radius: number, value: 0 | 1): void {
  if (!points.length) return;
  paintCircle(mask, width, height, points[0] ?? { x: 0, y: 0 }, radius, value);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    const distance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius * 0.45)));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      paintCircle(mask, width, height, { x: previous.x + (current.x - previous.x) * t, y: previous.y + (current.y - previous.y) * t }, radius, value);
    }
  }
}

function paintRect(mask: Uint8Array, width: number, height: number, rect: PixelRect, value: 0 | 1): void {
  const left = clamp(Math.floor(rect.x), 0, width - 1);
  const top = clamp(Math.floor(rect.y), 0, height - 1);
  const right = clamp(Math.ceil(rect.x + rect.width), left + 1, width);
  const bottom = clamp(Math.ceil(rect.y + rect.height), top + 1, height);
  for (let y = top; y < bottom; y += 1) mask.fill(value, y * width + left, y * width + right);
}

export function rasterizeMask(width: number, height: number, operations: readonly MaskOperation[]): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (const operation of operations) {
    if (operation.type === 'rect') paintRect(mask, width, height, operation.rect, 1);
    else paintStroke(mask, width, height, operation.points, operation.radius, operation.erase ? 0 : 1);
  }
  return mask;
}

function isKnownNeighbor(mask: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if ((mask[ny * width + nx] ?? 1) === 0) return true;
    }
  }
  return false;
}

function fillFromKnownNeighbors(rgba: Uint8ClampedArray, mask: Uint8Array, width: number, height: number, x: number, y: number): void {
  const radius = 5;
  let weightSum = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const pixelIndex = ny * width + nx;
      if ((mask[pixelIndex] ?? 1) !== 0) continue;
      const distance2 = dx * dx + dy * dy;
      const weight = 1 / (1 + distance2);
      const rgbaIndex = pixelIndex * 4;
      red += (rgba[rgbaIndex] ?? 0) * weight;
      green += (rgba[rgbaIndex + 1] ?? 0) * weight;
      blue += (rgba[rgbaIndex + 2] ?? 0) * weight;
      alpha += (rgba[rgbaIndex + 3] ?? 255) * weight;
      weightSum += weight;
    }
  }
  if (weightSum <= 0) return;
  const target = (y * width + x) * 4;
  rgba[target] = Math.round(red / weightSum);
  rgba[target + 1] = Math.round(green / weightSum);
  rgba[target + 2] = Math.round(blue / weightSum);
  rgba[target + 3] = Math.round(alpha / weightSum);
}

export function inpaintMaskedPixels(rgba: Uint8ClampedArray, width: number, height: number, operations: readonly MaskOperation[]): { pixels: Uint8ClampedArray; repairedPixels: number } {
  const mask = rasterizeMask(width, height, operations);
  let count = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      if ((mask[row + x] ?? 0) !== 1) continue;
      count += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (!count) throw new Error('Select the watermark area before removing it');
  if (count > width * height * 0.15) throw new Error('The selected mask is too large for the local repair tool. Select a smaller area.');

  const queue = new Int32Array(count);
  let queueHead = 0;
  let queueTail = 0;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const index = y * width + x;
      if ((mask[index] ?? 0) !== 1 || !isKnownNeighbor(mask, width, height, x, y)) continue;
      mask[index] = 2;
      queue[queueTail++] = index;
    }
  }

  while (queueHead < queueTail) {
    const index = queue[queueHead++] ?? 0;
    const x = index % width;
    const y = Math.floor(index / width);
    fillFromKnownNeighbors(rgba, mask, width, height, x, y);
    mask[index] = 0;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < minX || ny < minY || nx > maxX || ny > maxY) continue;
        const next = ny * width + nx;
        if ((mask[next] ?? 0) !== 1) continue;
        mask[next] = 2;
        if (queueTail < queue.length) queue[queueTail++] = next;
      }
    }
  }

  return { pixels: rgba, repairedPixels: count };
}
