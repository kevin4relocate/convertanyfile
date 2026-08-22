export type RegionBlurShape = 'rect' | 'ellipse';

export interface RegionBlurRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RegionBlurWorkerRequest = {
  type: 'blur-region';
  requestId: string;
  pixels: ArrayBuffer;
  width: number;
  height: number;
  rect: RegionBlurRect;
  shape: RegionBlurShape;
  strength: number;
};

export type RegionBlurWorkerResponse =
  | { type: 'blur-region-result'; requestId: string; ok: true; pixels: ArrayBuffer; affectedPixels: number }
  | { type: 'blur-region-result'; requestId: string; ok: false; error: string };
