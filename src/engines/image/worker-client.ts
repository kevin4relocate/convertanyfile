import { ConverterError } from '../../platform/converter/errors';
import type { EngineCapabilities } from '../../platform/converter/types';
import type { ImageWorkerRequest, ImageWorkerResponse } from './protocol';

interface PendingRequest { resolve: (value: ImageWorkerResponse) => void; reject: (reason: Error) => void; timeoutId: number; }
const STARTUP_TIMEOUT = 45_000;
const CONVERSION_TIMEOUT = 180_000;

export class ImageWorkerClient {
  private worker: Worker | undefined;
  private readonly pending = new Map<string, PendingRequest>();

  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./image-engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<ImageWorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId); if (!pending) return;
      window.clearTimeout(pending.timeoutId); this.pending.delete(event.data.requestId); pending.resolve(event.data);
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.failWorker(new ConverterError(event.message || 'Image engine crashed', 'engine-crash', true));
    });
    worker.addEventListener('messageerror', () => this.failWorker(new ConverterError('Image engine returned an unreadable response', 'engine-crash', true)));
    return worker;
  }

  async capabilities(): Promise<EngineCapabilities> {
    const response = await this.send({ type: 'capabilities', requestId: crypto.randomUUID() }, [], STARTUP_TIMEOUT);
    if (response.type !== 'capabilities-result' || !response.ok) {
      if (!response.ok) throw new ConverterError(response.error, response.code, response.retryable);
      throw new Error('Invalid image engine response');
    }
    return { readable: response.readable, writable: response.writable, version: response.version };
  }

  async convert(input: ArrayBuffer, inputFormat: string | undefined, output: string, quality: number): Promise<ArrayBuffer> {
    const request: ImageWorkerRequest = { type: 'convert', requestId: crypto.randomUUID(), input, inputFormat, output, quality };
    const response = await this.send(request, [input], CONVERSION_TIMEOUT);
    if (response.type !== 'convert-result' || !response.ok) {
      if (!response.ok) throw new ConverterError(response.error, response.code, response.retryable);
      throw new Error('Invalid image engine response');
    }
    return response.output;
  }

  reset(reason = 'Conversion cancelled'): void {
    this.failWorker(new ConverterError(reason, 'engine-crash', true));
  }

  private send(request: ImageWorkerRequest, transfer: Transferable[], timeoutMs: number): Promise<ImageWorkerResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        const error = new ConverterError(request.type === 'convert' ? 'Image conversion timed out' : 'Image engine startup timed out', 'timeout', true);
        this.failWorker(error);
      }, timeoutMs);
      this.pending.set(request.requestId, { resolve, reject, timeoutId });
      try { this.getWorker().postMessage(request, transfer); }
      catch (error) {
        window.clearTimeout(timeoutId); this.pending.delete(request.requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private failWorker(error: Error): void {
    const worker = this.worker;
    this.worker = undefined;
    worker?.terminate();
    this.rejectAll(error);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) { window.clearTimeout(pending.timeoutId); pending.reject(error); }
    this.pending.clear();
  }
}
