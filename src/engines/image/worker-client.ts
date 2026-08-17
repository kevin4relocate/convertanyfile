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
    this.worker = new Worker(new URL('./image-engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker.addEventListener('message', (event: MessageEvent<ImageWorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId); if (!pending) return;
      window.clearTimeout(pending.timeoutId); this.pending.delete(event.data.requestId); pending.resolve(event.data);
    });
    this.worker.addEventListener('error', (event) => this.rejectAll(new Error(event.message || 'Image engine crashed')));
    this.worker.addEventListener('messageerror', () => this.rejectAll(new Error('Image engine returned an unreadable response')));
    return this.worker;
  }

  async capabilities(): Promise<EngineCapabilities> {
    const response = await this.send({ type: 'capabilities', requestId: crypto.randomUUID() }, [], STARTUP_TIMEOUT);
    if (response.type !== 'capabilities-result' || !response.ok) throw new Error(response.ok ? 'Invalid image engine response' : response.error);
    return { readable: response.readable, writable: response.writable, version: response.version };
  }

  async convert(input: ArrayBuffer, output: string, quality: number): Promise<ArrayBuffer> {
    const request: ImageWorkerRequest = { type: 'convert', requestId: crypto.randomUUID(), input, output, quality };
    const response = await this.send(request, [input], CONVERSION_TIMEOUT);
    if (response.type !== 'convert-result' || !response.ok) throw new Error(response.ok ? 'Invalid image engine response' : response.error);
    return response.output;
  }

  reset(reason = 'Conversion cancelled'): void {
    this.worker?.terminate(); this.worker = undefined; this.rejectAll(new Error(reason));
  }

  private send(request: ImageWorkerRequest, transfer: Transferable[], timeoutMs: number): Promise<ImageWorkerResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pending.delete(request.requestId);
        reject(new Error(request.type === 'convert' ? 'Image conversion timed out' : 'Image engine startup timed out'));
      }, timeoutMs);
      this.pending.set(request.requestId, { resolve, reject, timeoutId });
      try { this.getWorker().postMessage(request, transfer); }
      catch (error) {
        window.clearTimeout(timeoutId); this.pending.delete(request.requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) { window.clearTimeout(pending.timeoutId); pending.reject(error); }
    this.pending.clear();
  }
}
