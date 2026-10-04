# Website notes

Site facts and traps only, moved from the channel memory (§5, §6) on 3 Oct 2026. The constitution (`BOARDROOMWIRE.md`) and the
agent contract (`AGENTS.md`) live in the Boardroom 2.0 repo; read them for voice, standards and roles. Check production at www.

**Deploys.** Astro 5, static. `master` auto-deploys through Cloudflare Pages to https://www.boardroomwire.com; a pushed branch gets
`https://<branch-slug>.boardroom-wire.pages.dev`; the apex 301s to www (27 Sep). Small copy and layout edits are merged and polled
live until the old markup stops coming back (about 6 minutes); articles go branch → build → preview → merge. "Workers Builds" fails off master: noise.
**Publishing an article.** A `Collection` in `src/data/analytics.ts` (newest first); the folder in `SOURCES` of
`scripts/sync-dashboards.mjs` (a `BOARDS` list when it also holds the cut's pages), then `sync:dashboards` and `render:posters` with
`--only <slug>`; `src/content/articles/<slug>.mdx` with a `<DashboardEmbed>` where each chart lands (a bad slug fails the build on
purpose); after merge check `/wire/<slug>/`, `/analytics/<slug>/`, `/rss.xml`, the sitemap. Links to the site carry `utm_*` tags.
The video's copy arrives as `videos\<slug>\ship\site\ARTICLE.md` and `site\BOARDS.json`; when the article is live, record it in the
video with `bw ship set article=<url> analytics=<url>` (the one write the website session makes in the production repo).
**Embeds.** Only through `DashboardEmbed.astro`: scaled 1920×1080 iframes that reveal on scroll into view, park to their poster well
out of view and never unmount in view; under 900px a poster and a tap. A cap of two live boards read as "broken" and click-to-play
was worse: both rejected. Web boards need an idle state and must honour `?replay`.
**Copy and look.** Visitor copy reads as editorial: no build jargon, no em dashes. The look stays (the writer, 30 Sep): do not re-flag
the CRT overlay, glow, tracked capitals, two-beat headlines, chart blurbs or v4 boards; rules 12 and 16 are video rules. Analytics
is off the homepage, footer and 404 ("bigger plans") and reached from each article; `/analytics/` pages stay live (embeds and
Substack images use them). `src/components/SeoHead.astro` is the one head. One tagline: "Strategic analysis of business and technology".
**Build-time keys.** The repo is public. `PUBLIC_YOUTUBE_API_KEY` is a Pages secret the writer sets in their own terminal (`npx wrangler
pages secret put … --project-name boardroom-wire`, plus `--env preview`), never in `wrangler.toml`: once that file existed, Pages
silently dropped every dashboard variable and /videos/ shipped empty. After any hosting change check the live ticker and /videos/.
**The globe.** `public/globe/land-*.bin` stores ring counts: never recompute them. Reduced motion means CALM, not frozen (45% spin, no
swoops); the writer's PC reports reduced motion, so boards load at `?final` there. Frame dt is capped at 50 ms: under SwiftShader wait
on `__gv2.st.flyTo === null`, not a sleep. `--virtual-time-budget` never finishes on the homepage; use real time.
**Telemetry.** First-party only: no names or emails for anonymous visitors (GDPR and wiretap risk, low match rates, and a filings channel
identifying readers is a story); names only through a consented signup. No IP, no cookies, GPC and DNT honoured, bots flagged.
`/telemetry/` is behind Access ("Only me"); Access apps are the writer's clicks, and previews cannot show it (use `wrangler pages
dev`). No dual-axis charts. Series colours YouTube #AD8C29, site #3987e5; brand gold stays UI-only.
**Collector.** `bw-collector` deploys by hand (`npm run collector:deploy`, must print `schedule: 23 6 * * *`). Never test an
every-minute cron: it kept firing for hours and D1's free 100,000 rows a day ran out (writes fail until 00:00 UTC); run a job once
with `wrangler dev --remote --test-scheduled`. Run `npm run cf:history` at least monthly (Cloudflare keeps 30 days).
**YouTube data.** The OAuth app stays In production (Testing revokes the token every 7 days). No impressions or CTR in the API;
`SUBSCRIBER` traffic means Browse features; Analytics lags the counter by 2–3 days; retry a 500 once; Shorts run up to 3 minutes.
Apply a branch's migrations from that branch's checkout: "No migrations to apply" says nothing about the live database.
**Traps.** Six files are CRLF (`Site.astro`, `index`, `about`, `videos`, `wire/[slug]`, `analytics/[collection]/index`): match `\r?\n`,
and Git Bash `sed -i` strips the CR (edit with the Edit tool or Python on bytes). A capture a board needs must already be in the
video's `dashboards\assets\captures\` (agents cannot copy out of `stock-pack\`). Astro scopes `<style>` (script-built DOM and MDX prose
need `is:global`) and hoists a component script once per page. No `transform` on an ancestor of a fullscreen target. `astro preview`
listens on `[::1]`; `git merge -F -` does not read stdin; headless Chrome cannot verify a live reveal: check embeds in a real browser.
