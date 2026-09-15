# Boardroom Wire website — working notes for Claude Code

The consolidated memory for all Boardroom Wire work (channel, dashboard system, this site's
architecture, publishing cadence, gotchas, open items) is at
`C:\Users\dakot\OneDrive\Desktop\Boardroom 2.0\Boardroom Wire Memory\boardroom-wire-memory.md`.
Read it before changing anything here. Session audit logs live beside it in `audit-log/`.

Repo facts:

- Astro 5, static. `master` auto-deploys to https://www.boardroomwire.com via Cloudflare
  Pages; any pushed branch gets a preview at `https://<branch-slug>.boardroom-wire.pages.dev`.
  Work on a branch and merge only when the user says so.
- `index`, `about`, `videos` are standalone pages with inline styles; `/wire/` and
  `/analytics/` use `src/layouts/Site.astro`.
- Dashboards enter the site only through `src/components/DashboardEmbed.astro` and the
  manifest in `src/data/analytics.ts`; the manifest must stay free of `astro:*` imports
  because `scripts/render-posters.mjs` imports it under Node.
- Publishing an article: see README "Publishing an article with dashboards".
- Tailwind is installed but not wired in; ignore it. `site` is www on purpose (the apex 522s).
- Commit messages: `area: short description`, with a body explaining why.
