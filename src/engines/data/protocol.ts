import type { ConversionErrorCode } from '../../platform/converter/errors';
import type { ConversionSettings } from '../../platform/converter/types';

export type DataWorkerRequest = {
  type: 'convert';
  requestId: string;
  input: ArrayBuffer;
  inputFormat: string;
  output: string;
  settings: ConversionSettings;
};

export type DataWorkerResponse =
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | { type: 'convert-result'; requestId: string; ok: false; error: string; code: ConversionErrorCode; retryable: boolean };
