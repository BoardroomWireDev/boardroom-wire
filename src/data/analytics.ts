/**
 * Analytics manifest — the single source of truth for the /analytics/ routes.
 *
 * The hub, the collection pages, the per-dashboard pages, the article embeds
 * and the poster renderer all read from here. Adding a video's dashboard set
 * means appending another Collection, not editing pages.
 *
 * This file must stay plain TypeScript with no Astro imports: scripts/
 * render-posters.mjs imports it under Node.
 *
 * `source` drives the chip shown on the card and matches the chip already
 * baked into each dashboard frame:
 *   primary  — stated by the company, filed with the SEC, or published by the
 *              provider itself; stated flat
 *   reported — journalism, attributed on the dashboard itself
 *   estimate — analyst or survey modelling, or our own arithmetic on reported
 *              figures; marked as an estimate every time it appears
 */

export type SourceKind = 'primary' | 'reported' | 'estimate';

export interface Dashboard {
  /** Position in the video, 1-indexed. */
  n: number;
  /** URL segment: /analytics/<collection>/<slug>/ */
  slug: string;
  /** Filename inside the collection's public asset folder. */
  file: string;
  title: string;
  /** One line, shown on the card and as the meta description. */
  blurb: string;
  /** Where it sits in the video. */
  section: string;
  source: SourceKind;
  /** Attribution line shown under the embed. */
  sourceNote: string;
  /** One of the charts that carry the video. */
  key?: boolean;
}

export interface Collection {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  /** ISO date, used for the collection card and structured data. */
  published: string;
  /** Slug of the dashboard whose still fronts the collection card and OG image. */
  hero: string;
  /** Headline split for the collection page: "<lead> <dim>". */
  headline: { lead: string; dim: string };
  /** Chip label for primary sources, e.g. "SEC primary". */
  primaryLabel?: string;
  /** Methodology block: one line per chip state present in the set, plus a caveat. */
  method: { primary: string; reported: string; estimate?: string; caveat?: string };
  dashboards: Dashboard[];
}

export const chipLabel = (c: Collection, kind: SourceKind) =>
  kind === 'primary' ? (c.primaryLabel ?? 'Primary') : kind === 'reported' ? 'Reported' : 'Estimate';

export const heroOf = (c: Collection) =>
  c.dashboards.find((d) => d.slug === c.hero) ?? c.dashboards[0];

/* ==================================================================== */
/*  Cursor — Four College Friends                                        */
/* ==================================================================== */

export const cursor: Collection = {
  slug: 'cursor',
  title: 'Four College Friends — The $60B Cursor Deal',
  kicker: 'Twelve dashboards',
  summary:
    'Four MIT friends built the fastest revenue ramp in software history, lost money on every customer while doing it, and sold to SpaceX for $60 billion. The ramp, the negative margin, the closed ring of investors and the deal itself — charted, with every figure sourced on the frame.',
  published: '2026-09-14',
  hero: 'where-the-dollar-goes',
  headline: { lead: 'Four College Friends', dim: '— the $60B Cursor deal.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by the company, filed with the SEC (the Form 8-K share count) or published by the model providers themselves.',
    reported:
      'Sourced to journalism — Bloomberg, The Information, CNBC, TechCrunch, Fortune. Attribution is printed on the dashboard itself, not just here.',
    estimate:
      'Analyst or survey modelling — Sacra, Ramp, JetBrains, Forbes — or our own arithmetic on reported figures. Marked as an estimate every time it appears.',
    caveat:
      'Cursor never filed an S-1. Churn, net revenue retention, the seed valuation and 2026 headcount were never disclosed and are not charted. The −23% gross margin and the ~$900M loss originate with The Information and are credited on every frame that shows them.',
  },
  dashboards: [
    {
      n: 1,
      slug: 'the-founding-four',
      file: '01-founding-four.html',
      title: 'The Founding Four',
      blurb:
        'Four plates, four founders. Each held roughly 4.5% of the company, and each walked away with about $2.4 billion.',
      section: 'Origins',
      source: 'estimate',
      sourceNote:
        'Founder stakes and ~4.5% holdings: Forbes estimate, August 2026 · backgrounds per Contrary Research and company bios · Sanger and Lunnemark titled Cofounder where sources disagree on COO/CTO.',
    },
    {
      n: 2,
      slug: 'the-fork',
      file: '02-the-fork.html',
      title: 'The Fork',
      blurb:
        'GitHub Copilot sat on top of the editor and asked permission. Cursor forked the editor and owned every layer. The asymmetry is the whole strategy.',
      section: 'The pivot',
      source: 'primary',
      sourceNote:
        'Copilot: an extension inside VS Code · Cursor: a fork of VS Code, launched March 2023 · how each product attaches to the editor, per the companies.',
      key: true,
    },
    {
      n: 3,
      slug: 'the-100x-year',
      file: '03-100x-year.html',
      title: 'The 100× Year',
      blurb:
        'From about $1 million to $100 million in twelve months, on a log scale so the ramp reads as a ramp.',
      section: 'The revenue run',
      source: 'estimate',
      sourceNote:
        '$1M (Jan 2024) and $100M (Jan 2025) ARR: Sacra estimates · monthly figures are not reliably sourced; the line is the constant-growth path between the two anchors.',
    },
    {
      n: 4,
      slug: 'race-to-100m',
      file: '04-race-to-100m.html',
      title: 'Race to $100M',
      blurb:
        'Months from $1M to $100M ARR, on the same clock for everyone: Ramp 24, Deel 20, Wiz 18 — Cursor 12.',
      section: 'The revenue run',
      source: 'estimate',
      sourceNote:
        'Months from $1M to $100M ARR: Sacra estimates · the clock starts at $1M for every company · Cursor, December 2023 to January 2025.',
    },
    {
      n: 5,
      slug: 'same-milestone-different-business',
      file: '05-same-milestone.html',
      title: 'Same Milestone, Different Business',
      blurb:
        'Wiz reached $100 million with about 260 customers. Cursor reached it with about 360,000. Same revenue, 1,400× the customers, a very different business.',
      section: 'The revenue run',
      source: 'estimate',
      sourceNote:
        'Customer counts and average contract values: Sacra estimates · Wiz and Cursor at $100M ARR · 1,400× is 360,000 ÷ 260, our arithmetic.',
      key: true,
    },
    {
      n: 6,
      slug: 'the-full-ramp',
      file: '06-full-ramp.html',
      title: 'The Full Ramp',
      blurb:
        'Every milestone from $1M to $3B with the interval printed on each riser. Each doubling took less time than the last.',
      section: 'The revenue run',
      source: 'reported',
      sourceNote:
        '$500M and $1B stated by the company at its Series C and D · $2B and $3B reported by Bloomberg · $100M and ~$4B: Sacra estimates, drawn hollow.',
      key: true,
    },
    {
      n: 7,
      slug: 'the-funding-ladder',
      file: '07-funding-ladder.html',
      title: 'The Funding Ladder',
      blurb:
        'Seed to Series D: six rounds, roughly $3.3 billion raised, a $29.3 billion valuation — and a deliberate gap on the right of the frame.',
      section: 'Valuation',
      source: 'primary',
      sourceNote:
        'Rounds per company announcements; pre-seed and Series B per TechCrunch · seed post-money never disclosed · Series B reported between $100M and $150M, ~$105M used.',
    },
    {
      n: 8,
      slug: 'where-the-dollar-goes',
      file: '08-where-the-dollar-goes.html',
      title: 'Where the Dollar Goes',
      blurb:
        'For every dollar of revenue, $1.23 of cost. The cost bar breaks through the chart’s own frame; a normal software company sits beside it for scale.',
      section: 'The leaky token bucket',
      source: 'reported',
      sourceNote:
        'Source: The Information, April 2026 — quarter ended January 2026, at roughly $2.7B annualised revenue · $1.23 is derived from the −23% gross margin, not separately reported · FY2025 ~$770M revenue, ~$900M loss.',
      key: true,
    },
    {
      n: 9,
      slug: 'revenue-up-share-down',
      file: '09-revenue-up-share-down.html',
      title: 'Revenue Up, Share Down',
      blurb:
        'Revenue went from $500 million to $3 billion while share of corporate AI-coding spend fell from 41% to 26%. The lines cross.',
      section: 'The leaky token bucket',
      source: 'reported',
      sourceNote:
        'Revenue: company statements and Bloomberg · share of corporate AI-coding spend: Ramp, via CNBC (estimate) · workplace adoption: JetBrains surveys (estimate) · window June 2025 to May 2026.',
      key: true,
    },
    {
      n: 10,
      slug: 'composer-vs-opus',
      file: '10-composer-vs-opus.html',
      title: 'Composer vs Opus',
      blurb:
        '$0.50 against $5.00 per million tokens at list price — and why Cursor keeps a spread on Claude but keeps everything on Composer.',
      section: 'Fighting back',
      source: 'reported',
      sourceNote:
        'List prices per million tokens: Vantage and Cursor’s documentation; Anthropic for Opus · cache-read discounts and tokenizer differences narrow the gap in practice.',
    },
    {
      n: 11,
      slug: 'the-trap',
      file: '11-the-trap.html',
      title: 'The Trap',
      blurb:
        'Every exit Cursor could take led back to the same handful of companies: its seed investor, its model supplier, the funds that had already backed both.',
      section: 'Back to the market',
      source: 'reported',
      sourceNote:
        'OpenAI seed and termination: TechCrunch and OpenAI · Iconiq passing at $50B: The Information · Claude Code adoption: JetBrains (estimate) · OpenAI’s termination came after the close.',
    },
    {
      n: 12,
      slug: 'the-deal',
      file: '12-the-deal.html',
      title: 'The Deal',
      blurb:
        '$60,000,000,000 and 389,289,254 shares, in full — then the funding ladder returns with its missing column filled in.',
      section: 'The deal',
      source: 'primary',
      sourceNote:
        'Share count 389,289,254: SEC Form 8-K · option and exercise dates per SpaceX and Cursor · founder stakes: Forbes estimate · the $10B alternative is a payment for the collaborative work if the option lapses, not a break fee.',
      key: true,
    },
  ],
};

/* ==================================================================== */
/*  Situational Awareness                                                */
/* ==================================================================== */

export const situationalAwareness: Collection = {
  slug: 'situational-awareness',
  title: 'Situational Awareness — The $45B Blowup',
  kicker: 'Fourteen dashboards',
  summary:
    'Leopold Aschenbrenner raised $225 million, compounded it past $20 billion, and lost most of it in twenty-nine days. Every filing the fund ever made, charted — plus the mechanics of how a 25% drawdown became a 100% loss.',
  published: '2026-08-24',
  hero: 'seven-quarter-bridge',
  headline: { lead: 'Situational Awareness', dim: '— the $45B blowup.' },
  primaryLabel: 'SEC primary',
  method: {
    primary:
      'Taken straight from the fund’s Form 13F filings (CIK 0002045724). Six of the fourteen dashboards are built entirely on filed documents.',
    reported:
      'Sourced to journalism — CNBC, the Wall Street Journal, the Financial Times — or, in two cases, to our own arithmetic on reported figures. Attribution is printed on the dashboard itself, not just here.',
    caveat:
      'A 13F discloses US-listed long positions only. It does not show short positions, foreign listings, private holdings or cash — which is why the filings total $20.2 billion against a fund reported at $45 billion. Dashboard 04 exists to reconcile exactly that.',
  },
  dashboards: [
    {
      n: 1,
      slug: '45b-to-10b',
      file: '01-cold-open-collapse.html',
      title: '$45B to $10B',
      blurb:
        'The month runs on one clock — the number falls down the frame, shrinking as it goes, and leaves its starting point struck through behind it.',
      section: 'Cold open',
      source: 'reported',
      sourceNote:
        'Reported fund value, July 1 – July 30, 2026 (CNBC, WSJ). A fall in fund value, not a net return figure.',
    },
    {
      n: 2,
      slug: 'manifesto-scorecard',
      file: '02-manifesto-scorecard.html',
      title: 'The Manifesto Scorecard',
      blurb:
        'Eight predictions from the June 2024 manifesto, marked two years later against what actually happened. Five confirmed, two still open, one contested.',
      section: 'The manifesto',
      source: 'primary',
      sourceNote:
        'Claims as published at situational-awareness.ai, June 2024. Verdicts are a Boardroom Wire assessment.',
    },
    {
      n: 3,
      slug: 'seven-quarter-bridge',
      file: '03-seven-quarter-bridge.html',
      title: 'The Seven-Quarter Bridge',
      blurb:
        'Every 13F the fund ever filed, in order. The y-axis retreats as each quarter overruns it — the axis moving is the growth.',
      section: 'The rise',
      source: 'primary',
      sourceNote:
        'SEC Form 13F · Situational Awareness LP · CIK 0002045724 · all seven filings, Q4 2024 – Q2 2026.',
      key: true,
    },
    {
      n: 4,
      slug: 'what-a-13f-cant-see',
      file: '04-iceberg-13f.html',
      title: "What a 13F Can't See",
      blurb:
        '$20.2 billion is the part that files. The camera dives past the waterline and the rest of the fund surfaces — SK Hynix, Anthropic, the short book, the leverage.',
      section: 'The rise',
      source: 'primary',
      sourceNote:
        'Q2 2026 13F, filed Aug 14, 2026. The $45B peak, Anthropic stake and leverage are reported (CNBC, WSJ).',
    },
    {
      n: 5,
      slug: 'the-hedge-switch',
      file: '05-put-exposure-switch.html',
      title: 'The Hedge Switch',
      blurb:
        'Put options as a share of the book, quarter by quarter: zero, to 62%, to zero — the quarter before the fund blew up.',
      section: 'The rise',
      source: 'primary',
      sourceNote:
        'SEC Form 13F · CIK 0002045724 · seven filings, Q4 2024 – Q2 2026 (filed Aug 14, 2026).',
      key: true,
    },
    {
      n: 6,
      slug: 'the-final-book',
      file: '06-final-book-concentration.html',
      title: 'The Final Book',
      blurb:
        'Twenty-six positions, sized by share of value. SanDisk and Micron are 55.6% of the book between them. Every block is drawn to scale.',
      section: 'The rise',
      source: 'primary',
      sourceNote:
        'SEC Form 13F, Q2 2026, filed Aug 14, 2026 · $20.24B across 26 positions.',
    },
    {
      n: 7,
      slug: 'returns-vs-new-capital',
      file: '07-returns-vs-new-capital.html',
      title: 'Returns vs. New Capital',
      blurb:
        'What compounding actually explains, against the size the fund reached. Roughly 88% of the growth was new money, not returns.',
      section: 'The rise',
      source: 'reported',
      sourceNote:
        'Seed $225M, Sept 2024 · returns 1,000%+ since launch (WSJ) · AUM >$20B, June 2026 · compounding math: Boardroom Wire, from reported figures.',
    },
    {
      n: 8,
      slug: 'the-layers-break',
      file: '08-july-layers-break.html',
      title: 'The Layers Break',
      blurb:
        'July 2026, from the June 22 peak. Every layer that broke was a layer he owned — and unquantified falls are drawn as unquantified.',
      section: 'July',
      source: 'reported',
      sourceNote:
        'CoreWeave and Nebius: July 1, 2026 · memory names: reported double-digit single-day falls · SOX: −28.6% from the June 22 peak.',
    },
    {
      n: 9,
      slug: 'the-leverage-multiplier',
      file: '09-leverage-multiplier.html',
      title: 'The Leverage Multiplier',
      blurb:
        'Why a quarter down is all the way down. The lender’s claim never moves, so everything that falls comes out of your half.',
      section: 'The mechanics',
      source: 'reported',
      sourceNote:
        'WSJ reported leverage of 3–4× across the portfolio. Figures shown are an illustration of the mechanic at 4×, not the fund’s actual book.',
      key: true,
    },
    {
      n: 10,
      slug: 'the-hedge-that-wasnt',
      file: '10-hedge-that-wasnt.html',
      title: "The Hedge That Wasn't",
      blurb:
        'A hedge protects you when the two legs disagree. In July 2026 the long book fell as much as 78% and the short leg rose 27%.',
      section: 'The mechanics',
      source: 'reported',
      sourceNote:
        'Long positions per SEC Form 13F. July 2026 moves and the Adobe short are reported (CNBC), not filed — 13Fs do not disclose shorts.',
    },
    {
      n: 11,
      slug: 'doors-closing',
      file: '11-doors-closing.html',
      title: 'Doors Closing',
      blurb:
        'Six approaches in six days. Five lamps go out — including Jane Street, an investor in his own fund — and then Citadel lights gold.',
      section: 'Trying to survive',
      source: 'reported',
      sourceNote:
        'Approaches and outcomes as reported (WSJ, CNBC). July 24 letter to investors; Citadel block trade at the July 30 open.',
    },
    {
      n: 12,
      slug: 'citadels-crisis-playbook',
      file: '12-citadel-playbook.html',
      title: "Citadel's Crisis Playbook",
      blurb:
        'Five rescues across twenty-five years — including Melvin, which Citadel backed in 2021 and which wound down the year after.',
      section: 'Citadel',
      source: 'reported',
      sourceNote:
        'Enron 2001 · Amaranth 2006 · Sowood 2007 · Melvin 2021, wound down 2022 · Situational Awareness, July 30 2026.',
    },
    {
      n: 13,
      slug: 'july-30-rebound-tell',
      file: '13-july-30-rebound.html',
      title: 'July 30 — The Rebound Tell',
      blurb:
        'The session Citadel bought the book, everything rallied. Cipher Mining — already sold, not in the block — outran every name that was.',
      section: 'The day after',
      source: 'reported',
      sourceNote:
        'Intraday moves, July 30, 2026 (SpotGamma, CNBC). Position status from SEC Form 13F, Q1 & Q2 2026.',
      key: true,
    },
    {
      n: 14,
      slug: 'descent-through-the-stack',
      file: '14-descent-through-stack.html',
      title: 'The Descent Through the Stack',
      blurb:
        'Power, then data centres, then memory, then the machines that make the chips. Each layer narrower, deeper and dimmer than the one above.',
      section: 'The day after',
      source: 'primary',
      sourceNote:
        'Holdings per SEC Form 13F. Source Foundry: $400M announced Aug 9, 2026, taking the total position to $500M (TechCrunch, Quartz).',
    },
  ],
};

/** Newest first. The hub and the poster renderer both iterate this. */
export const collections: Collection[] = [cursor, situationalAwareness];

export const findCollection = (slug: string) => collections.find((c) => c.slug === slug);

/** Where the copied dashboard files live under public/. */
export const assetBase = (c: Collection) => `/analytics/${c.slug}`;

/** The live dashboard, embedded in an iframe on desktop. */
export const embedPath = (c: Collection, d: Dashboard) =>
  `/analytics/${c.slug}/${d.file}`;

/** 1920x1080 still — mobile view and the full-size link behind a thumbnail. */
export const posterPath = (c: Collection, d: Dashboard) =>
  `/analytics/${c.slug}/posters/${d.slug}.webp`;

/** 640x360 still — card grids. */
export const thumbPath = (c: Collection, d: Dashboard) =>
  `/analytics/${c.slug}/posters/thumb/${d.slug}.webp`;

/** 1200x630 JPEG — social crawlers are still unreliable with WebP. */
export const ogPath = (c: Collection, d: Dashboard) =>
  `/analytics/${c.slug}/posters/og/${d.slug}.jpg`;

/**
 * The apex domain currently 522s; www is what actually serves. Absolute URLs
 * for canonical, OG and feed links are built against www so previews resolve.
 * astro.config.mjs `site` carries the same value.
 */
export const SITE_ORIGIN = 'https://www.boardroomwire.com';
