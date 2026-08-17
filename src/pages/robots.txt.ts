import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const prerender = true;
export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE.origin}/sitemap-index.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
