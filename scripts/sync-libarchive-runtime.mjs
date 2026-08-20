import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const PINNED_COMMIT = '1d04437e404ffad8b3a490abb36234dbdff59afa';
const BASE = `https://raw.githubusercontent.com/ofk/libarchive-wasm/${PINNED_COMMIT}`;
const OUTPUT_DIR = join(process.cwd(), 'public', 'vendor', 'libarchive-wasm');

const assets = [
  {
    source: `${BASE}/src/libarchive.js`,
    target: join(OUTPUT_DIR, 'libarchive.js'),
    gitBlobSha: '015179995297b07baa3c9e7f9f099650bd879a4d',
  },
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

async function syncAsset(asset) {
  if (await matchesPinnedBlob(asset.target, asset.gitBlobSha)) return;

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

  await mkdir(dirname(asset.target), { recursive: true });
  await writeFile(asset.target, bytes);
}

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all(assets.map(syncAsset));
console.log(`Archive WASM runtime synced from pinned commit ${PINNED_COMMIT}.`);
