export type ArchiveInputFormat = 'zip' | 'tar' | 'tgz' | 'gz';
export type ArchiveOutputFormat = 'zip' | 'tar' | 'tgz';
export type ArchiveZipCompression = 'store' | 'balanced' | 'maximum';

export type ArchiveWorkerRequest =
  | { type: 'ready'; requestId: string }
  | {
      type: 'convert';
      requestId: string;
      input: ArrayBuffer;
      inputFormat: ArchiveInputFormat;
      outputFormat: ArchiveOutputFormat;
      sourceName: string;
      zipCompression: ArchiveZipCompression;
    };

export type ArchiveWorkerResponse =
  | { type: 'ready-result'; requestId: string; ok: true; version: string; gzip: boolean }
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | { type: 'convert-result'; requestId: string; ok: false; error: string; code: 'unsupported-input' | 'corrupt-input' | 'memory-limit' | 'conversion-failed'; retryable: false };
