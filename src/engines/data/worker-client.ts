import { ConverterError } from '../../platform/converter/errors';
import type { ConversionSettings } from '../../platform/converter/types';
import type { DataWorkerRequest, DataWorkerResponse } from './protocol';

interface PendingRequest {
  resolve: (value: DataWorkerResponse) => void;
  reject: (reason: Error) => void;
  timeoutId: number;
}

const CONVERSION_TIMEOUT = 60_000;

export class DataWorkerClient {
  private worker: Worker | undefined;
  private readonly pending = new Map<string, PendingRequest>();

  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./data-engine.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<DataWorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      window.clearTimeout(pending.timeoutId);
      this.pending.delete(event.data.requestId);
      pending.resolve(event.data);
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.failWorker(new ConverterError(event.message || 'Data engine crashed', 'engine-crash', true));
    });
    worker.addEventListener('messageerror', () => this.failWorker(new ConverterError('Data engine returned an unreadable response', 'engine-crash', true)));
    return worker;
  }

  async convert(input: ArrayBuffer, inputFormat: string, output: string, settings: ConversionSettings): Promise<ArrayBuffer> {
    const request: DataWorkerRequest = {
      type: 'convert', requestId: crypto.randomUUID(), input, inputFormat, output, settings,
    };
    const response = await this.send(request, [input]);
    if (!response.ok) throw new ConverterError(response.error, response.code, response.retryable);
    return response.output;
  }

  reset(reason = 'Conversion cancelled'): void {
    this.failWorker(new ConverterError(reason, 'engine-crash', true));
  }

  private send(request: DataWorkerRequest, transfer: Transferable[]): Promise<DataWorkerResponse> {
    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.failWorker(new ConverterError('Data conversion timed out', 'timeout', true));
      }, CONVERSION_TIMEOUT);
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
