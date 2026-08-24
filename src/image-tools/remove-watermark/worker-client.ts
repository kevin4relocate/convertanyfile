import type { MaskOperation } from '../../platform/image-tools/types';
import { getMaskProcessingOptions } from '../mask/mask-processing-options';
import type { RemoveWatermarkWorkerRequest, RemoveWatermarkWorkerResponse } from './protocol';

interface PendingRequest { resolve:(response:RemoveWatermarkWorkerResponse)=>void; reject:(error:Error)=>void; timer:number; }

function prepareOperations(operations: readonly MaskOperation[]): MaskOperation[] {
  const { paddingPx, featherPx } = getMaskProcessingOptions();
  return operations.map((operation) => {
    const pad = operation.type === 'text' ? 0 : paddingPx;
    const rect = pad > 0
      ? { x: operation.rect.x - pad, y: operation.rect.y - pad, width: operation.rect.width + pad * 2, height: operation.rect.height + pad * 2 }
      : { ...operation.rect };
    return { ...operation, rect, feather: featherPx };
  });
}

export class RemoveWatermarkWorkerClient {
  private worker: Worker | undefined;
  private pending = new Map<string, PendingRequest>();

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./remove-watermark.worker.ts', import.meta.url), { type: 'module' });
    this.worker = worker;
    worker.addEventListener('message', (event: MessageEvent<RemoveWatermarkWorkerResponse>) => {
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      window.clearTimeout(pending.timer);
      this.pending.delete(event.data.requestId);
      pending.resolve(event.data);
    });
    worker.addEventListener('error', (event) => { event.preventDefault(); this.fail(new Error(event.message || 'The local image worker stopped unexpectedly')); });
    worker.addEventListener('messageerror', () => this.fail(new Error('The local image worker returned an unreadable response')));
    return worker;
  }

  async inpaint(pixels:ArrayBuffer,width:number,height:number,operations:MaskOperation[]):Promise<{pixels:ArrayBuffer;repairedPixels:number}> {
    const { maxMaskFraction } = getMaskProcessingOptions();
    const request: RemoveWatermarkWorkerRequest = {
      type:'inpaint',
      requestId:crypto.randomUUID(),
      pixels,
      width,
      height,
      operations:prepareOperations(operations),
      maxMaskFraction,
    };
    const response = await this.send(request, [pixels], 75_000);
    if (!response.ok) throw new Error(response.error);
    return { pixels: response.pixels, repairedPixels: response.repairedPixels };
  }

  reset(reason='Image tool reset'):void { this.fail(new Error(reason)); }

  private send(request:RemoveWatermarkWorkerRequest,transfer:Transferable[],timeoutMs:number):Promise<RemoveWatermarkWorkerResponse> {
    return new Promise((resolve,reject)=>{
      const timer=window.setTimeout(()=>this.fail(new Error('Local image processing timed out')),timeoutMs);
      this.pending.set(request.requestId,{resolve,reject,timer});
      try{this.ensureWorker().postMessage(request,transfer);}catch(error){window.clearTimeout(timer);this.pending.delete(request.requestId);reject(error instanceof Error?error:new Error(String(error)));}
    });
  }

  private fail(error:Error):void {
    const worker=this.worker;this.worker=undefined;worker?.terminate();
    for(const pending of this.pending.values()){window.clearTimeout(pending.timer);pending.reject(error);}
    this.pending.clear();
  }
}
