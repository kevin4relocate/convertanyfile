/// <reference lib="webworker" />

import type { RegionBlurRect, RegionBlurWorkerRequest, RegionBlurWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
const MAX_SOURCE_PIXELS = 12_000_000;
const MAX_REGION_PIXELS = 4_000_000;
const MAX_WORK_PIXELS = 6_000_000;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

function normalizedRect(rect: RegionBlurRect, width: number, height: number): RegionBlurRect {
  const x = clamp(Math.round(rect.x), 0, Math.max(0, width - 1));
  const y = clamp(Math.round(rect.y), 0, Math.max(0, height - 1));
  const right = clamp(Math.round(rect.x + rect.width), x + 1, width);
  const bottom = clamp(Math.round(rect.y + rect.height), y + 1, height);
  const normalized = { x, y, width: right - x, height: bottom - y };
  if (normalized.width * normalized.height > MAX_REGION_PIXELS) throw new Error('Selected blur region exceeds the 4 MP browser safety limit');
  return normalized;
}

function blurHorizontal(input: Uint8ClampedArray, output: Uint8ClampedArray, width: number, height: number, radius: number): void {
  const span = radius * 2 + 1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    const sums = [0, 0, 0, 0];
    for (let offset = -radius; offset <= radius; offset += 1) {
      const x = clamp(offset, 0, width - 1);
      const index = (row + x) * 4;
      sums[0] += input[index] ?? 0; sums[1] += input[index + 1] ?? 0; sums[2] += input[index + 2] ?? 0; sums[3] += input[index + 3] ?? 0;
    }
    for (let x = 0; x < width; x += 1) {
      const out = (row + x) * 4;
      output[out] = Math.round(sums[0] / span); output[out + 1] = Math.round(sums[1] / span); output[out + 2] = Math.round(sums[2] / span); output[out + 3] = Math.round(sums[3] / span);
      const removeX = clamp(x - radius, 0, width - 1);
      const addX = clamp(x + radius + 1, 0, width - 1);
      const remove = (row + removeX) * 4;
      const add = (row + addX) * 4;
      sums[0] += (input[add] ?? 0) - (input[remove] ?? 0);
      sums[1] += (input[add + 1] ?? 0) - (input[remove + 1] ?? 0);
      sums[2] += (input[add + 2] ?? 0) - (input[remove + 2] ?? 0);
      sums[3] += (input[add + 3] ?? 0) - (input[remove + 3] ?? 0);
    }
  }
}

function blurVertical(input: Uint8ClampedArray, output: Uint8ClampedArray, width: number, height: number, radius: number): void {
  const span = radius * 2 + 1;
  for (let x = 0; x < width; x += 1) {
    const sums = [0, 0, 0, 0];
    for (let offset = -radius; offset <= radius; offset += 1) {
      const y = clamp(offset, 0, height - 1);
      const index = (y * width + x) * 4;
      sums[0] += input[index] ?? 0; sums[1] += input[index + 1] ?? 0; sums[2] += input[index + 2] ?? 0; sums[3] += input[index + 3] ?? 0;
    }
    for (let y = 0; y < height; y += 1) {
      const out = (y * width + x) * 4;
      output[out] = Math.round(sums[0] / span); output[out + 1] = Math.round(sums[1] / span); output[out + 2] = Math.round(sums[2] / span); output[out + 3] = Math.round(sums[3] / span);
      const removeY = clamp(y - radius, 0, height - 1);
      const addY = clamp(y + radius + 1, 0, height - 1);
      const remove = (removeY * width + x) * 4;
      const add = (addY * width + x) * 4;
      sums[0] += (input[add] ?? 0) - (input[remove] ?? 0);
      sums[1] += (input[add + 1] ?? 0) - (input[remove + 1] ?? 0);
      sums[2] += (input[add + 2] ?? 0) - (input[remove + 2] ?? 0);
      sums[3] += (input[add + 3] ?? 0) - (input[remove + 3] ?? 0);
    }
  }
}

function blurRegion(request: RegionBlurWorkerRequest): { pixels: ArrayBuffer; affectedPixels: number } {
  const { width, height } = request;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > MAX_SOURCE_PIXELS) throw new Error('Selected-region blur supports source images up to 12 MP');
  const source = new Uint8ClampedArray(request.pixels);
  if (source.length !== width * height * 4) throw new Error('Unexpected image pixel buffer length');
  const rect = normalizedRect(request.rect, width, height);
  const strength = clamp(Number(request.strength) || 1, 1, 20);
  const radius = clamp(Math.round(strength * 0.75), 1, 16);
  const padding = radius * 3;
  const left = Math.max(0, rect.x - padding);
  const top = Math.max(0, rect.y - padding);
  const right = Math.min(width, rect.x + rect.width + padding);
  const bottom = Math.min(height, rect.y + rect.height + padding);
  const workWidth = right - left;
  const workHeight = bottom - top;
  if (workWidth * workHeight > MAX_WORK_PIXELS) throw new Error('Selected blur region needs too much browser memory; make the selection smaller');

  const workA = new Uint8ClampedArray(workWidth * workHeight * 4);
  const workB = new Uint8ClampedArray(workA.length);
  for (let y = 0; y < workHeight; y += 1) {
    const sourceStart = ((top + y) * width + left) * 4;
    workA.set(source.subarray(sourceStart, sourceStart + workWidth * 4), y * workWidth * 4);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    blurHorizontal(workA, workB, workWidth, workHeight, radius);
    blurVertical(workB, workA, workWidth, workHeight, radius);
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const radiusX = Math.max(0.5, rect.width / 2);
  const radiusY = Math.max(0.5, rect.height / 2);
  let affectedPixels = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (request.shape === 'ellipse') {
        const dx = (x + 0.5 - centerX) / radiusX;
        const dy = (y + 0.5 - centerY) / radiusY;
        if (dx * dx + dy * dy > 1) continue;
      }
      const sourceIndex = (y * width + x) * 4;
      const workIndex = ((y - top) * workWidth + (x - left)) * 4;
      source[sourceIndex] = workA[workIndex] ?? source[sourceIndex];
      source[sourceIndex + 1] = workA[workIndex + 1] ?? source[sourceIndex + 1];
      source[sourceIndex + 2] = workA[workIndex + 2] ?? source[sourceIndex + 2];
      source[sourceIndex + 3] = workA[workIndex + 3] ?? source[sourceIndex + 3];
      affectedPixels += 1;
    }
  }

  return { pixels: source.buffer, affectedPixels };
}

scope.addEventListener('message', (event: MessageEvent<RegionBlurWorkerRequest>) => {
  const request = event.data;
  try {
    const result = blurRegion(request);
    const response: RegionBlurWorkerResponse = { type: 'blur-region-result', requestId: request.requestId, ok: true, pixels: result.pixels, affectedPixels: result.affectedPixels };
    scope.postMessage(response, [result.pixels]);
  } catch (error) {
    const response: RegionBlurWorkerResponse = { type: 'blur-region-result', requestId: request.requestId, ok: false, error: error instanceof Error ? error.message : 'Unable to blur selected region' };
    scope.postMessage(response);
  }
});
