import type { MaskOperation } from '../../platform/image-tools/types';

export type RemoveWatermarkWorkerRequest = {
  type: 'inpaint';
  requestId: string;
  pixels: ArrayBuffer;
  width: number;
  height: number;
  operations: MaskOperation[];
  maxRepairRatio?: number;
};

export type RemoveWatermarkWorkerResponse =
  | { type: 'inpaint-result'; requestId: string; ok: true; pixels: ArrayBuffer; repairedPixels: number }
  | { type: 'inpaint-result'; requestId: string; ok: false; error: string };
