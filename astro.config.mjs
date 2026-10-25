// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// GitHub repo KoseiHamada30/portfolio → https://koseihamada30.github.io/portfolio/
// Change to '/' only if a custom domain is added.
const REPO_BASE = '/portfolio';

// https://astro.build/config
export default defineConfig({
  site: 'https://koseihamada30.github.io',
  base: REPO_BASE,
  integrations: [mdx()],
  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
