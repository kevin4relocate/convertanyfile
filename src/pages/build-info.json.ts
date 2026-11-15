import type { APIRoute } from 'astro';

// A non-sensitive build fingerprint for independently verifying Cloudflare deployment.
// Cloudflare Pages defines CF_PAGES_COMMIT_SHA during its build process.
// CI defines GITHUB_SHA; local builds intentionally report "unknown".
export const prerender = true;

export const GET: APIRoute = () => {
  const revision = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown';
  return new Response(JSON.stringify({
    site: 'ConvertAnyFile',
    revision,
    builtAt: new Date().toISOString(),
  }) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, must-revalidate',
    },
  });
};
