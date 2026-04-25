# Boardroom Wire — Website

Forensic analysis of the companies shaping the future. Content hub and growth surface for the [Boardroom Wire](https://www.youtube.com/) YouTube channel.

The single source of truth for brand, design, and architecture decisions is [`design-spec.md`](./design-spec.md). Read it before changing anything visual or structural.

---

## Stack

- [Astro 5](https://astro.build/) — static site generator, ships zero JS by default
- [Tailwind CSS 3](https://tailwindcss.com/) — design tokens defined in [`tailwind.config.mjs`](./tailwind.config.mjs)
- [MDX](https://mdxjs.com/) — for article and video pages with embeddable components
- Content authored as Markdown / MDX in [`src/content/`](./src/content/)
- RSS via `@astrojs/rss`, sitemap via `@astrojs/sitemap`

## Local development

Requires Node 18.20.8+ or 20.3.0+ (Node 22 LTS recommended).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output to dist/
npm run preview  # serve the built site locally
```

## Project structure

```
src/
├── components/   reusable UI (Nav, Footer, ArticleCard, VideoCard, etc.)
├── content/      Markdown / MDX content collections (articles, videos, research)
├── layouts/      BaseLayout + per-type layouts (Article, Video, Research)
├── pages/        routes (Astro auto-generates URLs from this tree)
├── styles/       global CSS (Tailwind directives + .article-prose)
└── utils/        helpers (e.g. date formatting)
public/           static files served as-is (robots.txt, favicon, OG images)
```

## Authoring content

Add a Markdown or MDX file under `src/content/<collection>/`:

- `src/content/articles/` for blog posts → publishes to `/articles/<slug>/`
- `src/content/videos/` for video pages → publishes to `/videos/<slug>/`
- `src/content/research/` for dashboards → publishes to `/research/<slug>/`

Required frontmatter (per [`src/content/config.ts`](./src/content/config.ts)):

```yaml
---
title: "Headline"
dek: "One-sentence angle."
category: business-of-ai          # one of the four pillars
tags: [openai, financials]
publishDate: 2026-04-25
draft: false
# article-only: image (optional), readTime (optional)
# video-only: youtubeId (required), runtime "MM:SS" (required), keyTakeaways (optional)
# research-only: dashboards [{ title, image?, embedUrl? }] (optional)
---
```

`draft: true` excludes a piece from index pages, RSS, and sitemaps.

## Deployment

Not deployed yet. Target is Vercel from `main` (the spec's preference). Adapter and CI wiring land in a later milestone.

## Roadmap

The current milestone (foundation skeleton) wires up the brand and routes end-to-end with no content. Next milestones, in rough order:

1. Visual polish pass — hero treatments, dashboard styling, animation
2. Per-page OG image generation (probably via [satori](https://github.com/vercel/satori))
3. Vercel deployment + analytics (Plausible)
4. Newsletter provider integration
5. First real content authoring pass

See [`design-spec.md` section 10](./design-spec.md) for what's explicitly out of scope for v1.
