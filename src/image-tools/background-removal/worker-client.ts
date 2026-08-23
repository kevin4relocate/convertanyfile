type WorkerResponse =
  | { type: 'model-progress'; requestId: string; loaded: number; total: number }
  | { type: 'segment-result'; requestId: string; ok: true; mask: ArrayBuffer }
  | { type: 'segment-result'; requestId: string; ok: false; error: string };

type Pending = {
  resolve: (mask: Float32Array) => void;
  reject: (error: Error) => void;
  progress?: (loaded: number, total: number) => void;
  timer: number;
};

const SEGMENT_TIMEOUT_MS = 120_000;

export class BackgroundRemovalWorkerClient {
  private worker?: Worker;
  private pending = new Map<string, Pending>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./background-removal.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.requestId);
      if (!pending) return;
      if (response.type === 'model-progress') {
        pending.progress?.(response.loaded, response.total);
        return;
      }
      window.clearTimeout(pending.timer);
      this.pending.delete(response.requestId);
      if (response.ok) pending.resolve(new Float32Array(response.mask));
      else pending.reject(new Error(response.error));
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.failAll(new Error(event.message || 'Background-removal worker stopped unexpectedly.'));
    });
    worker.addEventListener('messageerror', () => this.failAll(new Error('Background-removal worker returned unreadable data.')));
    return worker;
  }

  segment(input: Float32Array, progress?: (loaded: number, total: number) => void): Promise<Float32Array> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(
        () => this.failAll(new Error('Local background segmentation timed out. Try a smaller image or reload the tool.')),
        SEGMENT_TIMEOUT_MS,
      );
      this.pending.set(requestId, { resolve, reject, progress, timer });
      try {
        this.ensureWorker().postMessage({ type: 'segment', requestId, tensor: input.buffer }, [input.buffer]);
      } catch (error) {
        window.clearTimeout(timer);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  reset(reason = 'Background-removal worker reset'): void {
    this.failAll(new Error(reason));
  }

  private failAll(error: Error): void {
    this.worker?.terminate();
    this.worker = undefined;
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
