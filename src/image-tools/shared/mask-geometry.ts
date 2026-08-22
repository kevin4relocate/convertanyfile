import type { ImageMaskMode, MaskOperation, PixelRect } from '../../platform/image-tools/types';

export type Mode = ImageMaskMode;
export type Op =
  | { type: 'rect' | 'ellipse' | 'square' | 'diamond' | 'star4'; rect: PixelRect; rotation: number }
  | { type: 'text'; rect: PixelRect; text: string; rotation: number };
export type Point = { x: number; y: number };
export type P = Point;
export type Handle = 'nw' | 'ne' | 'se' | 'sw';

export const DEFAULT_TEXT_RECT: PixelRect = { x: 0.42, y: 0.42, width: 0.16, height: 0.16 };
export const TEXT_RECT = DEFAULT_TEXT_RECT;

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeRotation(value: number): number {
  let angle = value % 360;
  if (angle > 180) angle -= 360;
  if (angle <= -180) angle += 360;
  return angle;
}

export function cloneRect(rect: PixelRect): PixelRect { return { ...rect }; }
export const rectCopy = cloneRect;

export function cloneOp(operation: Op): Op {
  return operation.type === 'text'
    ? { type: 'text', rect: cloneRect(operation.rect), text: operation.text, rotation: operation.rotation }
    : { type: operation.type, rect: cloneRect(operation.rect), rotation: operation.rotation };
}
export function cloneOps(operations: readonly Op[]): Op[] { return operations.map(cloneOp); }
export const opsCopy = cloneOps;
export function cloneHistory(history: readonly Op[][]): Op[][] { return history.map(cloneOps); }
export const histCopy = cloneHistory;

export function sameOps(left: readonly Op[], right: readonly Op[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((operation, index) => {
    const other = right[index];
    if (!other || operation.type !== other.type) return false;
    const a = operation.rect;
    const b = other.rect;
    const sameRect = Math.abs(a.x - b.x) < 1e-5
      && Math.abs(a.y - b.y) < 1e-5
      && Math.abs(a.width - b.width) < 1e-5
      && Math.abs(a.height - b.height) < 1e-5;
    if (!sameRect || Math.abs(normalizeRotation(operation.rotation - other.rotation)) > 1e-4) return false;
    return operation.type !== 'text' || (other.type === 'text' && operation.text === other.text);
  });
}

export function normalizeRect(start: Point, end: Point): PixelRect {
  const left = clamp(Math.min(start.x, end.x));
  const top = clamp(Math.min(start.y, end.y));
  const right = clamp(Math.max(start.x, end.x));
  const bottom = clamp(Math.max(start.y, end.y));
  return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}
export const normalize = normalizeRect;

export function isConstrainedMode(mode: Mode | Op['type']): boolean {
  return mode === 'circle' || mode === 'ellipse' || mode === 'square' || mode === 'diamond' || mode === 'star4';
}
export const squareLike = isConstrainedMode;

export function constrainedRect(start: Point, end: Point, width: number, height: number): PixelRect {
  const startX = start.x * width;
  const startY = start.y * height;
  const endX = end.x * width;
  const endY = end.y * height;
  const directionX = endX >= startX ? 1 : -1;
  const directionY = endY >= startY ? 1 : -1;
  let size = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  size = Math.min(size, directionX > 0 ? width - startX : startX, directionY > 0 ? height - startY : startY);
  return normalizeRect(start, { x: (startX + directionX * size) / width, y: (startY + directionY * size) / height });
}
export const squareRect = constrainedRect;

export function createOp(mode: Mode, rect: PixelRect, text = ''): Op {
  if (mode === 'circle') return { type: 'ellipse', rect, rotation: 0 };
  if (mode === 'square') return { type: 'square', rect, rotation: 0 };
  if (mode === 'diamond') return { type: 'diamond', rect, rotation: 0 };
  if (mode === 'star4') return { type: 'star4', rect, rotation: 0 };
  if (mode === 'text') return { type: 'text', rect, text: text.trim(), rotation: 0 };
  return { type: 'rect', rect, rotation: 0 };
}
export const makeOp = createOp;

export function toWorkerOps(operations: readonly Op[], width: number, height: number): MaskOperation[] {
  return operations.map((operation) => {
    const rect = {
      x: operation.rect.x * width,
      y: operation.rect.y * height,
      width: operation.rect.width * width,
      height: operation.rect.height * height,
    };
    if (operation.type === 'text') return { type: 'text', rect, text: operation.text, rotation: operation.rotation };
    if (operation.type === 'square') return { type: 'rect', rect, rotation: operation.rotation };
    return { type: operation.type, rect, rotation: operation.rotation };
  });
}
export const workerOps = toWorkerOps;

export function rotatePointPx(point: Point, center: Point, degrees: number): Point {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

export function operationCenterPx(operation: Pick<Op, 'rect'>, width: number, height: number): Point {
  return { x: (operation.rect.x + operation.rect.width / 2) * width, y: (operation.rect.y + operation.rect.height / 2) * height };
}

export function operationCornersPx(operation: Pick<Op, 'rect' | 'rotation'>, width: number, height: number): Record<Handle, Point> {
  const rect = operation.rect;
  const center = operationCenterPx(operation, width, height);
  const corners: Record<Handle, Point> = {
    nw: { x: rect.x * width, y: rect.y * height },
    ne: { x: (rect.x + rect.width) * width, y: rect.y * height },
    se: { x: (rect.x + rect.width) * width, y: (rect.y + rect.height) * height },
    sw: { x: rect.x * width, y: (rect.y + rect.height) * height },
  };
  for (const handle of Object.keys(corners) as Handle[]) corners[handle] = rotatePointPx(corners[handle], center, operation.rotation);
  return corners;
}

export function rotationHandlePx(operation: Pick<Op, 'rect' | 'rotation'>, width: number, height: number, offset = 28): Point {
  const center = operationCenterPx(operation, width, height);
  const top = rotatePointPx({ x: center.x, y: operation.rect.y * height }, center, operation.rotation);
  const bottom = rotatePointPx({ x: center.x, y: (operation.rect.y + operation.rect.height) * height }, center, operation.rotation);
  const extend = (anchor: Point, distance: number): Point => {
    const vx = anchor.x - center.x;
    const vy = anchor.y - center.y;
    const length = Math.max(1, Math.hypot(vx, vy));
    return { x: anchor.x + vx / length * distance, y: anchor.y + vy / length * distance };
  };
  const topCandidate = extend(top, 28);
  const margin = 9;
  const topFits = topCandidate.x >= margin && topCandidate.x <= width - margin && topCandidate.y >= margin && topCandidate.y <= height - margin;
  return extend(topFits ? top : bottom, offset);
}

export function localPointPx(point: Point, operation: Pick<Op, 'rect' | 'rotation'>, width: number, height: number): Point {
  const center = operationCenterPx(operation, width, height);
  return rotatePointPx({ x: point.x * width, y: point.y * height }, center, -operation.rotation);
}

export function pointHitsOperation(point: Point, operation: Op, width = 1, height = 1): boolean {
  const local = localPointPx(point, operation, width, height);
  const left = operation.rect.x * width;
  const top = operation.rect.y * height;
  const rectWidth = operation.rect.width * width;
  const rectHeight = operation.rect.height * height;
  if (local.x < left || local.x > left + rectWidth || local.y < top || local.y > top + rectHeight) return false;
  if (operation.type === 'ellipse') {
    const rx = Math.max(1e-5, rectWidth / 2);
    const ry = Math.max(1e-5, rectHeight / 2);
    const nx = (local.x - left - rx) / rx;
    const ny = (local.y - top - ry) / ry;
    return nx * nx + ny * ny <= 1.08;
  }
  if (operation.type === 'diamond') {
    const rx = Math.max(1e-5, rectWidth / 2);
    const ry = Math.max(1e-5, rectHeight / 2);
    return Math.abs((local.x - left - rx) / rx) + Math.abs((local.y - top - ry) / ry) <= 1.1;
  }
  return true;
}
export const hit = pointHitsOperation;

export function starPath(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, rect: PixelRect): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;
  const innerX = rx * 0.2;
  const innerY = ry * 0.2;
  context.beginPath();
  context.moveTo(cx, cy - ry);
  context.quadraticCurveTo(cx + innerX * 0.18, cy - ry * 0.46, cx + innerX, cy - innerY);
  context.quadraticCurveTo(cx + rx * 0.46, cy - innerY * 0.18, cx + rx, cy);
  context.quadraticCurveTo(cx + rx * 0.46, cy + innerY * 0.18, cx + innerX, cy + innerY);
  context.quadraticCurveTo(cx + innerX * 0.18, cy + ry * 0.46, cx, cy + ry);
  context.quadraticCurveTo(cx - innerX * 0.18, cy + ry * 0.46, cx - innerX, cy + innerY);
  context.quadraticCurveTo(cx - rx * 0.46, cy + innerY * 0.18, cx - rx, cy);
  context.quadraticCurveTo(cx - rx * 0.46, cy - innerY * 0.18, cx - innerX, cy - innerY);
  context.quadraticCurveTo(cx - innerX * 0.18, cy - ry * 0.46, cx, cy - ry);
  context.closePath();
}

export function diamondPath(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, rect: PixelRect): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  context.beginPath();
  context.moveTo(cx, rect.y);
  context.lineTo(rect.x + rect.width, cy);
  context.lineTo(cx, rect.y + rect.height);
  context.lineTo(rect.x, cy);
  context.closePath();
}

export function drawTextMask(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, rect: PixelRect, text: string): void {
  const clean = text.trim();
  if (!clean) return;
  context.save();
  let fontSize = Math.max(6, rect.height * 0.76);
  context.font = `900 ${fontSize}px sans-serif`;
  const maxWidth = Math.max(1, rect.width * 0.92);
  const measured = Math.max(1, context.measureText(clean).width);
  if (measured > maxWidth) {
    fontSize = Math.max(6, fontSize * maxWidth / measured);
    context.font = `900 ${fontSize}px sans-serif`;
  }
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.lineWidth = Math.max(2, fontSize * 0.18);
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  context.strokeText(clean, x, y);
  context.fillText(clean, x, y);
  context.restore();
}
export const drawText = drawTextMask;

export function cornerPoint(rect: PixelRect, handle: Handle): Point {
  if (handle === 'nw') return { x: rect.x, y: rect.y };
  if (handle === 'ne') return { x: rect.x + rect.width, y: rect.y };
  if (handle === 'se') return { x: rect.x + rect.width, y: rect.y + rect.height };
  return { x: rect.x, y: rect.y + rect.height };
}
export const corner = cornerPoint;

export function moveRect(rect: PixelRect, dx: number, dy: number): PixelRect {
  return { x: Math.min(1 - rect.width, Math.max(0, rect.x + dx)), y: Math.min(1 - rect.height, Math.max(0, rect.y + dy)), width: rect.width, height: rect.height };
}

export function moveRotatedRect(rect: PixelRect, rotation: number, dx: number, dy: number, width: number, height: number): PixelRect {
  const w = rect.width * width;
  const h = rect.height * height;
  const radians = rotation * Math.PI / 180;
  const halfX = Math.abs(w / 2 * Math.cos(radians)) + Math.abs(h / 2 * Math.sin(radians));
  const halfY = Math.abs(w / 2 * Math.sin(radians)) + Math.abs(h / 2 * Math.cos(radians));
  const cx = clamp((rect.x + rect.width / 2 + dx) * width, halfX, Math.max(halfX, width - halfX));
  const cy = clamp((rect.y + rect.height / 2 + dy) * height, halfY, Math.max(halfY, height - halfY));
  return { x: cx / width - rect.width / 2, y: cy / height - rect.height / 2, width: rect.width, height: rect.height };
}

export function resizeRect(rect: PixelRect, handle: Handle, point: Point, width: number, height: number, constrained: boolean): PixelRect {
  const fixed = handle === 'nw'
    ? { x: rect.x + rect.width, y: rect.y + rect.height }
    : handle === 'ne'
      ? { x: rect.x, y: rect.y + rect.height }
      : handle === 'se'
        ? { x: rect.x, y: rect.y }
        : { x: rect.x + rect.width, y: rect.y };
  if (constrained) return constrainedRect(fixed, point, width, height);
  const left = rect.x, top = rect.y, right = rect.x + rect.width, bottom = rect.y + rect.height;
  const minWidth = 6 / width, minHeight = 6 / height;
  if (handle === 'nw') { const x = Math.min(right - minWidth, clamp(point.x)); const y = Math.min(bottom - minHeight, clamp(point.y)); return { x, y, width: right - x, height: bottom - y }; }
  if (handle === 'ne') { const newRight = Math.max(left + minWidth, clamp(point.x)); const y = Math.min(bottom - minHeight, clamp(point.y)); return { x: left, y, width: newRight - left, height: bottom - y }; }
  if (handle === 'se') { const newRight = Math.max(left + minWidth, clamp(point.x)); const newBottom = Math.max(top + minHeight, clamp(point.y)); return { x: left, y: top, width: newRight - left, height: newBottom - top }; }
  const x = Math.min(right - minWidth, clamp(point.x)); const newBottom = Math.max(top + minHeight, clamp(point.y)); return { x, y: top, width: right - x, height: newBottom - top };
}
