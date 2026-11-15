import { readFile, stat } from 'node:fs/promises';

const expected = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown';
const output = new URL('../dist/build-info.json', import.meta.url);
let data;
try {
  await stat(output);
  data = JSON.parse(await readFile(output, 'utf8'));
} catch (error) {
  console.error('Missing or invalid dist/build-info.json. The production audit cannot verify deployment identity.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
if (data?.site !== 'ConvertAnyFile' || !data.builtAt || !Number.isFinite(Date.parse(data.builtAt))) {
  console.error('dist/build-info.json is missing its expected public metadata.');
  process.exit(1);
}
if (data.revision !== expected) {
  console.error('Build fingerprint mismatch: expected=' + expected + ', actual=' + String(data.revision));
  process.exit(1);
}
if (expected !== 'unknown' && !/^[0-9a-f]{40}$/.test(expected)) {
  console.error('Expected Git commit revision is not a 40-character lowercase SHA.');
  process.exit(1);
}
console.log('Build fingerprint verified: ' + data.revision + '; generated ' + data.builtAt);
