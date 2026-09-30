import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUTPUT_DIR = join(process.cwd(), 'tests', 'fixtures', 'archive-wasm');
const LIBARCHIVE_COMMIT = '1d04437e404ffad8b3a490abb36234dbdff59afa';

const fixtures = [
  {
    source: `https://raw.githubusercontent.com/ofk/libarchive-wasm/${LIBARCHIVE_COMMIT}/archives/lzma2.7z`,
    target: join(OUTPUT_DIR, 'lzma2.7z'),
    gitBlobSha: 'a2b5be6d98ee0de0d01079e9d745b85e4aaa995b',
  },
  {
    source: `https://raw.githubusercontent.com/ofk/libarchive-wasm/${LIBARCHIVE_COMMIT}/archives/v4.rar`,
    target: join(OUTPUT_DIR, 'v4.rar'),
    gitBlobSha: 'd76d4da97216e377fe490cba8544c486cd2004fb',
  },
  {
    source: `https://raw.githubusercontent.com/ofk/libarchive-wasm/${LIBARCHIVE_COMMIT}/archives/v5.rar`,
    target: join(OUTPUT_DIR, 'v5.rar'),
    gitBlobSha: '36bd9e108cf68a55357eca771cc48f1829035071',
  },
  {
    source: `https://raw.githubusercontent.com/ofk/libarchive-wasm/${LIBARCHIVE_COMMIT}/archives/v4-encrypted.rar`,
    target: join(OUTPUT_DIR, 'v4-encrypted.rar'),
    gitBlobSha: '939f1f62d332c842d07e58f4fc6910743e149e3f',
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

async function syncFixture(fixture) {
  if (await matchesPinnedBlob(fixture.target, fixture.gitBlobSha)) return;
  const response = await fetch(fixture.source, {
    headers: { 'User-Agent': 'ConvertAnyFile-tests' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Unable to download pinned archive fixture: ${response.status} ${fixture.source}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualSha = gitBlobSha(bytes);
  if (actualSha !== fixture.gitBlobSha) {
    throw new Error(`Archive fixture integrity mismatch for ${fixture.source}: expected ${fixture.gitBlobSha}, received ${actualSha}`);
  }
  await mkdir(dirname(fixture.target), { recursive: true });
  await writeFile(fixture.target, bytes);
}

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all(fixtures.map(syncFixture));
console.log('Pinned 7Z/RAR browser fixtures are ready.');
