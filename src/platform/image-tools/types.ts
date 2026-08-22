export type ImageToolStatus = 'preview' | 'live' | 'planned';

export interface ImageToolDefinition {
  id: string;
  slug: string;
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
  | { type: 'rect'; rect: PixelRect }
  | { type: 'stroke'; erase: boolean; radius: number; points: PixelPoint[] };

export interface AutoSelection {
  rect: PixelRect;
  confidence: 'high' | 'medium' | 'low';
  score: number;
}
