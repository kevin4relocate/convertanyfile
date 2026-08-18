import type { ConversionErrorCode } from '../../platform/converter/errors';
import type { ConversionSettings } from '../../platform/converter/types';

export type DataWorkerRequest =
  | { type: 'ready'; requestId: string }
  | {
      type: 'convert';
      requestId: string;
      input: ArrayBuffer;
      inputFormat: string;
      output: string;
      settings: ConversionSettings;
    };

export type DataWorkerResponse =
  | { type: 'ready-result'; requestId: string; ok: true; version: string }
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | { type: 'convert-result'; requestId: string; ok: false; error: string; code: ConversionErrorCode; retryable: boolean };
