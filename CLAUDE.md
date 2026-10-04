# Boardroom Wire website — working notes for Claude Code

This is the website of Boardroom Wire, a YouTube channel on the business of AI. The channel's constitution (mission, standards, the
writer's voice) is `C:\Users\dakot\OneDrive\Desktop\Boardroom 2.0\BOARDROOMWIRE.md`; the agent contract (roles, non-negotiables) is
`…\Boardroom 2.0\AGENTS.md`. Read both before writing visitor copy. This repo's own facts and traps are `docs\NOTES.md`; read it
before changing anything here. Session audit logs live in `…\Boardroom 2.0\Boardroom Wire Memory\audit-log\`.

Repo facts:

- Astro 5, static. `master` auto-deploys to https://www.boardroomwire.com via Cloudflare Pages; any pushed branch gets a preview at
  `https://<branch-slug>.boardroom-wire.pages.dev`. Articles go branch → preview → merge on the writer's word; small copy and layout
  fixes are merged and live (the writer, 24 Sep 2026), not parked on a preview with a question attached.
- `index`, `about`, `videos` are standalone pages with inline styles; `/wire/` and `/analytics/` use `src/layouts/Site.astro`.
- Dashboards enter the site only through `src/components/DashboardEmbed.astro` and the manifest in `src/data/analytics.ts`; the
  manifest must stay free of `astro:*` imports because `scripts/render-posters.mjs` imports it under Node.
- Publishing an article: README "Publishing an article with dashboards" and `docs\NOTES.md`. The video's copy arrives in the
  production repo as `videos\<slug>\ship\site\ARTICLE.md` and `site\BOARDS.json`; when live, run `bw ship set article=… analytics=…` there.
- Visitor copy carries no build jargon and no em dashes, and passes the voice review (`/voice --copy` in the production repo).
- `site` is www on purpose (the apex 301s to www since 27 Sep). Tailwind is installed but not wired in; ignore it.
- Commit messages: `area: short description`, with a body explaining why.
