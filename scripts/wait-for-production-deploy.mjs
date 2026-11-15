/**
 * Wait until Cloudflare Pages serves exactly the commit validated by the CI run.
 * Avoid falsely marking an older deployment as healthy immediately after a merge.
 */
const expected = (process.env.EXPECTED_RELEASE_SHA || '').trim();
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://convertanyfile.net';
const timeoutMs = 240_000;
const intervalMs = 10_000;

if (!expected) {
  console.log('No expected SHA was supplied (manual/preview run); deployment identity wait skipped.');
  process.exit(0);
}
if (!/^[0-9a-f]{40}$/.test(expected)) {
  console.error('EXPECTED_RELEASE_SHA must be a full 40-character Git commit SHA.');
  process.exit(1);
}

const endpoint = new URL('/build-info.json', baseUrl);
const started = Date.now();
let attempt = 0;
let observation = 'no response';

while (Date.now() - started < timeoutMs) {
  attempt++;
  const url = new URL(endpoint);
  url.searchParams.set('audit_attempt', String(attempt));
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
      headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    });
    if (response.ok) {
      const details = await response.json();
      const actual = details?.revision;
      observation = 'revision=' + String(actual);
      if (actual === expected) {
        console.log('Production deployment verified for ' + expected + ' after ' + attempt + ' checks.');
        process.exit(0);
      }
    } else {
      observation = 'HTTP ' + response.status;
    }
  } catch (error) {
    observation = error instanceof Error ? error.message : String(error);
  }
  console.log('Deployment check ' + attempt + ': ' + observation + '; expected ' + expected);
  await new Promise(resolve => setTimeout(resolve, intervalMs));
}
console.error('Production was not verified within '+Math.round(timeoutMs/1000)+' seconds. Last observation: '+observation);
console.error('Check Cloudflare Pages deployments, build-info.json and CF_PAGES_COMMIT_SHA. Do not treat an older release as audited.');
process.exit(1);
