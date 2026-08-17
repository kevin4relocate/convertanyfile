export type ConversionErrorCode =
  | 'unsupported-input'
  | 'corrupt-input'
  | 'memory-limit'
  | 'timeout'
  | 'engine-crash'
  | 'conversion-failed';

export class ConverterError extends Error {
  readonly code: ConversionErrorCode;
  readonly retryable: boolean;

  constructor(message: string, code: ConversionErrorCode, retryable: boolean) {
    super(message);
    this.name = 'ConverterError';
    this.code = code;
    this.retryable = retryable;
  }
}

export function classifyConversionError(error: unknown): { message: string; code: ConversionErrorCode; retryable: boolean } {
  if (error instanceof ConverterError) return { message: error.message, code: error.code, retryable: error.retryable };

  const message = error instanceof Error ? error.message : String(error || 'Conversion failed');
  if (/timed out/i.test(message)) return { message, code: 'timeout', retryable: true };
  if (/crashed|unreadable response|worker/i.test(message)) return { message, code: 'engine-crash', retryable: true };
  if (/memory|allocation|out of bounds/i.test(message)) return { message, code: 'memory-limit', retryable: false };
  if (/unsupported|delegate|codec/i.test(message)) return { message, code: 'unsupported-input', retryable: false };
  if (/corrupt|invalid|unexpected end|insufficient/i.test(message)) return { message, code: 'corrupt-input', retryable: false };
  return { message: message || 'Unable to convert this file', code: 'conversion-failed', retryable: false };
}
