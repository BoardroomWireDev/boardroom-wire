/**
 * Analytics manifest — the single source of truth for the /analytics/ routes.
 *
 * The hub, the collection index, the per-dashboard pages and the poster
 * renderer all read from here. Adding a future video's dashboard set means
 * appending another Collection, not editing three pages.
 *
 * `source` drives the chip shown on the card and matches the chip already
 * baked into each dashboard frame:
 *   primary  — filed with the SEC, stated flat
 *   reported — journalism, attributed on the dashboard itself
 */

export type SourceKind = 'primary' | 'reported';

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
  /** One of the four that carry the video. */
  key?: boolean;
}

export interface Collection {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  /** ISO date, used for the collection card and structured data. */
  published: string;
  dashboards: Dashboard[];
}

export const situationalAwareness: Collection = {
  slug: 'situational-awareness',
  title: 'Situational Awareness — The $45B Blowup',
  kicker: 'Fourteen dashboards',
  summary:
    'Leopold Aschenbrenner raised $225 million, compounded it past $20 billion, and lost most of it in twenty-nine days. Every filing the fund ever made, charted — plus the mechanics of how a 25% drawdown became a 100% loss.',
  published: '2026-08-24',
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

export const collections: Collection[] = [situationalAwareness];

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
 * for OG tags are built against www so link previews resolve. See the note in
 * the plan about astro.config's `site` pointing at the broken apex.
 */
export const SITE_ORIGIN = 'https://www.boardroomwire.com';
