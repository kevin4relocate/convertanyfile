/// <reference lib="webworker" />
import type { ConversionErrorCode } from '../../platform/converter/errors';
import { convertDataBytes, type DataFormat } from './codec';
import type { DataWorkerRequest, DataWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
const SUPPORTED = new Set<DataFormat>(['csv', 'tsv', 'json', 'jsonl']);

function classify(error: unknown): { error: string; code: ConversionErrorCode; retryable: boolean } {
  const message = error instanceof Error ? error.message : String(error || 'Data conversion failed');
  if (/invalid json|invalid jsonl|unclosed quoted|utf-8|encoded data|malformed/i.test(message)) {
    return { error: message, code: 'corrupt-input', retryable: false };
  }
  if (/unsupported/i.test(message)) return { error: message, code: 'unsupported-input', retryable: false };
  if (/memory|allocation/i.test(message)) return { error: message, code: 'memory-limit', retryable: false };
  return { error: message || 'Unable to convert this data file', code: 'conversion-failed', retryable: false };
}

scope.addEventListener('message', (event: MessageEvent<DataWorkerRequest>) => {
  const request = event.data;
  if (request.type !== 'convert') return;
  try {
    if (!SUPPORTED.has(request.inputFormat as DataFormat) || !SUPPORTED.has(request.output as DataFormat)) {
      throw new Error('Unsupported data format');
    }
    const output = convertDataBytes(
      request.input,
      request.inputFormat as DataFormat,
      request.output as DataFormat,
      request.settings,
    );
    const response: DataWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: true, output };
    scope.postMessage(response, [output]);
  } catch (error) {
    const failure = classify(error);
    const response: DataWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: false, ...failure };
    scope.postMessage(response);
  }
});

export {};
