import type { AutoSelection, MaskOperation } from '../../platform/image-tools/types';

export type RemoveWatermarkWorkerRequest =
  | { type: 'detect'; requestId: string; pixels: ArrayBuffer; width: number; height: number }
  | { type: 'inpaint'; requestId: string; pixels: ArrayBuffer; width: number; height: number; operations: MaskOperation[] };

export type RemoveWatermarkWorkerResponse =
  | { type: 'detect-result'; requestId: string; ok: true; selection: AutoSelection }
  | { type: 'detect-result'; requestId: string; ok: false; error: string }
  | { type: 'inpaint-result'; requestId: string; ok: true; pixels: ArrayBuffer; repairedPixels: number }
  | { type: 'inpaint-result'; requestId: string; ok: false; error: string };
