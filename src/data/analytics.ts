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
 *   illustration — an idea drawn with no figures on it
 */

import teslaSpacexFigures from './figures/tesla-spacex.json' with { type: 'json' };
import metaMuseWonderFigures from './figures/meta-muse-wonder.json' with { type: 'json' };

export type SourceKind = 'primary' | 'reported' | 'estimate' | 'illustration';

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
  /** Extra URL parameters every load of the board carries, e.g. `noslot=b027,b133` to hide
   *  footage windows the video fills and the web cannot. */
  query?: string;
  /** The frame the board rests on (posters, reduced motion) when its last frame is not the
   *  chart: `t=75`, or `part=reprise&final`. Default `final`. */
  rest?: string;
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
  kind === 'primary' ? (c.primaryLabel ?? 'Primary')
    : kind === 'reported' ? 'Reported'
    : kind === 'illustration' ? 'Illustration'
    : 'Estimate';

export const heroOf = (c: Collection) =>
  c.dashboards.find((d) => d.slug === c.hero) ?? c.dashboards[0];

/* ==================================================================== */
/*  Cursor — Four College Friends                                        */
/* ==================================================================== */

export const cursor: Collection = {
  slug: 'cursor',
  title: 'Four College Friends: The $60B Cursor Deal',
  kicker: 'Twelve dashboards',
  summary:
    'Four MIT friends built the fastest revenue ramp in software history, lost money on every customer while doing it, and sold to SpaceX for $60 billion. The ramp, the negative margin, the closed ring of investors and the deal itself, charted, with every figure sourced on the frame.',
  published: '2026-09-14',
  hero: 'where-the-dollar-goes',
  headline: { lead: 'Four College Friends', dim: ': the $60B Cursor deal.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by the company, filed with the SEC (the Form 8-K share count) or published by the model providers themselves.',
    reported:
      'Sourced to journalism: Bloomberg, The Information, CNBC, TechCrunch, Fortune. Attribution is printed on the dashboard itself, not just here.',
    estimate:
      'Analyst or survey modelling (Sacra, Ramp, JetBrains, Forbes) or our own arithmetic on reported figures. Marked as an estimate every time it appears.',
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
        'Months from $1M to $100M ARR, on the same clock for everyone: Ramp 24, Deel 20, Wiz 18, Cursor 12.',
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
        'Seed to Series D: six rounds, roughly $3.3 billion raised, a $29.3 billion valuation, and a deliberate gap on the right of the frame.',
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
        'Source: The Information, April 2026, quarter ended January 2026, at roughly $2.7B annualised revenue · $1.23 is derived from the −23% gross margin, not separately reported · FY2025 ~$770M revenue, ~$900M loss.',
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
        '$0.50 against $5.00 per million tokens at list price, and why Cursor keeps a spread on Claude but keeps everything on Composer.',
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
        '$60,000,000,000 and 389,289,254 shares, in full, then the funding ladder returns with its missing column filled in.',
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
  title: 'Situational Awareness: The $45B Blowup',
  kicker: 'Fourteen dashboards',
  summary:
    'Leopold Aschenbrenner raised $225 million, compounded it past $20 billion, and lost most of it in twenty-nine days. Every filing the fund ever made, charted, plus the mechanics of how a 25% drawdown became a 100% loss.',
  published: '2026-08-24',
  hero: 'seven-quarter-bridge',
  headline: { lead: 'Situational Awareness', dim: ': the $45B blowup.' },
  primaryLabel: 'SEC primary',
  method: {
    primary:
      'Taken straight from the fund’s Form 13F filings (CIK 0002045724). Six of the fourteen dashboards are built entirely on filed documents.',
    reported:
      'Sourced to journalism (CNBC, the Wall Street Journal, the Financial Times) or, in two cases, to our own arithmetic on reported figures. Attribution is printed on the dashboard itself, not just here.',
    caveat:
      'A 13F discloses US-listed long positions only. It does not show short positions, foreign listings, private holdings or cash, which is why the filings total $20.2 billion against a fund reported at $45 billion. Dashboard 04 exists to reconcile exactly that.',
  },
  dashboards: [
    {
      n: 1,
      slug: '45b-to-10b',
      file: '01-cold-open-collapse.html',
      title: '$45B to $10B',
      blurb:
        'The month runs on one clock: the number falls down the frame, shrinking as it goes, and leaves its starting point struck through behind it.',
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
        'Every 13F the fund ever filed, in order. The y-axis retreats as each quarter overruns it. The axis moving is the growth.',
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
        '$20.2 billion is the part that files. The camera dives past the waterline and the rest of the fund surfaces: SK Hynix, Anthropic, the short book, the leverage.',
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
        'Put options as a share of the book, quarter by quarter: zero, to 62%, to zero, the quarter before the fund blew up.',
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
        'July 2026, from the June 22 peak. Every layer that broke was a layer he owned, and unquantified falls are drawn as unquantified.',
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
        'Long positions per SEC Form 13F. July 2026 moves and the Adobe short are reported (CNBC), not filed; 13Fs do not disclose shorts.',
    },
    {
      n: 11,
      slug: 'doors-closing',
      file: '11-doors-closing.html',
      title: 'Doors Closing',
      blurb:
        'Six approaches in six days. Five lamps go out, including Jane Street, an investor in his own fund, and then Citadel lights gold.',
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
        'Five rescues across twenty-five years, including Melvin, which Citadel backed in 2021 and which wound down the year after.',
      section: 'Citadel',
      source: 'reported',
      sourceNote:
        'Enron 2001 · Amaranth 2006 · Sowood 2007 · Melvin 2021, wound down 2022 · Situational Awareness, July 30 2026.',
    },
    {
      n: 13,
      slug: 'july-30-rebound-tell',
      file: '13-july-30-rebound.html',
      title: 'July 30: The Rebound Tell',
      blurb:
        'The session Citadel bought the book, everything rallied. Cipher Mining (already sold, not in the block) outran every name that was.',
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

/* ==================================================================== */
/*  Anthropic IPO — Inside Anthropic's $518 Billion Bet                 */
/* ==================================================================== */

export const anthropicIpo: Collection = {
  slug: 'anthropic-ipo',
  title: "Inside Anthropic's $518 Billion Bet",
  kicker: 'Eleven dashboards',
  summary:
    "Anthropic lost $42 billion in 2025 and has signed up to spend at least $518 billion on compute. How the revenue really looks, what the loss was made of, where the money goes, how it plans to pay, and what a $2 trillion IPO price rests on, charted from its draft IPO filing as Reuters reported it.",
  published: '2026-10-03',
  hero: 'the-518-billion',
  headline: { lead: "Anthropic's IPO", dim: ': the $518 billion bet.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by Anthropic in its own funding and compute announcements, or filed with the SEC (Meta’s Form 10-K for its 2025 revenue).',
    reported:
      'Sourced to journalism: Reuters, Bloomberg, CNBC and The New York Times. Every figure from Anthropic’s draft IPO filing is credited as reported by Reuters, on the dashboard itself as well as here.',
    estimate:
      'Our own arithmetic on reported figures: the multiples, the $1.60 per dollar, the years of revenue, the locked-in $414 billion. Marked as an estimate every time it appears.',
    caveat:
      'Anthropic’s S-1 is not public yet; these figures come from a confidential draft that Reuters saw, and every one will be re-checked when the filing is published. A run-rate is a recent stretch of revenue stretched across a year, not revenue booked. Projections and targets are drawn hatched or dashed.',
  },
  dashboards: [
    {
      n: 1,
      slug: 'the-435x-gap',
      file: '50-gap.html',
      title: 'The 435× Gap',
      blurb:
        'The $4.6 billion Anthropic booked in 2025 against a $2 trillion price, on one honest scale. Switch the revenue base and the multiple falls from 435× to 10×.',
      section: 'Misconception #1: The Revenue',
      source: 'estimate',
      sourceNote:
        'Revenue, 2025: Anthropic’s draft IPO filing, as reported by Reuters. Run-rates: CNBC (July) and The New York Times (on track for December). 2028 forecast and the $2 trillion: Reuters, citing sources. Multiples are our arithmetic.',
    },
    {
      n: 2,
      slug: 'what-a-run-rate-is',
      file: '51-runrate.html',
      title: 'What a Run-Rate Is',
      blurb:
        'One recent stretch of revenue, stretched across a year. Q2 2026’s $11.5 billion times four is about $46 billion, close to the run-rate Anthropic reported in May.',
      section: 'Misconception #1: The Revenue',
      source: 'estimate',
      sourceNote:
        'Q2 2026 revenue: Bloomberg. May 2026 run-rate: Anthropic. The annualised figure is our arithmetic.',
    },
    {
      n: 3,
      slug: 'the-run-rate-climb',
      file: '21-revenue.html',
      title: 'The Run-Rate Climb',
      blurb:
        'From about $1 billion in January 2025 to $65 billion in July 2026, with the $100 billion the company is on track for by the end of the year drawn dashed.',
      section: 'Misconception #1: The Revenue',
      source: 'reported',
      sourceNote:
        'Run-rate milestones: Anthropic. July 2026: CNBC. On track for $100 billion: The New York Times. Quarterly revenue: Bloomberg and CNBC. Revenue, 2025: Anthropic’s draft IPO filing, as reported by Reuters.',
      key: true,
    },
    {
      n: 4,
      slug: 'the-42-billion-that-wasnt-cash',
      file: '52-charge.html',
      title: 'The $42 Billion That Wasn’t Cash',
      blurb:
        'As Anthropic’s valuation climbed, the IOUs it had sold grew with it, and $34 billion of that growth landed in the loss as an accounting charge. The cash never moved.',
      section: 'Misconception #2: The $42 Billion Loss',
      source: 'reported',
      sourceNote:
        'Loss, charge, operating loss and cash: Anthropic’s draft IPO filing, as reported by Reuters. Valuations: Anthropic.',
      key: true,
    },
    {
      n: 5,
      slug: 'an-electric-bill',
      file: '54-bill.html',
      title: 'An Electric Bill, Not a Software License',
      blurb:
        'Software is built once and copied, so its cost goes flat. Every AI answer is produced on a chip, so the cost climbs with every answer served.',
      section: 'The Real Cost: Compute',
      source: 'illustration',
      sourceNote: 'An illustration of the idea; no figures are shown.',
    },
    {
      n: 6,
      slug: 'a-dollar-sixty',
      file: '53-dollar.html',
      title: '$1.60 for Every Dollar',
      blurb:
        'Anthropic spent $7.33 billion on compute in 2025 against $4.6 billion of revenue: about $1.60 for every dollar it brought in, drawn to scale.',
      section: 'The Real Cost: Compute',
      source: 'estimate',
      sourceNote:
        'Compute and revenue, 2025: Anthropic’s draft IPO filing, as reported by Reuters. The ratio is our arithmetic.',
    },
    {
      n: 7,
      slug: 'the-518-billion',
      file: '20-ledger.html',
      title: 'The $518 Billion',
      blurb:
        'Six compute commitments in one proportional slab, split between renting compute and going straight to the hardware, with the 80% that is take-or-pay.',
      section: 'The $518 Billion',
      source: 'reported',
      sourceNote:
        'Commitments and the 80% take-or-pay share: Anthropic’s draft IPO filing, as reported by Reuters. Group totals and the $414 billion are our arithmetic.',
      key: true,
    },
    {
      n: 8,
      slug: 'the-contracts-year-by-year',
      file: '56-terms.html',
      title: 'The Contracts, Year by Year',
      blurb:
        'Each commitment on a 2026 to 2036 timeline, where its dates are reported. Hover a contract for its terms, or watch them paid off as they run.',
      section: 'How Anthropic Pays for It',
      source: 'reported',
      sourceNote:
        'Contract terms: Anthropic’s draft IPO filing, as reported by Reuters. Capacity coming online in 2027: Anthropic. Broadcom’s end date, xAI’s start date and AMD’s dates are not reported, and are not drawn.',
    },
    {
      n: 9,
      slug: 'how-it-pays',
      file: '23-money-map.html',
      title: 'How Anthropic Pays for It',
      blurb:
        'The bill against years of revenue, the money raised and still to raise, and the circle in which Amazon and Google invest in Anthropic and are paid back in compute spending.',
      section: 'How Anthropic Pays for It',
      source: 'reported',
      sourceNote:
        'Commitments: Anthropic’s draft IPO filing, as reported by Reuters. Funding rounds and Amazon’s investment: Anthropic. 2028 forecast and IPO raise: Reuters, citing sources. Credit line: Bloomberg. Meta revenue: Form 10-K. Years of revenue are our arithmetic.',
      key: true,
    },
    {
      n: 10,
      slug: 'the-2-trillion-math',
      file: '22-valuation.html',
      title: 'The $2 Trillion Math',
      blurb:
        'Every round from $61.5 billion to $965 billion, with the multiple of run-rate falling as the price rose, then $2 trillion against four revenue bases. Try your own numbers.',
      section: 'The $2 Trillion Math',
      source: 'reported',
      sourceNote:
        'Valuations: Anthropic. The $2 trillion and the 2028 forecast: Reuters, citing sources. Run-rates: Anthropic, CNBC and The New York Times. Morningstar’s range: via Reuters. Multiples are our arithmetic.',
      key: true,
    },
    {
      n: 11,
      slug: 'the-biggest-ipo-ever',
      file: '57-record.html',
      title: 'The Biggest IPO Ever?',
      blurb:
        'Anthropic’s raise of as much as $100 billion against SpaceX’s record $75 billion, and a $2 trillion valuation against SpaceX’s $1.77 trillion.',
      section: 'The $2 Trillion Math',
      source: 'reported',
      sourceNote:
        'Anthropic’s raise and valuation: Reuters, citing sources. SpaceX: Reuters market data, June 2026.',
    },
  ],
};

/* ==================================================================== */
/*  Alexandr Wang — Meta's $14 billion bet                               */
/* ==================================================================== */

export const alexandrWang: Collection = {
  slug: 'alexandr-wang',
  title: "Zuckerberg Hired a 28-Year-Old for $14 Billion. It's Working.",
  kicker: 'Ten dashboards',
  summary:
    "Meta paid about $14 billion for 49% of Scale AI and the 28-year-old who ran it. A model that jumped from 18 to 52 on the Artificial Analysis index, a free AI agent put in front of 3.6 billion people a day, the stock's best day in more than a year, and the bill for all of it, charted, with every figure sourced on the frame.",
  published: '2026-10-10',
  hero: 'the-stock',
  headline: { lead: 'Alexandr Wang at Meta', dim: ': the $14 billion bet.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by the company or filed with the SEC: Meta’s earnings releases and Form 10-K, Scale AI’s announcement, and the launch posts from Meta, SpaceXAI and OpenAI.',
    reported:
      'Sourced to journalism: Reuters, AP, Fortune, The Wall Street Journal, Bloomberg and others. Attribution is printed on the dashboard itself, not just here.',
    estimate:
      'Artificial Analysis’s own index scores and rankings, or our own arithmetic on reported figures. Marked as an estimate every time it appears.',
    caveat:
      'Meta has not disclosed a single Muse user, subscriber or dollar of revenue, so none is charted. Index scores and ranks are Artificial Analysis’s estimates on the date shown, and the index version changes between April 2025 and April 2026.',
  },
  dashboards: [
    {
      n: 1,
      slug: 'spent-big-fell-behind',
      file: '01-nothing-to-show-p6c.html',
      title: 'Spent Big, Fell Behind',
      blurb:
        'In April 2025, on the version of the Artificial Analysis index in use then, Llama 4 Maverick scored 50.53, 2.71 points behind DeepSeek V3 and well short of DeepSeek R1 at 60.22.',
      section: 'Nothing to Show for It',
      source: 'estimate',
      sourceNote:
        'Scores: Artificial Analysis Intelligence Index, 21 Apr 2025, an estimate. Capex: company filings. The point gaps, Microsoft’s calendar-year capex and Meta’s capex growth are our arithmetic.',
    },
    {
      n: 2,
      slug: 'what-14-billion-bought',
      file: '02-what-14-billion-bought.html',
      title: 'What $14 Billion Bought',
      blurb:
        'Meta paid about $14.3 billion for 49% of Scale AI, valued at over $29 billion, and got its founder with it. Scale, founded in 2016, labels the data AI models are trained on, and it sold that work to the labs Meta was chasing.',
      section: 'What $14 Billion Bought',
      source: 'primary',
      sourceNote:
        'Scale AI, 12 Jun 2025, Meta Form 10-K FY2025 and Meta executive bio. Reported by AP and Reuters.',
      key: true,
    },
    {
      n: 3,
      slug: 'the-offer',
      file: '42-the-offer.html',
      title: 'The Offer',
      blurb:
        'One AI researcher reportedly turned down a Meta pay package worth about $1.5 billion. Meta called that account of the offer “inaccurate and ridiculous.”',
      section: 'What $14 Billion Bought',
      source: 'reported',
      sourceNote:
        'Reported by Information Age, 5 Aug 2025, citing The Wall Street Journal. The per-year and per-day figures are our arithmetic, at most.',
    },
    {
      n: 4,
      slug: 'from-18-to-52',
      file: '03-from-18-to-52-p6b.html',
      title: 'From 18 to 52',
      blurb:
        'Meta’s last Llama scored 18 on the April 2026 index. Muse Spark scored 52, a 2.89× jump that still left it behind Google, OpenAI and Anthropic.',
      section: 'Avocado',
      source: 'estimate',
      sourceNote:
        'Meta AI blog. Reported by Fortune. Scores: Artificial Analysis Intelligence Index, 8 Apr 2026, an estimate. The 2.89× is our arithmetic.',
      key: true,
    },
    {
      n: 5,
      slug: 'how-muse-works',
      file: '04-how-muse-works-p6c.html',
      title: 'How Muse Works',
      blurb:
        'Muse, Meta’s AI agent, works on a computer of its own in Meta’s cloud, which Meta calls the Muse Secure VM, with a browser, a terminal and files of its own, so it can finish a task without you.',
      section: 'Free, Inside WhatsApp',
      source: 'illustration',
      sourceNote: 'Meta newsroom. Reported by Reuters. Drawing from Meta’s description.',
    },
    {
      n: 6,
      slug: 'free-in-front-of-billions',
      file: '05-free-in-front-of-billions-p6.html',
      title: 'Free, in Front of Billions',
      blurb:
        'SpaceXAI’s Grok Bot and OpenAI’s Dots launched on paid plans only. Meta’s Muse has a free tier, and Meta’s apps reach 3.6 billion people a day.',
      section: 'Free, Inside WhatsApp',
      source: 'primary',
      sourceNote:
        'Meta Q2 2026 earnings release, Meta newsroom, SpaceXAI and OpenAI. Daily active people, June 2026 average.',
      key: true,
    },
    {
      n: 8,
      slug: 'the-stock',
      file: '07-the-stock-p6b.html',
      title: 'The Stock',
      blurb:
        'Meta’s stock, every trading day since April 2025. It rose 11.34% on 21 September, as Muse topped the charts, its biggest one-day gain since it rose 14.76% on 9 April 2025.',
      section: 'Number One',
      source: 'reported',
      sourceNote: 'Closing prices: Yahoo Finance. Reported by The Next Web. The daily percentage moves are our arithmetic on closing prices.',
      key: true,
    },
    {
      n: 10,
      slug: 'three-agents',
      file: '09-three-agents.html',
      title: 'Three Agents',
      blurb:
        'SpaceXAI’s Grok Bot on 11 August, Meta’s Muse 28 days later, OpenAI’s Dots 21 days after that. Only Muse came with a free tier.',
      section: 'The Paid Rivals',
      source: 'primary',
      sourceNote:
        'Launch dates: SpaceXAI, the Meta newsroom and OpenAI, with Bloomberg’s report via AI Weekly. The 28- and 21-day gaps are our arithmetic.',
    },
    {
      n: 11,
      slug: 'the-bill',
      file: '11-the-bill-p6c.html',
      title: 'The Bill',
      blurb:
        'In the second quarter of 2026, Meta spent $31.08 billion on capex and was left with $784 million of free cash flow.',
      section: 'The Bill',
      source: 'primary',
      sourceNote:
        'Meta Q4 2024 earnings release, Meta Form 10-K FY2025 and Meta Q2 2026 earnings release.',
      key: true,
    },
    {
      n: 12,
      slug: '23rd-of-224',
      file: '14-aa-rank-p6.html',
      title: '23rd of 224',
      blurb: 'As of 4 October 2026, Muse Spark 1.3 (Max) ranks 23rd of 224 models on the Artificial Analysis index.',
      section: 'The Bill',
      source: 'estimate',
      sourceNote: 'Estimate: Artificial Analysis, 4 Oct 2026.',
    },
  ],
};

/* ==================================================================== */
/*  Nebius — the spare parts of Russia's Google                          */
/* ==================================================================== */

export const nebius: Collection = {
  slug: 'nebius',
  title: "Nebius: How the Spare Parts of Russia's Google Became a $60 Billion AI Cloud",
  kicker: 'Eleven dashboards',
  summary:
    'A forced sale at half price left Nebius a data center in Finland, about a thousand engineers and some cash. By early October, about two years later, it was worth roughly $60 billion. These eleven dashboards chart how: what it kept, the platform it built on top of the chips, the Microsoft and Meta deals, the growth in revenue, the cash it spends to build, and the stock Michael Burry bet against. Every figure carries its source on the dashboard.',
  published: '2026-10-17',
  hero: 'the-split',
  headline: { lead: 'Nebius', dim: ': the spare parts of Russia’s Google.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by the company or filed with the SEC: Nebius’s 6-K reports, 20-F annual reports and shareholder letters, Yandex’s 6-K reports on the sale, and Nvidia’s own documentation.',
    reported:
      'Sourced to journalism and market data: Bloomberg, CNBC, TheStreet, TrendForce, Yahoo Finance, StockAnalysis and Stocktwits. Attribution is printed on the dashboard itself, not just here.',
    estimate:
      'Our own arithmetic on the company’s figures, such as two gigawatts at $20 million per megawatt. Every dashboard that uses it says so in its source line.',
    caveat:
      'Nebius does not name its customers, so no dashboard names the ones behind its revenue. The $40 billion in commitments is a figure Nebius defines itself, not a reported backlog. Share prices and market values are as of the date printed on each dashboard.',
  },
  dashboards: [
    {
      n: 1,
      slug: 'the-split',
      file: '01-the-split.html',
      query: 'noslot=b027,b133,b129-finland',
      title: 'The Split',
      blurb:
        'On 4 February 2024, Yandex agreed to sell its Russian business for about $5.2 billion, at the discount of at least 50% that Moscow required. Nebius kept $2.6 billion in cash, a data center in Finland and more than a thousand employees, and began trading as NBIS on 21 October 2024.',
      section: 'The Spare Parts',
      source: 'primary',
      sourceNote:
        'Yandex 6-K, 5 and 8 Feb 2024, Nebius 6-K, 15 Jul 2024, and Nebius 20-F FY2025. Boardroom Wire calculation.',
      key: true,
    },
    {
      n: 2,
      slug: 'the-neocloud-stack',
      file: '03-the-neocloud-stack.html',
      query: 'noslot=b045,b046,b048,b049,b044e',
      rest: 'part=reprise&final',
      title: 'The Neocloud Stack',
      blurb:
        'Bare metal is land, electricity, the grid and the chips. A platform adds the software and the team that run them, and that is what the top neoclouds sell.',
      section: 'What Is a Neocloud?',
      source: 'illustration',
      sourceNote: 'A drawing, with no figures, of what a neocloud supplies.',
    },
    {
      n: 3,
      slug: '172-ways-to-fail',
      file: '04-172-ways-to-fail.html',
      query: 'noslot=b054,b056',
      title: '172 Ways to Fail',
      blurb:
        'A single training job can run across thousands of chips for weeks. Nvidia’s own documentation lists 172 ways one of its GPUs can fail, and one bad chip can stall the whole job until the software pulls it out of service.',
      section: '172 Ways to Fail',
      source: 'primary',
      sourceNote: 'Nvidia Xid error catalog (docs.nvidia.com).',
    },
    {
      n: 4,
      slug: 'bigger-than-the-company',
      file: '05-bigger-than-the-company.html',
      query: 'noslot=b072',
      title: 'Bigger Than the Company',
      blurb:
        'Microsoft’s contract was worth $17.4 billion over five years, and up to $19.4 billion, against Nebius’s $15.3 billion market value the day before. Microsoft also agreed to about $7 billion upfront to help build the capacity: a new data center in Vineland, New Jersey, with more than 100,000 of Nvidia’s GB300 chips.',
      section: 'Microsoft Moves In',
      source: 'primary',
      sourceNote:
        'Nebius 6-K, 8 Sep 2025, and Nebius 20-F FY2025. Reported by TheStreet and Bloomberg. Boardroom Wire calculation.',
      key: true,
    },
    {
      n: 5,
      slug: 'metas-safety-net',
      file: '06-metas-safety-net.html',
      rest: 't=75',
      title: 'Meta’s Safety Net',
      blurb:
        'Meta’s first deal was $2.9 billion. Its second is up to $27 billion: $12 billion firm, on Vera Rubin chips from early 2027, and up to $15 billion of capacity that Meta buys only if Nebius cannot sell it to other customers.',
      section: 'Then Came Meta',
      source: 'primary',
      sourceNote:
        'Nebius 6-K, 12 Nov 2025 and 16 Mar 2026, and Nebius Q2 2026 shareholder letter. Boardroom Wire calculation.',
      key: true,
    },
    {
      n: 6,
      slug: 'the-run',
      file: '07-the-run.html',
      title: 'The Run',
      blurb:
        'Revenue went from $91.5 million in 2024 to $529.8 million in 2025 and $981.3 million in the first half of 2026. The annualized run-rate reached $3.0 billion, against a target of $7 billion to $9 billion by the end of 2026.',
      section: 'The Run',
      source: 'primary',
      sourceNote:
        'Nebius 20-F FY2024, Nebius Q4 2025 financial results, and Nebius Q4 2025, Q1 2026 and Q2 2026 shareholder letters. Boardroom Wire calculation.',
      key: true,
    },
    {
      n: 7,
      slug: 'a-megawatt-then-a-gigawatt',
      file: '08-a-megawatt-then-a-gigawatt.html',
      query: 'noslot=b088',
      title: 'A Megawatt, Then a Gigawatt',
      blurb:
        'On its new deals, Nebius brings in more than $20 million a year for each megawatt. It ended 2025 with about 170 megawatts in use, expects up to a gigawatt connected by the end of 2026, and plans to add another gigawatt in 2027. At $20 million a megawatt, two gigawatts would pencil out to roughly $40 billion a year, if that pricing holds and the data centers are built in time.',
      section: 'The Run',
      source: 'estimate',
      sourceNote:
        'Nebius Q4 2025 and Q2 2026 shareholder letters, Nebius release, 5 Mar 2025, and the company’s own statements. Boardroom Wire calculation.',
    },
    {
      n: 8,
      slug: 'one-deal-three-ways',
      file: '09-one-deal-three-ways.html',
      title: 'One Deal, Three Ways',
      blurb:
        'The same Microsoft deal shows up three ways: as $17.4 billion in commitments, as about $7 billion of cash upfront that Nebius still owes in computing power, and as roughly $3.5 billion a year of revenue over five years once it’s fully running.',
      section: 'Paying for It',
      source: 'primary',
      sourceNote:
        'Nebius 6-K, 8 Sep 2025 and 16 Mar 2026, Nebius 20-F FY2025 and Nebius Q2 2026 shareholder letter. Boardroom Wire calculation.',
    },
    {
      n: 9,
      slug: 'the-burn',
      file: '10-the-burn.html',
      query: 'noslot=b104',
      title: 'The Burn',
      blurb:
        'Nebius lost $190.4 million in Q2 2026. But it brought in $4.5 billion of operating cash in the first half, and $4.4 billion of that was customers paying in advance, which leaves $109 million from the business itself. After $8.1 billion spent on GPUs and data centers, Nebius burned $3.6 billion in six months, $3.4 billion of it in Q2.',
      section: 'Paying for It',
      source: 'primary',
      sourceNote: 'Nebius Q2 2026 6-K. Boardroom Wire calculation.',
      key: true,
    },
    {
      n: 10,
      slug: 'the-stock-and-the-short',
      file: '11-the-stock-and-the-short.html',
      query: 'noslot=b111',
      title: 'The Stock and the Short',
      blurb:
        'Nebius shares cost $21.00 in December 2024 and peaked at $299.86 on 22 June 2026. On 9 October 2026 they stood at $221.80, a market value of $60.3 billion, or roughly 20 times a $3.0 billion run-rate. On 6 August, Michael Burry revealed he was shorting the stock at $211.77.',
      section: 'Fish in a Barrel',
      source: 'reported',
      sourceNote:
        'Nebius 6-K, 2 Dec 2024, Nebius Q2 2026 shareholder letter and the company’s own statements. Reported by Yahoo Finance, Stocktwits, StockAnalysis and CNBC. Boardroom Wire calculation.',
    },
    {
      n: 11,
      slug: 'the-bear-case-answered',
      file: '12-the-bear-case-answered.html',
      title: 'The Bear Case, and What the Bulls Say Back',
      blurb:
        'The bears raise three risks, and the bulls have a reply to each. Meta’s $12 billion depends on Vera Rubin chips arriving in early 2027, and Nebius already has its first systems. Nebius now depreciates its servers over five years, while prices for its older GPUs rose more than 30% in Q2. And its March convertible notes convert around $180 a share, with the stock at $186.01 on 14 October 2026, while prepayments cover about half the cost of the build on most new deals.',
      section: 'Fish in a Barrel',
      source: 'reported',
      sourceNote:
        'Nebius 6-K, 16 and 17 Mar 2026, Nebius 20-F FY2025 and Nebius Q2 2026 shareholder letter. Reported by TrendForce, StockAnalysis and Yahoo Finance.',
    },
  ],
};

/* ==================================================================== */
/*  Figures read from a video's data.js                                  */
/* ==================================================================== */

/* Since tesla-spacex, a collection's numbers are not typed here: `npm run sync:article -- <slug>`
   writes src/data/figures/<slug>.json from the video's data.js and from what each board renders
   (its credit line and its footage windows), and the copy below carries {key} slots filled from it.
   A missing key fails the build. */
export interface Figure {
  display: string; spoken: string; label: string; credit: string; tier: string; asOf?: string;
  sources: string[]; mandatory?: string;
}
export interface FigureData {
  source: string;
  boards: Record<string, { file: string; credit: string; figures: string[]; noslot: string }>;
  figures: Record<string, Figure>;
}
const FIGURES: Record<string, FigureData> = {
  'tesla-spacex': teslaSpacexFigures as FigureData,
  'meta-muse-wonder': metaMuseWonderFigures as FigureData,
};

export const figureData = (slug: string): FigureData => {
  const d = FIGURES[slug];
  if (!d) throw new Error(`No figures for "${slug}"; run npm run sync:article -- ${slug}`);
  return d;
};
export const figure = (slug: string, key: string): Figure => {
  const f = figureData(slug).figures[key];
  if (!f) throw new Error(`No figure "${key}" in ${slug}'s data.js`);
  return f;
};
const MONTHS = 'January February March April May June July August September October November December'.split(' ');
const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
/** "2026-10-16" as "October 16th, 2026", the way the writer dates things. */
export const longDate = (iso: string) => `${MONTHS[+iso.slice(5, 7) - 1]} ${ordinal(+iso.slice(8, 10))}, ${iso.slice(0, 4)}`;
/** Copy with {key} slots: the figure as the narration says it ("about $1.98 trillion"; the sync's spoken
 *  form, never the board's shorthand); {key:date} is the date it is as of. */
const fill = (slug: string, s: string) =>
  s.replace(/\{([a-z0-9_]+)(:date)?\}/g, (_, k, d) => (d ? longDate(figure(slug, k).asOf ?? '') : figure(slug, k).spoken));
/** A board as the video renders it: its file, its credit line (the embed prints its own "Source"
 *  label) and its footage windows hidden, since the site has no footage to put in them. */
const board = (slug: string, web: string) => {
  const b = figureData(slug).boards[web];
  if (!b) throw new Error(`No board "${web}" in ${slug}'s figures; add it to scripts/sync-article.mjs`);
  return { file: b.file, sourceNote: b.credit.replace(/^Source:\s*/, ''), ...(b.noslot && { query: `noslot=${b.noslot}` }) };
};

/* ==================================================================== */
/*  Tesla x SpaceX                                                       */
/* ==================================================================== */

const T = 'tesla-spacex';
export const teslaSpacex: Collection = {
  slug: T,
  title: "Elon Musk's Car and Rocket Empires Are Converging",
  kicker: 'Ten dashboards',
  summary: fill(T,
    'SpaceX was worth {spacex_market_cap_2026_10_16} and Tesla {tesla_market_cap_cover_shares_2026_10_16} at the close on {spacex_market_cap_2026_10_16:date}, and Barclays expects SpaceX to buy Tesla. These ten dashboards chart what each company does, where the two already work together, what they look like on one balance sheet, and who would control the result. Every figure carries its source on the dashboard.'),
  published: '2026-10-24',
  hero: 'one-balance-sheet',
  headline: { lead: 'Tesla and SpaceX', dim: ': what they would look like put together.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by the companies or filed with the SEC and other regulators: Tesla’s 10-K, 10-Q and quarterly updates, SpaceX’s S-1, 8-K reports, quarterly results and earnings call, and Musk’s own posts on X. The betting odds are Kalshi’s own market data.',
    reported:
      'Sourced to journalism, analysts and market data: Bloomberg, CNBC, Barclays, JPMorgan, StockAnalysis and others. Attribution is printed on the dashboard itself, not just here.',
    estimate:
      'Our own arithmetic on the companies’ figures, such as the two combined or the share-swap ratio, and Barclays’ estimate of Musk’s votes after a deal. Every dashboard that uses one says so in its source line.',
    caveat: fill(T,
      'Market values and share prices are as of the close on {spacex_market_cap_2026_10_16:date}. A deal has not been announced; the combined figures show what the two would add up to, not a forecast.'),
  },
  dashboards: [
    {
      n: 1, slug: 'the-tune-changes', ...board(T, 'the-tune-changes'),
      title: 'Trending Towards Convergence',
      blurb: fill(T,
        'In 2016, Musk said there was no “strong product rationale to combine SpaceX and Tesla.” Last year he posted that his companies were “trending towards convergence.” By the morning after the Roadster event, the odds on Kalshi of a deal by March had jumped from {kalshi_mar2027_2026_10_14_morning} to {rumour_cnbc_kalshi_56pct_before_march}, then cooled to {clue_kalshi_before_mar2027} a day later.'),
      section: 'Musk Changed His Tune',
      source: 'reported',
    },
    {
      n: 2, slug: 'the-last-big-piece', ...board(T, 'the-last-big-piece'),
      title: 'The Last Big Piece',
      blurb: fill(T,
        'This year SpaceX bought xAI, valuing it at {xai_merger_value_xai}, went public at {spacex_ipo_valuation} and paid {spacex_cursor_price} in stock for Cursor. At the close on {spacex_market_cap_2026_10_16:date}, it was worth {spacex_market_cap_2026_10_16}, against {tesla_market_cap_cover_shares_2026_10_16} for Tesla. And Tesla is the last big piece.'),
      section: 'Musk Changed His Tune',
      source: 'primary',
    },
    {
      n: 3, slug: 'the-deal-on-the-table', ...board(T, 'the-deal-on-the-table'),
      title: 'The Deal on the Table',
      blurb: fill(T,
        'Barclays expects SpaceX to buy Tesla in a stock-for-stock deal. At the close on {c_exchange_ratio_market:date}, each Tesla share was worth {c_exchange_ratio_market} SpaceX shares before any premium, and the two together were worth {c_combined_mcap_2026_10_16}.'),
      section: 'The Deal on the Table',
      source: 'reported',
      key: true,
    },
    {
      n: 4, slug: 'the-autonomy-bet', ...board(T, 'the-autonomy-bet'),
      title: 'The Autonomy Bet',
      blurb: fill(T,
        'Tesla brought in {tesla_fy2025_revenue_total} last year, {c_tesla_fy2025_automotive_revenue_share} of it from cars, and is valued at {tesla_market_cap_cover_shares_2026_10_16}. That value is a bet on autonomy: {fwd_tsla_fsd_active_subs_q2} people paying for self-driving, a line built for {fwd_tsla_rt_cybercab_capacity_deck} Cybercabs a year, and plans for {fwd_tsla_opt_q4_deck_capacity_1m} Optimus robots a year.'),
      section: 'Where It Clicks',
      source: 'primary',
      key: true,
    },
    {
      n: 5, slug: 'the-five-layers', ...board(T, 'the-five-layers'),
      title: 'The Five Layers',
      blurb: fill(T,
        'Sequoia’s Shaun Maguire thinks of SpaceX in five layers: launch, connectivity, compute, models and apps, and other bets. In 2025, Starlink was {spacex_fy2025_revenue_share_connectivity} of revenue and AI {spacex_fy2025_revenue_share_ai}. In the second quarter of 2026, AI was {spacex_q2_2026_revenue_share_ai} of {spacex_q2_2026_revenue_total}.'),
      section: 'Where It Clicks',
      source: 'primary',
      key: true,
    },
    {
      n: 6, slug: 'the-loop', ...board(T, 'the-loop'),
      title: 'What Each One Has',
      blurb: fill(T,
        'SpaceX has launch, satellites, data centers and AI, and Tesla has power, manufacturing at scale, robotics and autonomy. Some of it already works together: the {spacex_tesla_megapacks_2025} of Megapacks SpaceX bought from Tesla in 2025, Starlink in the Cybercab and Grok in Tesla’s cars. The rest is still plans: computers in orbit, Terafab, the chip factory the two are planning, and humanoid robots.'),
      section: 'Where It Clicks',
      source: 'primary',
    },
    {
      n: 7, slug: 'each-on-its-own', ...board(T, 'each-on-its-own'),
      title: 'Each on Its Own',
      blurb: fill(T,
        'Tesla brought in {tesla_fy2025_revenue_total} last year, but its operating income in the second quarter of 2026 was {tesla_q2_2026_operating_income}. SpaceX is smaller but growing much faster: it brought in {spacex_fy2025_revenue_total} last year, and in the second quarter alone it spent {spacex_q2_2026_capex_total} of capex, {spacex_q2_2026_capex_ai} of it on AI.'),
      section: 'One Balance Sheet',
      source: 'primary',
    },
    {
      n: 8, slug: 'one-balance-sheet', ...board(T, 'one-balance-sheet'),
      title: 'One Balance Sheet',
      blurb: fill(T,
        'Put together, the two brought in {c_combined_fy2025_revenue} of revenue last year and held {c_combined_cash_2026_06_30} in cash. At the close on {c_combined_mcap_2026_10_16:date}, they were worth {c_combined_mcap_2026_10_16}, {c_combined_mcap_rank_2026_10_16} in the world by market value and {c_combined_mcap_to_fy2025_revenue} what they made last year, with SpaceX alone at {c_spacex_mcap_to_fy2025_revenue} its revenue.'),
      section: 'One Balance Sheet',
      source: 'primary',
      key: true,
    },
    {
      n: 9, slug: 'a-hundred-trillion', ...board(T, 'a-hundred-trillion'),
      title: 'A Hundred Trillion',
      blurb: fill(T,
        'The night before the Roadster event, Musk wrote that SpaceX “probably gets to” more than $100 trillion in less than ten years. From {spacex_market_cap_2026_10_16} at the close on {spacex_market_cap_2026_10_16:date}, that would take growth of {musk_claim_c_100t_implied_growth}, every year, for a decade.'),
      section: 'One Balance Sheet',
      source: 'primary',
      key: true,
    },
    {
      n: 10, slug: 'control', ...board(T, 'control'),
      title: 'Control',
      blurb: fill(T,
        'Musk owns {tesla_musk_ownership_pct} of Tesla and holds {spacex_musk_voting_power_post_ipo} of SpaceX’s votes, through Class B shares that carry {spacex_class_b_ten_votes} votes each. If Tesla’s stock were swapped into SpaceX’s, Barclays puts his votes in the combined company at {barclays_combined_musk_37_56}.'),
      section: 'Where It Lands',
      source: 'primary',
    },
  ],
};

/* ==================================================================== */
/*  Meta Q3 2026                                                         */
/* ==================================================================== */

const M = 'meta-muse-wonder';
export const metaMuseWonder: Collection = {
  slug: M,
  title: "Meta Made $64.6 Billion in Three Months. It Wasn't Enough.",
  kicker: 'Thirteen dashboards',
  summary: fill(M,
    'Meta made {meta_revenue_q3_2026} in the third quarter of 2026, up {meta_revenue_growth_q3_2026} from a year earlier, and spent so heavily on AI that free cash flow went below zero. These thirteen dashboards chart Muse’s first weeks and its model, where the revenue comes from, where the cash went, the stock, the raise, Meta’s AI strategy and what Muse could make. Every figure carries its source on the dashboard.'),
  published: '2026-10-26',
  hero: 'cash-in-cash-out',
  headline: { lead: 'Meta’s third quarter', dim: ': revenue up, free cash flow below zero.' },
  primaryLabel: 'Primary',
  method: {
    primary:
      'Stated by Meta or filed with the SEC: the Q3 2026 earnings release, presentation and calls, the 10-K and 10-Q, the information statement on the new shares and the prospectus for the stock sale.',
    reported:
      'Sourced to journalism and market data: CNBC and heygotrade. Attribution is printed on the dashboard itself, not just here.',
    estimate:
      'Our own arithmetic on Meta’s figures, and our rough math on what Muse could make in 2027. Every dashboard that uses one says so in its source line.',
    caveat:
      'The 2027 Muse cases are our projection, not a forecast from Meta.',
  },
  dashboards: [
    /* 09 is timed for the cut, where the camera sinks from it into 33: the web stops it on its own chart (the sink never
       comes), so the board ends, rests and posters on that frame. */
    {
      n: 1, slug: 'the-waterline', ...board(M, 'the-waterline'), query: 'at=-1,-1,0.23,1.05,5.23,99,99&secs=8',
      title: 'The Waterline',
      blurb: fill(M,
        'For two years, Meta’s free cash flow stood above zero every quarter, from {meta_fcf_q3_2024} in the third quarter of 2024. In the third quarter of 2026 it sank below the line, to {meta_fcf_q3_2026}.'),
      section: 'Sinking the Ship?',
      source: 'primary',
      key: true,
    },
    {
      n: 2, slug: 'the-scorecard', ...board(M, 'the-scorecard'),
      title: 'Zuckerberg’s Scorecard',
      blurb: fill(M,
        '{meta_dap_sep_2026} people use Meta’s apps every day. In its first six weeks, {meta_muse_setup_people_q3_2026} people in the US and Canada set up Muse, and {meta_muse_daily_use_rate_q3_2026} of them use it on a given day, {c_meta_muse_daily_people_q3_2026} people.'),
      section: 'Zuckerberg’s Scorecard',
      source: 'primary',
    },
    {
      n: 3, slug: 'muse-wonder', ...board(M, 'muse-wonder'),
      title: 'Muse Wonder',
      blurb: fill(M,
        'Meta launched Muse Wonder, its first frontier model, on {wonder_launch:date}. Artificial Analysis scores its strongest version at {aa_wonder_full_index}, just behind Anthropic’s Claude Opus 5.5 at {aa_opus55_index}. Wonder powers Muse for people who pay, and the free version runs on Muse Spark.'),
      section: 'Muse Wonder',
      source: 'primary',
    },
    {
      n: 4, slug: 'the-revenue', ...board(M, 'the-revenue'),
      title: 'Meta’s Revenue Lines',
      blurb: fill(M,
        'Of {meta_revenue_q3_2026} in revenue, {meta_ad_revenue_q3_2026} came from advertising. Meta showed {meta_ad_impressions_growth_q3_2026} more ads than a year earlier and charged {meta_ad_price_growth_q3_2026} more for each one.'),
      section: 'The Bill',
      source: 'primary',
      key: true,
    },
    {
      n: 5, slug: 'profit-and-cash', ...board(M, 'profit-and-cash'),
      title: 'Profit and Cash',
      blurb: fill(M,
        'A {meta_legal_charge_q3_2026} charge to settle the teen mental health lawsuits cut operating income to {meta_operating_income_q3_2026}. Cash from operations still grew {c_meta_ocf_growth_q3_2026}, to {meta_ocf_q3_2026}, but capex of {meta_capex_q3_2026} went past it.'),
      section: 'The Bill',
      source: 'primary',
    },
    {
      n: 6, slug: 'cash-in-cash-out', ...board(M, 'cash-in-cash-out'),
      title: 'Cash In, Cash Out',
      blurb: fill(M,
        'For two years, the cash coming in from Meta’s business covered its capex. In the third quarter of 2026, capex passed it, and free cash flow went to {meta_fcf_q3_2026}. Meta now holds {meta_debt_q3_2026_call} of debt against {meta_cash_q3_2026} of cash and investments, and its plan for the year leaves {c_meta_capex_q4_2026_implied} of capex for the fourth quarter.'),
      section: 'The Bill',
      source: 'primary',
      key: true,
    },
    {
      n: 7, slug: 'the-capex-column', ...board(M, 'the-capex-column'),
      title: 'The Capex Column',
      blurb: fill(M,
        'Meta spent {meta_capex_2025} on capex in 2025 and {meta_capex_9m_2026} in the first nine months of 2026, and expects to spend {meta_capex_guide_fy2026} this year.'),
      section: 'The Bill',
      source: 'primary',
    },
    {
      n: 8, slug: 'the-stock', ...board(M, 'the-stock'),
      title: 'The Stock',
      blurb: fill(M,
        'Meta’s shares rose after hours on {meta_after_hours_21_oct_2026_cnbc:date}, then turned, and by the next day’s close they were down {meta_share_price_change_22_oct_2026}.'),
      section: 'The Bill',
      source: 'reported',
    },
    {
      n: 9, slug: 'a-theoretical-maximum', ...board(M, 'a-theoretical-maximum'),
      title: 'The Filing and the Answer',
      blurb: fill(M,
        'A filing on Meta’s new shares with no vote said it could need to raise hundreds of billions of dollars over several years. Meta later called that {meta_class_c_theoretical_max}, not its plan.'),
      section: 'A Theoretical Maximum',
      source: 'primary',
    },
    {
      n: 10, slug: 'the-raise', ...board(M, 'the-raise'),
      title: 'The Raise',
      blurb: fill(M,
        'On {meta_equity_raise_oct2026_total:date}, Meta offered {meta_equity_raise_oct2026_total} of new stock, and it plans to sell {meta_atm_program_2027_max} of its Class C stock from 2027.'),
      section: 'A Theoretical Maximum',
      source: 'primary',
    },
    {
      n: 11, slug: 'the-strategy', ...board(M, 'the-strategy'),
      title: 'Meta’s AI Strategy',
      blurb:
        'The goal in Zuckerberg’s words, personal superintelligence, the models from Meta Superintelligence Labs behind it, and the four ways Meta plans to make money from them: ads, subscriptions, businesses and commerce.',
      section: 'Meta’s AI Strategy',
      source: 'primary',
    },
    {
      n: 12, slug: 'the-muse-cases', ...board(M, 'the-muse-cases'),
      title: 'Muse Scenario Analysis, 2027',
      blurb: fill(M,
        'Our rough math on what Muse could make in 2027. The base case comes to {fwd_meta_muse_revenue_2027_base}. In our most generous case it is {fwd_meta_muse_revenue_2027_bull}, {fwd_meta_muse_revenue_share_of_capex_2027_bull} of Meta’s capex this year.'),
      section: 'Meta’s AI Strategy',
      source: 'estimate',
      key: true,
    },
    {
      n: 13, slug: 'not-yet', ...board(M, 'not-yet'),
      title: 'Not Yet',
      blurb: fill(M,
        'Free cash flow went below zero, but Meta is still a growth company: revenue was {meta_revenue_q3_2026}, up {meta_revenue_growth_q3_2026}.'),
      section: 'Sinking the Ship?',
      source: 'primary',
    },
  ],
};

/** Newest first. The hub and the poster renderer both iterate this. */
export const collections: Collection[] = [metaMuseWonder, teslaSpacex, nebius, alexandrWang, anthropicIpo, cursor, situationalAwareness];

export const findCollection = (slug: string) => collections.find((c) => c.slug === slug);

/** Where the copied dashboard files live under public/. */
export const assetBase = (c: Collection) => `/analytics/${c.slug}`;

/** The live dashboard, embedded in an iframe on desktop (with its own `query`, if any). */
export const embedPath = (c: Collection, d: Dashboard) =>
  `/analytics/${c.slug}/${d.file}${d.query ? `?${d.query}` : ''}`;

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
