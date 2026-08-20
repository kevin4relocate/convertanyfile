import { ConverterError } from '../../platform/converter/errors';
import type { ArchiveInputFormat, ArchiveOutputFormat, ArchiveWorkerRequest, ArchiveWorkerResponse, ArchiveZipCompression } from './protocol';

interface PendingRequest {
  resolve: (value: ArchiveWorkerResponse) => void;
  reject: (reason: Error) => void;
  timeoutId: number;
}

const STARTUP_TIMEOUT = 10_000;
const CONVERSION_TIMEOUT = 90_000;

export class ArchiveWorkerClient {
  private worker: Worker | undefined;
  private readonly pending = new Map<string, PendingRequest>();

  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./archive-engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<ArchiveWorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      window.clearTimeout(pending.timeoutId);
      this.pending.delete(event.data.requestId);
      pending.resolve(event.data);
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.failWorker(new ConverterError(event.message || 'Archive engine crashed', 'engine-crash', true));
    });
    worker.addEventListener('messageerror', () => this.failWorker(new ConverterError('Archive engine returned an unreadable response', 'engine-crash', true)));
    return worker;
  }

  async ready(): Promise<{ version: string; gzip: boolean; wasm: boolean }> {
    const response = await this.send({ type: 'ready', requestId: crypto.randomUUID() }, [], STARTUP_TIMEOUT);
    if (response.type !== 'ready-result' || !response.ok) throw new Error('Invalid archive engine readiness response');
    return { version: response.version, gzip: response.gzip, wasm: response.wasm };
  }

  async convert(
    input: ArrayBuffer,
    inputFormat: ArchiveInputFormat,
    outputFormat: ArchiveOutputFormat,
    sourceName: string,
    zipCompression: ArchiveZipCompression,
  ): Promise<ArrayBuffer> {
    const request: ArchiveWorkerRequest = {
      type: 'convert', requestId: crypto.randomUUID(), input, inputFormat, outputFormat, sourceName, zipCompression,
    };
    const response = await this.send(request, [input], CONVERSION_TIMEOUT);
    if (response.type !== 'convert-result') throw new Error('Invalid archive conversion response');
    if (!response.ok) throw new ConverterError(response.error, response.code, response.retryable);
    return response.output;
  }

  reset(reason = 'Conversion cancelled'): void {
    this.failWorker(new ConverterError(reason, 'engine-crash', true));
  }

  private send(request: ArchiveWorkerRequest, transfer: Transferable[], timeoutMs: number): Promise<ArchiveWorkerResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        const message = request.type === 'ready' ? 'Archive engine startup timed out' : 'Archive conversion timed out';
        this.failWorker(new ConverterError(message, 'timeout', true));
      }, timeoutMs);
      this.pending.set(request.requestId, { resolve, reject, timeoutId });
      try { this.getWorker().postMessage(request, transfer); }
      catch (error) {
        window.clearTimeout(timeoutId);
        this.pending.delete(request.requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private failWorker(error: Error): void {
    const worker = this.worker;
    this.worker = undefined;
    worker?.terminate();
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timeoutId);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
