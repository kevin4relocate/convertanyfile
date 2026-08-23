/// <reference lib="webworker" />

type OrtTensor = { data: Float32Array | number[]; dims: readonly number[] };
type OrtSession = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, OrtTensor>>;
};
type OrtModule = {
  env: { wasm: { numThreads?: number; proxy?: boolean; wasmPaths?: string | { wasm?: string; mjs?: string } } };
  Tensor: new (type: 'float32', data: Float32Array, dims: readonly number[]) => unknown;
  InferenceSession: {
    create: (model: ArrayBuffer, options?: Record<string, unknown>) => Promise<OrtSession>;
  };
};

type Request = { type: 'segment'; requestId: string; tensor: ArrayBuffer };
type Response =
  | { type: 'model-progress'; requestId: string; loaded: number; total: number }
  | { type: 'segment-result'; requestId: string; ok: true; mask: ArrayBuffer }
  | { type: 'segment-result'; requestId: string; ok: false; error: string };

const ORT_MODULE_URL = '/runtime/background-removal/ort.wasm.min.mjs';
const ORT_WASM_URL = '/runtime/background-removal/ort-wasm-simd-threaded.wasm';
const ORT_MJS_URL = '/runtime/background-removal/ort-wasm-simd-threaded.mjs.js';
const MODEL_URL = '/runtime/background-removal/u2netp.onnx';
const INPUT_SIZE = 320;
let sessionPromise: Promise<{ ort: OrtModule; session: OrtSession }> | undefined;

function post(message: Response, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer });
}

async function fetchModel(requestId: string): Promise<ArrayBuffer> {
  const response = await fetch(MODEL_URL, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Unable to load local background model (${response.status}).`);
  const total = Number(response.headers.get('content-length') || 0);
  if (!response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loaded += value.byteLength;
    post({ type: 'model-progress', requestId, loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}

async function ensureSession(requestId: string): Promise<{ ort: OrtModule; session: OrtSession }> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import(/* @vite-ignore */ ORT_MODULE_URL) as unknown as OrtModule;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = { wasm: ORT_WASM_URL, mjs: ORT_MJS_URL };
      const model = await fetchModel(requestId);
      const session = await ort.InferenceSession.create(model, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      return { ort, session };
    })().catch((error) => {
      sessionPromise = undefined;
      throw error;
    });
  }
  return sessionPromise;
}

function normalizeMask(source: Float32Array | number[]): Float32Array {
  const count = INPUT_SIZE * INPUT_SIZE;
  const mask = new Float32Array(count);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < Math.min(count, source.length); index += 1) {
    const value = Number(source[index] ?? 0);
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const range = Math.max(1e-6, max - min);
  for (let index = 0; index < count; index += 1) {
    mask[index] = Math.min(1, Math.max(0, (Number(source[index] ?? min) - min) / range));
  }
  return mask;
}

self.addEventListener('message', (event: MessageEvent<Request>) => {
  const request = event.data;
  if (!request || request.type !== 'segment') return;
  void (async () => {
    try {
      const { ort, session } = await ensureSession(request.requestId);
      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];
      if (!inputName || !outputName) throw new Error('Background model tensor contract is unavailable.');
      const tensorData = new Float32Array(request.tensor);
      const tensor = new ort.Tensor('float32', tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const outputs = await session.run({ [inputName]: tensor });
      const output = outputs[outputName];
      if (!output) throw new Error('Background model did not return a mask.');
      const mask = normalizeMask(output.data);
      post({ type: 'segment-result', requestId: request.requestId, ok: true, mask: mask.buffer }, [mask.buffer]);
    } catch (error) {
      post({ type: 'segment-result', requestId: request.requestId, ok: false, error: error instanceof Error ? error.message : 'Background segmentation failed.' });
    }
  })();
});
