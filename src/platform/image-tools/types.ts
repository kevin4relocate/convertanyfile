export type ImageToolStatus = 'preview' | 'live' | 'planned';
export type ImageToolCategory = 'transform' | 'encode' | 'geometry' | 'mask' | 'metadata' | 'naming' | 'segmentation';
export type ImageEditScope = 'shared' | 'individual';
export type ImageToolOutputKind = 'image' | 'zip' | 'metadata' | 'filename';
export type ImageMaskMode = 'rect' | 'circle' | 'square' | 'diamond' | 'star4' | 'text';

export interface ImageToolCapabilities {
  supportsBatch: boolean;
  supportsSharedSettings: boolean;
  supportsIndividualSettings: boolean;
  supportsPreview?: boolean;
  supportsOutputFormat?: boolean;
}

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
  maxFiles?: number;
  category?: ImageToolCategory;
  capabilities?: ImageToolCapabilities;
  outputKind?: ImageToolOutputKind;
  selectionModes: readonly ImageMaskMode[];
  defaultSelectionMode: ImageMaskMode;
  removeActionLabel: string;
  downloadSuffix: string;
  policyNote: string;
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
