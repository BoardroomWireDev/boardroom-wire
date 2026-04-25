# Boardroom Wire — Website Design Spec

> **For Claude Code:** This is the source of truth for brand, design, and content decisions on this project. Re-read this at the start of every session. When in doubt about a styling, naming, or structural decision, consult this file before asking the user. If a decision isn't covered here, ask before improvising.

---

## 1. Project Overview

**What this is:** The Boardroom Wire website — a content hub and growth surface for the YouTube channel of the same name. Eventually a media company; for now, a blog + video archive + research dashboards site that builds SEO authority and gives the brand a home outside YouTube.

**Who's building it:** Dakotah Radabaugh — solo operator, novice developer, comfortable in VS Code, building with Claude Code. Explanations and reasoning are welcome alongside code.

**Tech stack:**
- **Framework:** Astro (content-first, SEO-strong, ships zero JS by default)
- **Styling:** Tailwind CSS
- **Content:** Markdown / MDX in `src/content/` (Astro Content Collections)
- **Deployment:** Vercel (auto-deploy from `main` branch on GitHub)
- **Analytics:** Plausible (or GA4 if cost matters)
- **Domain:** boardroomwire.com (or chosen variant)

**Success criteria for the site:**
1. Loads in <1.5s on mobile (Core Web Vitals all green)
2. Every page is indexable and has proper structured data
3. Visually unmistakable as Boardroom Wire — anyone who knows the YouTube channel sees it and immediately recognizes the brand
4. Easy to publish a new article or video page in under 5 minutes

---

## 2. Brand Identity

### Positioning

Boardroom Wire is **forensic business analysis of AI companies and tech industry developments** — Bloomberg-style depth, PE/banker lens, no hype. The differentiator: 8+ years in PE tech sales applied to AI coverage. Strategic breakdowns, not product reviews.

### Audience

Sophisticated viewers who want depth: operators, investors, builders, finance/tech professionals. They're tired of surface-level AI commentary. They want frameworks, numbers, and verdicts.

### Voice & Tone

| Trait | What it means in practice |
|-------|---------------------------|
| **Analytical** | Lead with frameworks and data, not hot takes |
| **Confident** | State the verdict; don't hedge |
| **Compressed** | Every sentence earns its place. Cut adjectives. |
| **Wry** | Dry observations land harder than jokes |
| **Documentary** | "Former" not "Ex-". "Reuters voice" — matter-of-fact, evidence-first |

**Phrases we use:** "Here's the thing most coverage misses." "The numbers tell the story." "That's the verdict."

**Phrases we avoid:** "Game-changer." "Revolutionary." "Disruptive." "In today's fast-paced world." Any LinkedIn-influencer cadence.

### Tagline / Positioning lines

- **Primary:** "Forensic analysis of the companies shaping the future."
- **Short:** "The business of AI, decoded."
- **One-word:** Decoded. Forensic. Strategic.

---

## 3. Visual Design System

### Color Palette

The palette is **dark navy + cream + gold** — Bloomberg Terminal aesthetic, premium feel, high contrast.

| Token | Hex | Usage |
|-------|-----|-------|
| `navy` | `#1a1a2e` | Primary background |
| `navy-deep` | `#0f0f1e` | Section backgrounds, headers |
| `navy-soft` | `#252540` | Cards, elevated surfaces |
| `cream` | `#f5f5dc` | Primary text on dark, light surfaces |
| `cream-muted` | `#d4d4b8` | Secondary text on dark |
| `gold` | `#c9a84c` | Accent, links, highlights, CTAs |
| `gold-bright` | `#e6c463` | Hover states, emphasis |
| `gray-line` | `#3a3a52` | Dividers, subtle borders |
| `red-signal` | `#c44545` | Negative numbers, warnings (use sparingly) |
| `green-signal` | `#4a9d6e` | Positive numbers, gains (use sparingly) |

**Tailwind config snippet** (drop into `tailwind.config.mjs`):

```js
theme: {
  extend: {
    colors: {
      navy: { DEFAULT: '#1a1a2e', deep: '#0f0f1e', soft: '#252540' },
      cream: { DEFAULT: '#f5f5dc', muted: '#d4d4b8' },
      gold: { DEFAULT: '#c9a84c', bright: '#e6c463' },
      'gray-line': '#3a3a52',
      signal: { red: '#c44545', green: '#4a9d6e' },
    },
  },
}
```

### Typography

Two fonts. No more. Load from Google Fonts.

| Use | Font | Weights |
|-----|------|---------|
| Headings, display, logo wordmark | **DM Serif Display** | 400 |
| Body, UI, navigation, captions | **DM Sans** | 400, 500, 600, 700 |

**Font import** (in `src/layouts/BaseLayout.astro` `<head>`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

**Tailwind font config:**

```js
fontFamily: {
  serif: ['"DM Serif Display"', 'serif'],
  sans: ['"DM Sans"', 'sans-serif'],
}
```

### Type Scale

| Element | Size (desktop) | Size (mobile) | Class |
|---------|----------------|---------------|-------|
| H1 / Page title | 56px | 36px | `font-serif text-4xl md:text-6xl` |
| H2 / Section | 36px | 28px | `font-serif text-3xl md:text-4xl` |
| H3 / Subsection | 24px | 20px | `font-sans font-semibold text-xl md:text-2xl` |
| Body | 18px | 16px | `font-sans text-base md:text-lg leading-relaxed` |
| Small / Caption | 14px | 13px | `font-sans text-sm text-cream-muted` |
| Micro / Label | 12px | 12px | `font-sans uppercase tracking-wider text-xs` |

### Spacing & Layout

- **Max content width:** 1280px (containers), 720px (article body)
- **Section vertical padding:** `py-16 md:py-24`
- **Component spacing:** stick to Tailwind's 4/8/12/16/24 scale — don't invent values
- **Grid:** 12-column on desktop, single column on mobile
- **Border radius:** `rounded-md` (6px) for cards, `rounded-sm` (2px) for tags/labels — never `rounded-full` except on avatars

### Visual Principles

1. **Dense, not cluttered.** Bloomberg Terminal energy: lots of information, organized into clear zones with strong hierarchy.
2. **Data-forward.** Numbers should be visually prominent — large, often in serif, often gold.
3. **Sharp edges.** Minimal use of soft shadows or rounded corners. The brand reads "publication," not "SaaS."
4. **One accent at a time.** Gold is the only accent color. Don't introduce others. Red/green only for actual data signals.
5. **Generous whitespace within tight layouts.** Cards can be packed; the page itself should breathe.
6. **No stock photography.** Ever. Use abstract data viz, custom illustrations, or content-relevant screenshots only.

---

## 4. Component Patterns

### Article Card (for blog index)

```
┌──────────────────────────────┐
│ [LABEL: CATEGORY] · 4 MIN    │  ← gold uppercase micro-text
│                              │
│ Article Title in DM Serif    │  ← serif, large
│ Display, two lines max       │
│                              │
│ One-sentence dek that gives  │  ← sans, cream-muted
│ the angle without spoiling.  │
│                              │
│ APR 25, 2026 →               │  ← micro text
└──────────────────────────────┘
```

### Video Card

Same structure as article card, but with:
- 16:9 thumbnail at top
- "WATCH" label in gold instead of category
- Runtime in micro text bottom-left

### Quote Block (in articles)

Large serif text, gold left border (`border-l-4 border-gold pl-6`), attribution underneath in micro-text.

### Data Stat Block

Use for callout numbers in articles. Big serif number in gold, label below in cream-muted micro-text. Often grouped 3-across.

### Buttons

- **Primary:** `bg-gold text-navy font-semibold px-6 py-3 hover:bg-gold-bright`
- **Secondary:** `border border-gold text-gold px-6 py-3 hover:bg-gold hover:text-navy`
- **Tertiary / link:** `text-gold underline-offset-4 hover:underline`

No gradient buttons. No drop shadows on buttons.

---

## 5. Site Architecture

### URL structure (lock these in now — don't migrate later)

```
/                          → Homepage
/articles/                 → Blog index
/articles/[slug]/          → Individual article
/videos/                   → Video archive
/videos/[slug]/            → Individual video page (embed + transcript + dashboards)
/research/                 → Dashboard archive
/research/[slug]/          → Individual research dashboard
/about/                    → About page
/newsletter/               → Newsletter signup + archive
/categories/[category]/    → Category index (e.g. /categories/business-of-ai/)
/tags/[tag]/               → Tag index
/rss.xml                   → RSS feed
/sitemap.xml               → Auto-generated by @astrojs/sitemap
```

### Content categories (mirror YouTube content pillars)

- `business-of-ai`
- `private-markets`
- `titan-strategy`
- `market-dynamics`

Use these as both category slugs and visual labels site-wide.

### Navigation

**Top nav (desktop):** Logo · Articles · Videos · Research · About · [Newsletter CTA]
**Top nav (mobile):** Logo · Hamburger
**Footer:** Categories · Social (YouTube, X) · Newsletter · Legal

---

## 6. SEO Standards

Every page must have:

- **Unique `<title>`** — pattern: `[Page Title] · Boardroom Wire`
- **Meta description** — 140–160 chars, written for humans not crawlers
- **OpenGraph image** — 1200×630, on-brand (use a template; never ship without one)
- **Canonical URL** — set explicitly
- **Structured data (JSON-LD):**
  - Articles → `Article` schema with author, datePublished, image
  - Video pages → `VideoObject` schema with thumbnailUrl, uploadDate, embedUrl
  - Homepage → `Organization` schema
- **Semantic HTML** — `<article>`, `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` used correctly
- **Image `alt` text** — descriptive, not "image of"

`robots.txt` allows everything. `sitemap.xml` regenerates on build.

---

## 7. Content Patterns

### Article structure

Articles are short-to-medium form (600–1500 words). They should feel like research notes, not blog posts.

```
[Category label]
Headline (DM Serif, large)
Dek (one sentence, cream-muted)
Byline + date
─────────────
Lead paragraph (the thesis)
Body — short paragraphs, frequent stat callouts
Quote blocks for primary sources
Data stat blocks for key numbers
Closing — the verdict, in one paragraph
─────────────
[Related video card if applicable]
[Newsletter CTA block]
```

### Video page structure

```
[Category label]
Video title
Dek (the thesis in one sentence)
─────────────
[YouTube embed — 16:9, lazy-loaded]
─────────────
[Key takeaways — bulleted, 4–6 items]
[Featured dashboards — 2–3 dashboard images/embeds]
[Transcript — collapsed by default, expandable]
─────────────
[Newsletter CTA block]
```

### Homepage structure

1. Hero — current/featured piece (article or video), full-bleed
2. Latest articles (3-card grid)
3. Latest videos (3-card grid)
4. Featured research/dashboards (2-up)
5. Newsletter signup (full-width band, navy-deep background, gold CTA)
6. Category nav grid (4 cards, one per pillar)

---

## 8. Technical Standards

### Performance budgets

- **LCP** under 1.5s on 4G mobile
- **CLS** under 0.05
- **JS bundle** under 50kb on any page (Astro makes this easy — only hydrate components that need it)
- **Images** must be served via Astro's `<Image />` component (auto WebP/AVIF, lazy loading)

### Accessibility (non-negotiable)

- Color contrast ≥ 4.5:1 for body text, 3:1 for large text — verify every gold-on-navy pairing
- All interactive elements keyboard-accessible with visible focus rings (`focus:ring-2 focus:ring-gold`)
- `prefers-reduced-motion` respected — no autoplay animations for users who opt out
- Form inputs have associated labels; never rely on placeholder alone

### Code conventions

- **Astro components:** PascalCase, one component per file (`ArticleCard.astro`)
- **Utility files:** kebab-case (`format-date.ts`)
- **Content files:** kebab-case slugs (`openai-is-cooked.md`)
- **No inline styles** — Tailwind classes only. If you need a custom value, add it to `tailwind.config.mjs`.
- **Comments:** explain *why*, not *what*. Code should be self-documenting on the *what*.

### File structure

```
src/
├── components/        Reusable UI components
├── content/           Markdown content collections
│   ├── articles/
│   ├── videos/
│   └── research/
├── layouts/           Page layouts (BaseLayout, ArticleLayout, etc.)
├── pages/             Routes (Astro auto-generates from this)
├── styles/            Global CSS (minimal — most styling via Tailwind)
└── utils/             Helper functions
public/
├── fonts/             (only if self-hosting)
├── images/
│   ├── og/           OpenGraph templates
│   ├── logo/
│   └── articles/
└── favicon.ico
```

---

## 9. Working With This Spec (for Claude Code)

**At the start of every session:**
1. Read this file in full.
2. Run `git status` and tell me what's changed since last session.
3. Confirm what we're working on before writing code.

**When making decisions:**
- If it's covered here → follow it. No deviations without asking.
- If it's not covered → ask me before deciding. Don't improvise on brand or architecture.
- If you think this spec is wrong → say so explicitly and propose the change. We'll update the spec, then write the code.

**When writing code:**
- Explain what each non-obvious change does. I'm learning.
- Show me the diff before applying it on anything substantial.
- Commit messages: `area: short description` (e.g. `articles: add OpenGraph image generation`).
- One concern per commit.

**When you're stuck:**
- Tell me you're stuck. Don't loop.
- Show me the error message verbatim. Don't paraphrase.
- Suggest 2–3 paths forward and let me pick.

**Things to never do without explicit permission:**
- Add a new dependency
- Change brand colors, fonts, or core architecture decisions
- Delete content files
- Push to `main` (always work on a branch + PR for anything non-trivial, or at minimum show me the commit before pushing)
- Add tracking, analytics, or third-party scripts beyond what's already specified

---

## 10. Out of Scope (for now)

To keep this from sprawling, these are explicitly *not* part of v1:

- Comment systems
- User accounts / login
- Paid memberships / paywall
- CMS (we're using markdown files until volume justifies a CMS)
- Search beyond simple client-side filter on the article index
- Multi-language
- Native mobile app

Revisit at 100 articles or when there's a clear reason.

---

*Last updated: April 2026 · v1.0*
