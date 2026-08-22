import type { RegionBlurRect, RegionBlurShape, RegionBlurWorkerRequest, RegionBlurWorkerResponse } from './protocol';

interface PendingRequest {
  resolve: (response: RegionBlurWorkerResponse) => void;
  reject: (error: Error) => void;
  timer: number;
}

export class RegionBlurWorkerClient {
  private worker: Worker | undefined;
  private pending = new Map<string, PendingRequest>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./region-blur.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<RegionBlurWorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      window.clearTimeout(pending.timer);
      this.pending.delete(event.data.requestId);
      pending.resolve(event.data);
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.fail(new Error(event.message || 'The local blur worker stopped unexpectedly'));
    });
    worker.addEventListener('messageerror', () => this.fail(new Error('The local blur worker returned an unreadable response')));
    return worker;
  }

  async blur(pixels: ArrayBuffer, width: number, height: number, rect: RegionBlurRect, shape: RegionBlurShape, strength: number): Promise<{ pixels: ArrayBuffer; affectedPixels: number }> {
    const request: RegionBlurWorkerRequest = { type: 'blur-region', requestId: crypto.randomUUID(), pixels, width, height, rect, shape, strength };
    const response = await this.send(request, [pixels], 75_000);
    if (!response.ok) throw new Error(response.error);
    return { pixels: response.pixels, affectedPixels: response.affectedPixels };
  }

  reset(reason = 'Blur reset'): void {
    this.fail(new Error(reason));
  }

  private send(request: RegionBlurWorkerRequest, transfer: Transferable[], timeoutMs: number): Promise<RegionBlurWorkerResponse> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => this.fail(new Error('Selected-region blur timed out')), timeoutMs);
      this.pending.set(request.requestId, { resolve, reject, timer });
      try { this.ensureWorker().postMessage(request, transfer); }
      catch (error) {
        window.clearTimeout(timer);
        this.pending.delete(request.requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private fail(error: Error): void {
    const worker = this.worker;
    this.worker = undefined;
    worker?.terminate();
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
