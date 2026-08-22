import type { AutoSelection, PixelRect } from '../../platform/image-tools/types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function percentile(values: number[], ratio: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
}

function fallbackRect(width: number, height: number): PixelRect {
  const marginX = Math.max(6, Math.round(width * 0.018));
  const marginY = Math.max(6, Math.round(height * 0.018));
  const boxWidth = Math.max(28, Math.round(width * 0.19));
  const boxHeight = Math.max(24, Math.round(height * 0.14));
  return {
    x: Math.max(0, width - boxWidth - marginX),
    y: Math.max(0, height - boxHeight - marginY),
    width: Math.min(boxWidth, width),
    height: Math.min(boxHeight, height),
  };
}

export function detectBottomRightMark(rgba: Uint8ClampedArray, width: number, height: number): AutoSelection {
  if (width < 24 || height < 24 || rgba.length < width * height * 4) {
    return { rect: fallbackRect(width, height), confidence: 'low', score: 0 };
  }

  const roiX = Math.floor(width * 0.54);
  const roiY = Math.floor(height * 0.54);
  const roiWidth = Math.max(1, width - roiX);
  const roiHeight = Math.max(1, height - roiY);
  const cellSize = Math.max(4, Math.round(Math.min(width, height) / 95));
  const cols = Math.max(1, Math.ceil(roiWidth / cellSize));
  const rows = Math.max(1, Math.ceil(roiHeight / cellSize));
  const scores = new Float32Array(cols * rows);
  const scoreList: number[] = [];

  const luminance = (x: number, y: number): number => {
    const index = (y * width + x) * 4;
    const r = rgba[index] ?? 0;
    const g = rgba[index + 1] ?? 0;
    const b = rgba[index + 2] ?? 0;
    return r * 0.299 + g * 0.587 + b * 0.114;
  };

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const startX = roiX + col * cellSize;
      const startY = roiY + row * cellSize;
      const endX = Math.min(width - 1, startX + cellSize);
      const endY = Math.min(height - 1, startY + cellSize);
      let total = 0;
      let samples = 0;
      for (let y = Math.max(1, startY); y < endY; y += 2) {
        for (let x = Math.max(1, startX); x < endX; x += 2) {
          const center = luminance(x, y);
          const gradient = Math.abs(center - luminance(x - 1, y)) + Math.abs(center - luminance(x, y - 1));
          total += gradient;
          samples += 1;
        }
      }
      const score = samples ? total / samples : 0;
      const gridIndex = row * cols + col;
      scores[gridIndex] = score;
      scoreList.push(score);
    }
  }

  const threshold = Math.max(14, percentile(scoreList, 0.8) * 1.08);
  const hot = new Uint8Array(cols * rows);
  for (let index = 0; index < hot.length; index += 1) {
    if ((scores[index] ?? 0) >= threshold) hot[index] = 1;
  }

  const visited = new Uint8Array(hot.length);
  let best: { minCol: number; maxCol: number; minRow: number; maxRow: number; cells: number; mean: number; score: number } | undefined;
  const neighbors = [-1, 0, 1] as const;

  for (let start = 0; start < hot.length; start += 1) {
    if (hot[start] !== 1 || visited[start] === 1) continue;
    const queue: number[] = [start];
    visited[start] = 1;
    let head = 0;
    let minCol = cols;
    let maxCol = 0;
    let minRow = rows;
    let maxRow = 0;
    let cells = 0;
    let sum = 0;

    while (head < queue.length) {
      const index = queue[head++] ?? 0;
      const row = Math.floor(index / cols);
      const col = index % cols;
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      cells += 1;
      sum += scores[index] ?? 0;

      for (const dy of neighbors) {
        for (const dx of neighbors) {
          if (dx === 0 && dy === 0) continue;
          const nextCol = col + dx;
          const nextRow = row + dy;
          if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) continue;
          const next = nextRow * cols + nextCol;
          if (hot[next] !== 1 || visited[next] === 1) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
    }

    const componentWidth = (maxCol - minCol + 1) * cellSize;
    const componentHeight = (maxRow - minRow + 1) * cellSize;
    if (componentWidth > roiWidth * 0.58 || componentHeight > roiHeight * 0.5) continue;

    const centerX = roiX + ((minCol + maxCol + 1) * cellSize) / 2;
    const centerY = roiY + ((minRow + maxRow + 1) * cellSize) / 2;
    const distance = Math.hypot(width - centerX, height - centerY);
    const maxDistance = Math.max(1, Math.hypot(roiWidth, roiHeight));
    const proximity = 1 - clamp(distance / maxDistance, 0, 1);
    const mean = sum / Math.max(1, cells);
    const edgeStrength = clamp(mean / 90, 0, 1);
    const areaScore = clamp(cells / 10, 0, 1);
    const componentScore = proximity * 0.48 + edgeStrength * 0.36 + areaScore * 0.16;

    if (!best || componentScore > best.score) best = { minCol, maxCol, minRow, maxRow, cells, mean, score: componentScore };
  }

  if (!best || best.score < 0.3) return { rect: fallbackRect(width, height), confidence: 'low', score: best?.score ?? 0 };

  const padding = Math.max(5, Math.round(cellSize * 2.3));
  const left = clamp(roiX + best.minCol * cellSize - padding, 0, width - 1);
  const top = clamp(roiY + best.minRow * cellSize - padding, 0, height - 1);
  const right = clamp(roiX + (best.maxCol + 1) * cellSize + padding, left + 1, width);
  const bottom = clamp(roiY + (best.maxRow + 1) * cellSize + padding, top + 1, height);
  const confidence = best.score >= 0.58 ? 'high' : best.score >= 0.42 ? 'medium' : 'low';
  return { rect: { x: left, y: top, width: right - left, height: bottom - top }, confidence, score: best.score };
}
