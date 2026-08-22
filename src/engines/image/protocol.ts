import type { ConversionErrorCode } from '../../platform/converter/errors';

export interface ImageResizeTransform {
  width: number;
  height: number;
}

export interface ImageRotateTransform {
  degrees: number;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
}

export interface ImageCropTransform {
  width: number;
  height: number;
}

export interface ImageTransformOptions {
  resize?: ImageResizeTransform;
  rotate?: ImageRotateTransform;
  crop?: ImageCropTransform;
  stripMetadata?: boolean;
  preserveColorProfile?: boolean;
}

export interface ImageMetadataSnapshot {
  width: number;
  height: number;
  profiles: string[];
  attributes: Array<{ name: string; value: string }>;
}

export type ImageWorkerRequest =
  | { type: 'capabilities'; requestId: string }
  | {
      type: 'inspect';
      requestId: string;
      input: ArrayBuffer;
      inputFormat?: string;
    }
  | {
      type: 'convert';
      requestId: string;
      input: ArrayBuffer;
      inputFormat?: string;
      output: string;
      quality: number;
      options?: ImageTransformOptions;
    };

type WorkerFailure = { requestId: string; ok: false; error: string; code: ConversionErrorCode; retryable: boolean };

export type ImageWorkerResponse =
  | { type: 'capabilities-result'; requestId: string; ok: true; readable: string[]; writable: string[]; version: string }
  | ({ type: 'capabilities-result' } & WorkerFailure)
  | { type: 'inspect-result'; requestId: string; ok: true; metadata: ImageMetadataSnapshot }
  | ({ type: 'inspect-result' } & WorkerFailure)
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | ({ type: 'convert-result' } & WorkerFailure);
