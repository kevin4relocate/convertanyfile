export type ImageToolStatus = 'preview' | 'live' | 'planned';
export type ImageMaskMode = 'rect' | 'circle' | 'square' | 'diamond' | 'star4' | 'text';

export interface ImageToolDefinition {
  id: string;
  slug: string;
  displayName: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  status: ImageToolStatus;
  acceptedExtensions: readonly string[];
  acceptedMimeTypes: readonly string[];
  maxFileBytes: number;
  maxPixels: number;
  maxDimension: number;
  selectionModes: readonly ImageMaskMode[];
  defaultSelectionMode: ImageMaskMode;
  removeActionLabel: string;
  downloadSuffix: string;
  policyNote: string;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MaskOperation =
  | { type: 'rect'; rect: PixelRect; rotation?: number }
  | { type: 'ellipse'; rect: PixelRect; rotation?: number }
  | { type: 'diamond'; rect: PixelRect; rotation?: number }
  | { type: 'star4'; rect: PixelRect; rotation?: number }
  | { type: 'text'; rect: PixelRect; text: string; rotation?: number };
