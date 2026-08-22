import type { ConversionErrorCode } from '../../platform/converter/errors';
import type { ConversionSettings } from '../../platform/converter/types';
import type { SubtitleAnalysis } from './codec';

export type SubtitleWorkerRequest =
  | { type: 'ready'; requestId: string }
  | { type: 'analyze'; requestId: string; input: ArrayBuffer; inputFormat: string }
  | {
      type: 'convert';
      requestId: string;
      input: ArrayBuffer;
      inputFormat: string;
      output: string;
      settings: ConversionSettings;
    };

export type SubtitleWorkerResponse =
  | { type: 'ready-result'; requestId: string; ok: true; version: string }
  | { type: 'analyze-result'; requestId: string; ok: true; analysis: SubtitleAnalysis }
  | { type: 'analyze-result'; requestId: string; ok: false; error: string; code: ConversionErrorCode; retryable: boolean }
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | { type: 'convert-result'; requestId: string; ok: false; error: string; code: ConversionErrorCode; retryable: boolean };
