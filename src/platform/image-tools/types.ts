export type ImageToolStatus = 'live' | 'preview' | 'planned';
export type ImageToolCategory = 'transform' | 'encode' | 'geometry' | 'mask' | 'metadata' | 'naming' | 'watermark';
export type ImageEditScope = 'shared' | 'individual';
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
  category: ImageToolCategory;
  acceptedExtensions: readonly string[];
  acceptedMimeTypes: readonly string[];
  maxFileBytes: number;
  maxPixels: number;
  maxDimension: number;
  maxFiles?: number;
  downloadSuffix: string;
  policyNote: string;
}

export interface MaskImageToolDefinition extends ImageToolDefinition {
  category: 'mask';
  selectionModes: readonly ImageMaskMode[];
  defaultSelectionMode: ImageMaskMode;
  removeActionLabel: string;
}

export interface PixelPoint { x: number; y: number; }
export interface PixelRect { x: number; y: number; width: number; height: number; }

type MaskEffects = { rotation?: number; feather?: number };
export type MaskOperation =
  | ({ type: 'rect'; rect: PixelRect } & MaskEffects)
  | ({ type: 'ellipse'; rect: PixelRect } & MaskEffects)
  | ({ type: 'diamond'; rect: PixelRect } & MaskEffects)
  | ({ type: 'star4'; rect: PixelRect } & MaskEffects)
  | ({ type: 'text'; rect: PixelRect; text: string } & MaskEffects);
