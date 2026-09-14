import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // www is the host that serves; the apex currently 522s. Everything absolute
  // (canonical, OG, RSS, sitemap) is built against this value.
  site: 'https://www.boardroomwire.com',
  integrations: [
    mdx(),
    sitemap({ filter: (page) => !page.endsWith('/404/') }),
  ],
});
