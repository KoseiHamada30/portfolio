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
  // Phase 9: the Info page became About (DESIGN.md §8.4); old links keep working.
  // Sources are base-relative, but destinations are used as written, so they include the base.
  redirects: {
    '/info': `${REPO_BASE}/about/`,
    '/ja/info': `${REPO_BASE}/ja/about/`,
  },
  i18n: {
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
