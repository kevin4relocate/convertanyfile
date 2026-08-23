import { readdir, stat } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, process.env.CLOUDFLARE_ASSET_DIR || 'dist');
const warningLimit = Number(process.env.CLOUDFLARE_ASSET_WARNING_LIMIT || 15_000);
const safetyLimit = Number(process.env.CLOUDFLARE_ASSET_SAFETY_LIMIT || 19_000);
const hardLimit = Number(process.env.CLOUDFLARE_ASSET_HARD_LIMIT || 20_000);
const maxFileBytes = Number(process.env.CLOUDFLARE_MAX_ASSET_BYTES || 25 * 1024 * 1024);

if (![warningLimit, safetyLimit, hardLimit, maxFileBytes].every(Number.isFinite)) {
  throw new Error('Cloudflare asset guard limits must be valid numbers.');
}
if (!(warningLimit < safetyLimit && safetyLimit < hardLimit)) {
  throw new Error('Expected warningLimit < safetyLimit < hardLimit.');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

let files;
try {
  files = await walk(outputDir);
} catch (error) {
  if (error?.code === 'ENOENT') {
    throw new Error(`Cloudflare asset guard could not find build output: ${relative(root, outputDir)}`);
  }
  throw error;
}

const byTopLevel = new Map();
const oversized = [];
let totalBytes = 0;

for (const file of files) {
  const info = await stat(file);
  totalBytes += info.size;
  const rel = relative(outputDir, file).replaceAll('\\', '/');
  const topLevel = rel.includes('/') ? rel.split('/')[0] : '(root)';
  byTopLevel.set(topLevel, (byTopLevel.get(topLevel) || 0) + 1);
  if (info.size > maxFileBytes) oversized.push({ path: rel, bytes: info.size });
}

const groups = [...byTopLevel.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
const pct = ((files.length / hardLimit) * 100).toFixed(2);
const mib = (totalBytes / 1024 / 1024).toFixed(2);

console.log(`Cloudflare asset guard: ${files.length.toLocaleString()} files (${pct}% of ${hardLimit.toLocaleString()} hard limit), ${mib} MiB total.`);
if (groups.length) {
  console.log('Largest output groups by file count:');
  for (const [name, count] of groups) console.log(`  ${name}: ${count.toLocaleString()}`);
}

if (oversized.length) {
  console.error(`\nERROR: ${oversized.length} asset(s) exceed ${(maxFileBytes / 1024 / 1024).toFixed(0)} MiB:`);
  for (const item of oversized.slice(0, 20)) {
    console.error(`  ${item.path}: ${(item.bytes / 1024 / 1024).toFixed(2)} MiB`);
  }
  process.exit(1);
}

if (files.length >= hardLimit) {
  console.error(`\nERROR: Build output has ${files.length.toLocaleString()} files and reaches/exceeds Cloudflare Free's ${hardLimit.toLocaleString()} file limit.`);
  process.exit(1);
}
if (files.length >= safetyLimit) {
  console.error(`\nERROR: Build output has ${files.length.toLocaleString()} files. Safety ceiling is ${safetyLimit.toLocaleString()} to leave deployment headroom below Cloudflare's hard limit.`);
  process.exit(1);
}
if (files.length >= warningLimit) {
  console.warn(`\nWARNING: Build output has ${files.length.toLocaleString()} files. Investigate route/static-asset growth before it reaches ${safetyLimit.toLocaleString()}.`);
} else {
  console.log(`OK: comfortably below the ${warningLimit.toLocaleString()} early-warning threshold.`);
}
