import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// A Cloudflare build without the YouTube key ships a site with an empty Videos page and a dead ticker. That happened
// on 27 Sep 2026: adding wrangler.toml made it the source of truth for the project's variables, and the dashboard's
// PUBLIC_YOUTUBE_API_KEY vanished without an error. The key now lives as a Pages secret, which survives the config file
// and reaches the build. If it is ever missing again, fail the build so the last good deployment stays live.
if (process.env.CF_PAGES && !process.env.PUBLIC_YOUTUBE_API_KEY) {
  throw new Error('PUBLIC_YOUTUBE_API_KEY is missing from this Cloudflare build. Set it as a Pages secret: '
    + 'npx wrangler pages secret put PUBLIC_YOUTUBE_API_KEY --project-name boardroom-wire (and again with --env preview).');
}

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
