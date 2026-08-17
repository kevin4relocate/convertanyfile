import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://convertanyfile.net',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  vite: {
    worker: { format: 'es' },
  },
});
