/// <reference lib="webworker" />
import { inpaintMaskedPixels } from './inpaint';
import type { RemoveWatermarkWorkerRequest, RemoveWatermarkWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<RemoveWatermarkWorkerRequest>) => {
  const request = event.data;
  try {
    const pixels = new Uint8ClampedArray(request.pixels);
    const result = inpaintMaskedPixels(pixels, request.width, request.height, request.operations);
    const output = result.pixels.buffer as ArrayBuffer;
    const response: RemoveWatermarkWorkerResponse = {
      type: 'inpaint-result',
      requestId: request.requestId,
      ok: true,
      pixels: output,
      repairedPixels: result.repairedPixels,
    };
    scope.postMessage(response, [output]);
  } catch (error) {
    const response: RemoveWatermarkWorkerResponse = {
      type: 'inpaint-result',
      requestId: request.requestId,
      ok: false,
      error: error instanceof Error ? error.message : String(error || 'Local image repair failed'),
    };
    scope.postMessage(response);
  }
});

export {};
