export type ImageWorkerRequest =
  | { type: 'capabilities'; requestId: string }
  | { type: 'convert'; requestId: string; input: ArrayBuffer; output: string; quality: number };

export type ImageWorkerResponse =
  | { type: 'capabilities-result'; requestId: string; ok: true; readable: string[]; writable: string[]; version: string }
  | { type: 'capabilities-result'; requestId: string; ok: false; error: string }
  | { type: 'convert-result'; requestId: string; ok: true; output: ArrayBuffer }
  | { type: 'convert-result'; requestId: string; ok: false; error: string };
