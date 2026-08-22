/// <reference lib="webworker" />
import type { ConversionErrorCode } from '../../platform/converter/errors';
import { analyzeSubtitleBytes, convertSubtitleBytes, decodeSubtitleBytes, type SubtitleInputFormat, type SubtitleOutputFormat } from './codec';
import type { SubtitleWorkerRequest, SubtitleWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
const INPUTS = new Set<SubtitleInputFormat>(['srt', 'vtt', 'ass', 'ssa', 'sbv']);
const OUTPUTS = new Set<SubtitleOutputFormat>(['srt', 'vtt', 'sbv', 'txt']);
const VERSION = 'subtitle-text-v2';
const MAX_TIMING_SHIFT_MS = 600_000;
const SRT_TIMING_LINE = /^\s*\d{1,3}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,3}:\d{2}:\d{2}[,.]\d{1,3}(?:\s|$)/;

function classify(error: unknown): { error: string; code: ConversionErrorCode; retryable: boolean } {
  const message = error instanceof Error ? error.message : String(error || 'Subtitle conversion failed');
  if (/more than .* cues|memory|allocation/i.test(message)) return { error: message, code: 'memory-limit', retryable: false };
  if (/unsupported/i.test(message)) return { error: message, code: 'unsupported-input', retryable: false };
  if (/invalid|malformed|missing timestamp|no subtitle cues|ends before|encoding|before 00:00|timing shift/i.test(message)) return { error: message, code: 'corrupt-input', retryable: false };
  return { error: message || 'Unable to convert this subtitle file', code: 'conversion-failed', retryable: false };
}

function analyzeChecked(input: ArrayBuffer, inputFormat: SubtitleInputFormat) {
  const analysis = analyzeSubtitleBytes(input, inputFormat);
  if (inputFormat === 'srt') {
    const timingLineCount = decodeSubtitleBytes(input).split('\n').filter((line) => SRT_TIMING_LINE.test(line)).length;
    if (timingLineCount !== analysis.cueCount) {
      throw new Error('Malformed SRT structure: multiple timestamp lines were found inside one cue block');
    }
  }
  return analysis;
}

function validateSettings(request: Extract<SubtitleWorkerRequest, { type: 'convert' }>): void {
  const shift = Number(request.settings.timingShiftMs ?? 0);
  if (!Number.isFinite(shift) || !Number.isInteger(shift) || Math.abs(shift) > MAX_TIMING_SHIFT_MS) {
    throw new Error('Invalid timing shift. Enter a whole-number value from -600000 to 600000 ms.');
  }
}

scope.addEventListener('message', (event: MessageEvent<SubtitleWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'ready') {
    const response: SubtitleWorkerResponse = { type: 'ready-result', requestId: request.requestId, ok: true, version: VERSION };
    scope.postMessage(response);
    return;
  }

  if (request.type === 'analyze') {
    try {
      if (!INPUTS.has(request.inputFormat as SubtitleInputFormat)) throw new Error('Unsupported subtitle format');
      const analysis = analyzeChecked(request.input, request.inputFormat as SubtitleInputFormat);
      const response: SubtitleWorkerResponse = { type: 'analyze-result', requestId: request.requestId, ok: true, analysis };
      scope.postMessage(response);
    } catch (error) {
      const failure = classify(error);
      const response: SubtitleWorkerResponse = { type: 'analyze-result', requestId: request.requestId, ok: false, ...failure };
      scope.postMessage(response);
    }
    return;
  }

  try {
    if (!INPUTS.has(request.inputFormat as SubtitleInputFormat) || !OUTPUTS.has(request.output as SubtitleOutputFormat)) throw new Error('Unsupported subtitle format');
    validateSettings(request);
    const output = convertSubtitleBytes(request.input, request.inputFormat as SubtitleInputFormat, request.output as SubtitleOutputFormat, request.settings);
    const response: SubtitleWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: true, output };
    scope.postMessage(response, [output]);
  } catch (error) {
    const failure = classify(error);
    const response: SubtitleWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: false, ...failure };
    scope.postMessage(response);
  }
});

export {};
