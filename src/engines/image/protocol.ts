import type { ConversionErrorCode } from '../../platform/converter/errors';

export interface ImageResizeTransform {
  width: number;
  height: number;
}

export type ImageWorkerRequest =
  | { type: 'capabilities'; requestId: string }
  | {
      type: 'convert';
      requestId: string;
      input: ArrayBuffer;
      inputFormat?: string;
      output: string;
      quality: number;
      resize?: ImageResizeTransform;
    };

type WorkerFailure = { requestId: string; ok: false; error: string; code: ConversionErrorCode; retryable: boolean };

export type ImageWorkerResponse =
  | { type: 'capabilities-result'; requestId: string; ok: true; readable: string[]; writable: string[]; version: string }
  | ({ type: 'capabilities-result' } & WorkerFailure)
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | ({ type: 'convert-result' } & WorkerFailure);
