import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // www is the host that serves; the apex currently 522s. Everything absolute
  // (canonical, OG, RSS, sitemap) is built against this value.
  site: 'https://www.boardroomwire.com',
  integrations: [
    mdx(),
    // the 404 and the private telemetry dashboard stay out of the sitemap
    sitemap({ filter: (page) => !page.endsWith('/404/') && !page.includes('/telemetry/') }),
  ],
});
