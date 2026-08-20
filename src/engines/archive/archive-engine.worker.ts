/// <reference lib="webworker" />
import { repackArchive } from './codec';
import type { ArchiveWorkerRequest, ArchiveWorkerResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

function failure(requestId: string, error: unknown): ArchiveWorkerResponse {
  const message = error instanceof Error ? error.message : String(error || 'Archive conversion failed');
  if (/decoder runtime unavailable/i.test(message)) {
    return { type: 'convert-result', requestId, ok: false, error: message, code: 'engine-crash', retryable: true };
  }

  const memoryLimited = /75 MB browser-decoder|250 MB|100 MB|more than 2000|4096-byte|browser memory/i.test(message);
  const unsupported = /password-protected 7Z\/RAR|encrypted archives are not supported|encrypted archive entries are not supported|this 7Z\/RAR archive uses an unsupported|TAR archive contains an unsupported|Archive contains (?:an )?unsupported|duplicate path|unsafe file path|control characters|not supported by this browser/i.test(message);
  const corrupt = /invalid|corrupt|incomplete|unexpected end|does not contain|ended before|checksum|CRC|unable to read/i.test(message);
  const code = memoryLimited ? 'memory-limit' : unsupported ? 'unsupported-input' : corrupt ? 'corrupt-input' : 'conversion-failed';
  return { type: 'convert-result', requestId, ok: false, error: message, code, retryable: false };
}

self.addEventListener('message', async (event: MessageEvent<ArchiveWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'ready') {
    self.postMessage({
      type: 'ready-result',
      requestId: request.requestId,
      ok: true,
      version: 'archive-preview-4',
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
