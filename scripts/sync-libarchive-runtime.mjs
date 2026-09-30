import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const PINNED_COMMIT = '1d04437e404ffad8b3a490abb36234dbdff59afa';
const BASE = `https://raw.githubusercontent.com/ofk/libarchive-wasm/${PINNED_COMMIT}`;
const OUTPUT_DIR = join(process.cwd(), 'public', 'vendor', 'libarchive-wasm');

const JS_EXPORT_SUFFIX = '\nexport default libarchive;\n';
const javascriptAsset = {
  source: `${BASE}/src/libarchive.js`,
  target: join(OUTPUT_DIR, 'libarchive.js'),
  gitBlobSha: '015179995297b07baa3c9e7f9f099650bd879a4d',
};

const assets = [
  {
    source: `${BASE}/src/libarchive.wasm`,
    target: join(OUTPUT_DIR, 'libarchive.wasm'),
    gitBlobSha: '778e69926522a9399d1357c4587adefb27a22b97',
  },
  {
    source: `${BASE}/LICENSE`,
    target: join(OUTPUT_DIR, 'LICENSE.txt'),
    gitBlobSha: '2cf11f9f871faa273f2001c2aa09630ca7695e57',
  },
];

function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.byteLength}\0`);
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

async function matchesPinnedBlob(path, expectedSha) {
  try {
    return gitBlobSha(await readFile(path)) === expectedSha;
  } catch {
    return false;
  }
}

async function fetchPinnedAsset(asset) {
  const response = await fetch(asset.source, {
    headers: { 'User-Agent': 'ConvertAnyFile-build' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Unable to download pinned archive runtime asset: ${response.status} ${asset.source}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  const actualSha = gitBlobSha(bytes);
  if (actualSha !== asset.gitBlobSha) {
    throw new Error(`Archive runtime integrity mismatch for ${asset.source}: expected ${asset.gitBlobSha}, received ${actualSha}`);
  }

  return bytes;
}

async function syncAsset(asset) {
  if (await matchesPinnedBlob(asset.target, asset.gitBlobSha)) return;
  const bytes = await fetchPinnedAsset(asset);
  await mkdir(dirname(asset.target), { recursive: true });
  await writeFile(asset.target, bytes);
}

async function generatedJavascriptIsCurrent() {
  try {
    const generated = await readFile(javascriptAsset.target);
    const text = generated.toString('utf8');
    if (!text.endsWith(JS_EXPORT_SUFFIX)) return false;
    const source = Buffer.from(text.slice(0, -JS_EXPORT_SUFFIX.length), 'utf8');
    return gitBlobSha(source) === javascriptAsset.gitBlobSha;
  } catch {
    return false;
  }
}

async function syncJavascriptRuntime() {
  if (await generatedJavascriptIsCurrent()) return;
  const source = await fetchPinnedAsset(javascriptAsset);
  await mkdir(dirname(javascriptAsset.target), { recursive: true });
  await writeFile(javascriptAsset.target, Buffer.concat([source, Buffer.from(JS_EXPORT_SUFFIX)]));
}

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([syncJavascriptRuntime(), ...assets.map(syncAsset)]);
console.log(`Archive WASM runtime synced from pinned commit ${PINNED_COMMIT}.`);
