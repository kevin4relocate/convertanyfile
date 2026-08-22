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
  /** 0 = left/top, 0.5 = center, 1 = right/bottom within available crop travel. */
  offsetX?: number;
  offsetY?: number;
}

export interface ImageBlurTransform {
  radius: number;
  sigma: number;
}

export interface ImageBackgroundTransform {
  /** CSS/ImageMagick-compatible hex color such as #ffffff. */
  color: string;
  /** Flatten transparent pixels onto the chosen color. */
  flatten: boolean;
}

export interface ImageTransformOptions {
  resize?: ImageResizeTransform;
  rotate?: ImageRotateTransform;
  crop?: ImageCropTransform;
  blur?: ImageBlurTransform;
  background?: ImageBackgroundTransform;
  stripMetadata?: boolean;
  preserveColorProfile?: boolean;
}

export interface ImageMetadataSnapshot {
  width: number;
  height: number;
  hasAlpha: boolean;
  isOpaque: boolean;
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
