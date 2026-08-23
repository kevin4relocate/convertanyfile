import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ORT_VERSION = '1.27.0';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist`;
const MODEL_URL = 'https://huggingface.co/edgetools/u2netp/resolve/main/u2netp.onnx';
const OUTPUT_DIR = join(process.cwd(), 'public', 'runtime', 'background-removal');

const assets = [
  {
    source: `${ORT_BASE}/ort.wasm.min.mjs`,
    target: join(OUTPUT_DIR, 'ort.wasm.min.mjs'),
    minBytes: 45_000,
    maxBytes: 60_000,
  },
  {
    source: `${ORT_BASE}/ort-wasm-simd-threaded.mjs`,
    target: join(OUTPUT_DIR, 'ort-wasm-simd-threaded.mjs.js'),
    minBytes: 20_000,
    maxBytes: 30_000,
  },
  {
    source: `${ORT_BASE}/ort-wasm-simd-threaded.wasm`,
    target: join(OUTPUT_DIR, 'ort-wasm-simd-threaded.wasm'),
    minBytes: 13_000_000,
    maxBytes: 14_000_000,
  },
  {
    source: MODEL_URL,
    target: join(OUTPUT_DIR, 'u2netp.onnx'),
    sha256: '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8',
    minBytes: 4_500_000,
    maxBytes: 4_650_000,
  },
];

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function existingMatches(asset) {
  try {
    const bytes = await readFile(asset.target);
    if (bytes.byteLength < asset.minBytes || bytes.byteLength > asset.maxBytes) return false;
    return !asset.sha256 || sha256(bytes) === asset.sha256;
  } catch {
    return false;
  }
}

async function syncAsset(asset) {
  if (await existingMatches(asset)) return;
  const response = await fetch(asset.source, {
    headers: { 'User-Agent': 'ConvertAnyFile-build' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Unable to download background-removal runtime asset: ${response.status} ${asset.source}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength < asset.minBytes || bytes.byteLength > asset.maxBytes) {
    throw new Error(`Unexpected background-removal asset size for ${asset.source}: ${bytes.byteLength}`);
  }
  if (asset.sha256) {
    const actual = sha256(bytes);
    if (actual !== asset.sha256) throw new Error(`Background-removal model integrity mismatch: expected ${asset.sha256}, received ${actual}`);
  }
  await mkdir(dirname(asset.target), { recursive: true });
  await writeFile(asset.target, bytes);
}

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all(assets.map(syncAsset));
console.log(`Background-removal runtime synced (ONNX Runtime Web ${ORT_VERSION}, U2NetP pinned SHA-256).`);
