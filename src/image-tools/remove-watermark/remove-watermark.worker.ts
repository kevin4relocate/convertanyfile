/// <reference lib="webworker" />
import { detectBottomRightMark } from './detect';
import { inpaintMaskedPixels } from './inpaint';
import type { RemoveWatermarkWorkerRequest, RemoveWatermarkWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<RemoveWatermarkWorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'detect') {
      const pixels = new Uint8ClampedArray(request.pixels);
      const selection = detectBottomRightMark(pixels, request.width, request.height);
      const response: RemoveWatermarkWorkerResponse = { type: 'detect-result', requestId: request.requestId, ok: true, selection };
      scope.postMessage(response);
      return;
    }

    const pixels = new Uint8ClampedArray(request.pixels);
    const result = inpaintMaskedPixels(pixels, request.width, request.height, request.operations);
    const output = result.pixels.buffer as ArrayBuffer;
    const response: RemoveWatermarkWorkerResponse = { type: 'inpaint-result', requestId: request.requestId, ok: true, pixels: output, repairedPixels: result.repairedPixels };
    scope.postMessage(response, [output]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Local image repair failed');
    const response: RemoveWatermarkWorkerResponse = request.type === 'detect'
      ? { type: 'detect-result', requestId: request.requestId, ok: false, error: message }
      : { type: 'inpaint-result', requestId: request.requestId, ok: false, error: message };
    scope.postMessage(response);
  }
});

export {};
