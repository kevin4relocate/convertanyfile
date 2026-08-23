export interface MaskProcessingOptions {
  paddingPx: number;
  featherPx: number;
}

let current: MaskProcessingOptions = { paddingPx: 0, featherPx: 0 };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function setMaskProcessingOptions(next: Partial<MaskProcessingOptions>): MaskProcessingOptions {
  current = {
    paddingPx: clamp(Number(next.paddingPx ?? current.paddingPx) || 0, 0, 64),
    featherPx: clamp(Number(next.featherPx ?? current.featherPx) || 0, 0, 32),
  };
  return { ...current };
}

export function getMaskProcessingOptions(): MaskProcessingOptions {
  return { ...current };
}

export function resetMaskProcessingOptions(): void {
  current = { paddingPx: 0, featherPx: 0 };
}
