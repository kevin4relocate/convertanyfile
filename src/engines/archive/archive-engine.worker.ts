/// <reference lib="webworker" />
import { repackArchive } from './codec';
import type { ArchiveWorkerRequest, ArchiveWorkerResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

function failure(requestId: string, error: unknown): ArchiveWorkerResponse {
  const message = error instanceof Error ? error.message : String(error || 'Archive conversion failed');
  if (/decoder runtime unavailable/i.test(message)) {
    return { type: 'convert-result', requestId, ok: false, error: message, code: 'engine-crash', retryable: true };
  }
  const code = /250 MB|100 MB|more than 2000/i.test(message)
    ? 'memory-limit'
    : /invalid|corrupt|unexpected end|does not contain|unsafe file path|encrypted|ended before/i.test(message)
      ? 'corrupt-input'
      : /not supported|unsupported link|unsupported .*entry/i.test(message)
        ? 'unsupported-input'
        : 'conversion-failed';
  return { type: 'convert-result', requestId, ok: false, error: message, code, retryable: false };
}

self.addEventListener('message', async (event: MessageEvent<ArchiveWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'ready') {
    self.postMessage({
      type: 'ready-result',
      requestId: request.requestId,
      ok: true,
      version: 'archive-preview-3',
      gzip: typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined',
      wasm: typeof WebAssembly !== 'undefined',
    } satisfies ArchiveWorkerResponse);
    return;
  }

  try {
    const output = await repackArchive(request.input, request.inputFormat, request.outputFormat, {
      sourceName: request.sourceName,
      zipCompression: request.zipCompression,
    });
    self.postMessage({ type: 'convert-result', requestId: request.requestId, ok: true, output } satisfies ArchiveWorkerResponse, [output]);
  } catch (error) {
    self.postMessage(failure(request.requestId, error));
  }
});
