# Boardroom Wire — Website

Forensic analysis of the companies shaping the future. Content hub for the
[Boardroom Wire](https://www.youtube.com/channel/UCthfphsDjHppg9SQv3JTdrg) YouTube channel.
Live at https://www.boardroomwire.com.

Brand and design decisions live in [`design-spec.md`](./design-spec.md).

## Stack

- [Astro 5](https://astro.build/), static output, zero JS by default
- Articles as MDX in a content collection (`src/content/articles/`)
- Dashboards as self-contained HTML in `public/analytics/<collection>/`, described by
  the manifest in `src/data/analytics.ts`
- RSS via `@astrojs/rss`, sitemap via `@astrojs/sitemap`
- Deployed by Cloudflare Pages from `master`; every pushed branch gets a preview at
  `https://<branch-slug>.boardroom-wire.pages.dev`

Tailwind is installed but not wired in and not used. Ignore it.

## Local development

Node 22.6+ (24 recommended — the poster script imports the TypeScript manifest).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output to dist/
npm run preview  # serve the built site locally
```

## Where things are

```
src/
├── components/
│   ├── DashboardEmbed.astro   the one way a dashboard appears on the site
│   └── YouTubeLite.astro      click-to-load video, or a channel CTA when no id yet
├── content/articles/          one .mdx per article → /wire/<file-name>/
├── content.config.ts          the articles schema
├── data/analytics.ts          the dashboard manifest (collections, chips, paths)
├── layouts/Site.astro         shell for /wire/ and /analytics/ (ticker, head, footer)
├── lib/youtube.ts             channel stats for the ticker
└── pages/
    ├── index / about / videos standalone pages with inline styles (left as they are)
    ├── wire/                  article index + article pages
    ├── analytics/             hub, [collection] index, [collection]/[slug] pages
    ├── rss.xml.ts             feed of articles
    └── 404.astro
public/analytics/<collection>/ the dashboards themselves + generated posters
scripts/
├── sync-dashboards.mjs        copies a video's dashboards folder into public/
└── render-posters.mjs         headless-Chrome stills: poster, thumb, OG image
```

## Publishing an article with dashboards

What you need: the essay as markdown, the video's `dashboards/` folder (boards that
honour the `?final&still` capture contract, plus `shared/`), and four frontmatter
values: title, dek, publish date, YouTube id (or leave it out until the video is up).

1. **Add the dashboard collection** to `src/data/analytics.ts`: one `Collection` with an
   entry per board (`slug`, `file`, `title`, public-facing `blurb`, `section`, `source`
   of `primary` / `reported` / `estimate`, `sourceNote`, `key`), a `hero` slug, a
   `headline`, and the `method` copy. Put it first in `collections` (newest first).
2. **Point the sync script at the folder**: add the slug to `SOURCES` in
   `scripts/sync-dashboards.mjs`, then

   ```bash
   npm run sync:dashboards -- --only <slug>
   npm run render:posters -- --only <slug>
   ```

   The sync skips `index.html`, `posters/`, `beats.json` and `scripts/`; the render
   writes `posters/`, `posters/thumb/` and `posters/og/`.
3. **Write the article** at `src/content/articles/<slug>.mdx`. Paste the essay under the
   frontmatter and drop a line wherever a chart belongs:

   ```mdx
   <DashboardEmbed collection="cursor" slug="where-the-dollar-goes" />
   ```

   Blank lines above and below. A wrong slug fails the build, on purpose.
   Set `draft: true` to keep it off the production index, feed and sitemap while it is
   reviewed; previews always show drafts.
4. **Preview**: `git checkout -b feat/<slug>`, `npm run build`, commit the article, the
   manifest change, `public/analytics/<slug>/` and its posters, push, and open the
   Cloudflare preview URL for the branch.
5. **Publish**: merge to `master`. Check `/wire/<slug>/`, `/analytics/<slug>/`,
   `/rss.xml` and `/sitemap-0.xml` on www.

Commit messages follow `area: short description`.

## How the embed behaves

Dashboards are authored at a fixed 1920×1080 for video capture, so the site scales
them rather than reflowing them. In an article each board plays its reveal as it
scrolls into view, and boards well out of view go back to their poster (replaying on
return) so a long article never runs them all at once; Fullscreen letterboxes a board
to the screen. On a dashboard's own page the live board plays at once, with Replay and
Fullscreen. "Open full screen" opens the raw board, where its own R and F keys work.
Under 900px the poster stands in for the board and a tap opens the full-size image.
