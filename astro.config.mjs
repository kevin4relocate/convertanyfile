import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const PREVIEW_ROUTES = new Set([
  'https://convertanyfile.net/fade-image-edges/',
]);

export default defineConfig({
  site: 'https://convertanyfile.net',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !PREVIEW_ROUTES.has(page) })],
  vite: {
    worker: { format: 'es' },
  },
});
