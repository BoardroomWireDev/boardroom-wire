/* ============================================================
   BOARDROOM WIRE — CURSOR VIDEO · FIGURES AND SOURCES
   Every number that appears on any dashboard lives here with its
   sourcing tier, its outlet, and — where the spec demands it — the
   on-screen credit that BW.provenance() renders automatically.

   Tiers:  P primary (company, SEC filing, direct quote)  → gold chip
           R named-outlet reporting                        → amber dashed chip
           E analyst / third-party estimate                → dotted chip, "Estimate"
           C Boardroom Wire's own arithmetic               → dotted chip
           X context only (no chip)

   Compiled from cursor-dashboard-spec.md and cursor-research-dossier.md
   (§19 data packages, §21 conflicts). A correction is one edit here.
   ============================================================ */

const BW_DATA = {
  sources: {
    company:      { name: 'Company',             tier: 'P' },
    sec8k:        { name: 'SEC Form 8-K',        tier: 'P' },
    anthropic:    { name: 'Anthropic',           tier: 'P' },
    openai:       { name: 'OpenAI',              tier: 'P' },
    information:  { name: 'The Information',    tier: 'R' },
    bloomberg:    { name: 'Bloomberg',           tier: 'R' },
    cnbc:         { name: 'CNBC',                tier: 'R' },
    techcrunch:   { name: 'TechCrunch',          tier: 'R' },
    fortune:      { name: 'Fortune',             tier: 'R' },
    vantage:      { name: 'Vantage',             tier: 'R' },
    contrary:     { name: 'Contrary Research',   tier: 'R' },
    sacra:        { name: 'Sacra',               tier: 'E' },
    ramp:         { name: 'Ramp',                tier: 'E' },
    jetbrains:    { name: 'JetBrains',           tier: 'E' },
    forbes:       { name: 'Forbes',              tier: 'E' },
    digitalapplied:{ name: 'Digital Applied',    tier: 'E' },
    bw:           { name: 'Boardroom Wire',      tier: 'C' }
  },

  figures: {
    /* ---- 01 · the founders ---------------------------------- */
    founder_stake:   { v: 2.4, fmt: 'bn1', approx: true, tier: 'E', src: 'forbes', date: 'Aug 2026',
                       mandatory: 'Founder stakes: Forbes estimate',
                       note: 'Forbes marks to the real SpaceX share price, not 4.5% of $60B' },
    founder_pct:     { v: 4.5, fmt: 'pct1', approx: true, tier: 'E', src: 'forbes' },
    founder_age:     { v: 25, fmt: 'int', tier: 'R', src: 'forbes', note: '"25 at the time of the sale" — no birth date' },

    /* ---- 03 / 06 · the ramp --------------------------------- */
    arr_1m_jan24:    { v: 1,   fmt: 'm0', approx: true, tier: 'E', src: 'sacra', date: 'Jan 2024',
                       mandatory: '$1M ARR: Sacra estimate' },
    arr_100m_jan25:  { v: 100, fmt: 'm0', tier: 'E', src: 'sacra', date: 'Jan 2025',
                       mandatory: '$100M ARR: Sacra estimate' },
    arr_500m_jun25:  { v: 500, fmt: 'm0', tier: 'P', src: ['company', 'bloomberg'], date: 'Jun 2025', note: 'stated at the Series C, 5 Jun 2025' },
    arr_1b_nov25:    { v: 1,   fmt: 'bn0', tier: 'P', src: 'company', date: 'Nov 2025', note: 'stated at the Series D, 13 Nov 2025' },
    arr_2b_feb26:    { v: 2,   fmt: 'bn0', tier: 'R', src: 'bloomberg', date: 'Feb 2026' },
    arr_3b_may26:    { v: 3,   fmt: 'bn0', tier: 'R', src: 'bloomberg', date: '21 May 2026' },
    arr_4b_mid26:    { v: 4,   fmt: 'bn0', approx: true, tier: 'E', src: 'sacra', date: 'mid 2026',
                       mandatory: '$4B ARR: Sacra estimate',
                       note: 'hollow marker on a dashed riser; never print an interval from $3B to $4B (mixed tiers)' },
    arr_27b_run:     { v: 2.7, fmt: 'bn1', approx: true, tier: 'R', src: 'information', date: 'quarter ended Jan 2026',
                       mandatory: 'Source: The Information' },
    growth_100x:     { v: 100, fmt: 'mult', tier: 'E', src: 'sacra', note: 'credit rides on the $1M and $100M figures' },

    /* ---- 04 · race to $100M (months from $1M to $100M ARR) -- */
    race_cursor:     { v: 12, fmt: 'mo', tier: 'E', src: 'sacra', mandatory: 'Race to $100M: Sacra estimates',
                       note: '$1M (Dec 2023) → $100M (Jan 2025). Other clocks give 15 or 21 — do not use them' },
    race_wiz:        { v: 18, fmt: 'mo', tier: 'E', src: 'sacra' },
    race_deel:       { v: 20, fmt: 'mo', tier: 'E', src: 'sacra' },
    race_ramp:       { v: 24, fmt: 'mo', tier: 'E', src: 'sacra' },
    /* Lovable (~8 months) beats Cursor. It is NOT on the chart. Kept here so nobody re-adds it. */
    race_lovable_do_not_chart: { v: 8, fmt: 'mo', tier: 'E', src: 'sacra', note: 'DO NOT CHART' },

    /* ---- 05 · same milestone, different business ------------ */
    wiz_customers:   { v: 260,    fmt: 'int', approx: true, tier: 'E', src: 'sacra',
                       mandatory: 'Customer counts and ACV: Sacra estimates' },
    wiz_acv:         { v: 384000, fmt: 'usd0', display: '$384K', tier: 'E', src: 'sacra' },
    cursor_customers:{ v: 360000, fmt: 'int', approx: true, tier: 'E', src: 'sacra' },
    cursor_acv:      { v: 276,    fmt: 'usd0', tier: 'E', src: 'sacra' },
    milestone_mult:  { v: 1385,   fmt: 'mult', display: '1,400×', tier: 'C', src: 'bw', note: '360,000 ÷ 260' },
    deel_customers:  { v: 1800,   fmt: 'int', approx: true, tier: 'E', src: 'sacra' },
    deel_acv:        { v: 55000,  fmt: 'usd0', display: '$55K', tier: 'E', src: 'sacra' },
    ramp_customers:  { v: 5000,   fmt: 'int', approx: true, tier: 'E', src: 'sacra' },
    ramp_acv:        { v: 20000,  fmt: 'usd0', display: '$20K', tier: 'E', src: 'sacra' },

    /* ---- 07 / 12 · funding --------------------------------- */
    preseed_raised:  { v: 400,  fmt: 'k0', tier: 'R', src: 'techcrunch', date: 'Apr 2022', note: 'incl. $200K from Alameda Research' },
    seed_raised:     { v: 8,    fmt: 'm0', tier: 'P', src: ['company', 'techcrunch'], date: 'Oct 2023', note: 'led by the OpenAI Startup Fund' },
    seed_post:       { v: null, fmt: 'raw', display: 'not disclosed', tier: 'X', src: 'company', note: 'NEVER infer a number' },
    a_raised:        { v: 60,   fmt: 'm0', tier: 'P', src: 'company', date: 'Aug 2024', note: 'August, not June' },
    a_post:          { v: 400,  fmt: 'm0', tier: 'P', src: 'company', date: 'Aug 2024' },
    b_raised:        { v: 105,  fmt: 'm0', approx: true, tier: 'R', src: 'techcrunch', date: 'Dec 2024', note: 'reported as $100M / $105M / $150M; use ~$105M' },
    b_post:          { v: 2.6,  fmt: 'bn1', tier: 'R', src: 'techcrunch', date: 'Dec 2024' },
    c_raised:        { v: 900,  fmt: 'm0', tier: 'P', src: 'company', date: 'Jun 2025' },
    c_post:          { v: 9.9,  fmt: 'bn1', tier: 'P', src: 'company', date: 'Jun 2025' },
    d_raised:        { v: 2.3,  fmt: 'bn1', tier: 'P', src: 'company', date: 'Nov 2025' },
    d_post:          { v: 29.3, fmt: 'bn1', tier: 'P', src: 'company', date: 'Nov 2025' },
    d_multiple:      { v: 29,   fmt: 'mult', tier: 'C', src: 'bw', note: '$29.3B ÷ $1B ARR' },
    total_raised:    { v: 3.3,  fmt: 'bn1', display: '~$3.3B', tier: 'R', src: ['fortune', 'techcrunch'], note: '$3.3–3.4B in primary capital' },

    /* ---- 08 · where the dollar goes ------------------------- */
    gm_neg23:        { v: -23,  fmt: 'spct0', tier: 'R', src: 'information', date: 'quarter ended Jan 2026',
                       mandatory: 'Source: The Information', note: 'the load-bearing figure of the video' },
    cost_123:        { v: 1.23, fmt: 'usd2', tier: 'R', src: 'information', derived: true,
                       mandatory: 'Source: The Information', note: 'derived from the −23% margin — not separately reported' },
    rev_770m:        { v: 770,  fmt: 'm0', approx: true, tier: 'R', src: 'information', date: 'FY2025',
                       mandatory: 'Source: The Information' },
    loss_900m:       { v: 900,  fmt: 'm0', approx: true, tier: 'R', src: 'information', date: 'FY2025',
                       mandatory: 'Source: The Information' },
    saas_margin:     { v: 78,   fmt: 'spct0', display: '+78%', tier: 'X', src: 'company', note: 'typical software gross margin, 75–80%' },
    saas_cost:       { v: 0.22, fmt: 'usd2', tier: 'X', src: 'company' },

    /* ---- 09 · revenue up, share down ------------------------ */
    share_ramp_jun25:{ v: 41, fmt: 'pct0', tier: 'E', src: 'ramp', date: 'Jun 2025',
                       mandatory: 'Share of corporate AI-coding spend: Ramp (via CNBC)' },
    share_ramp_may26:{ v: 26, fmt: 'pct0', tier: 'E', src: 'ramp', date: 'May 2026' },
    adopt_jb_jan26:  { v: 18, fmt: 'pct0', tier: 'E', src: 'jetbrains', date: 'Jan 2026',
                       mandatory: 'Workplace adoption: JetBrains' },
    adopt_jb_mid26:  { v: 12, fmt: 'pct0', tier: 'E', src: 'jetbrains', date: 'May–Jul 2026' },
    cc_apr25:        { v: 3,  fmt: 'pct0', tier: 'E', src: 'jetbrains', date: 'Apr 2025', mandatory: 'Workplace adoption: JetBrains' },
    cc_jan26:        { v: 18, fmt: 'pct0', tier: 'E', src: 'jetbrains', date: 'Jan 2026' },
    cc_mid26:        { v: 39, fmt: 'pct0', tier: 'E', src: 'jetbrains', date: 'May–Jul 2026', note: '47% in the US' },

    /* ---- 10 · composer vs opus (list price per million tokens) */
    composer2_in:    { v: 0.50, fmt: 'usd2', tier: 'R', src: ['vantage', 'company'], date: 'Mar 2026',
                       mandatory: 'Pricing: Vantage / Cursor docs · list price' },
    composer2_out:   { v: 2.50, fmt: 'usd2', tier: 'R', src: ['vantage', 'company'] },
    composer15_in:   { v: 3.50, fmt: 'usd2', tier: 'R', src: 'vantage', date: 'Feb 2026' },
    opus_in:         { v: 5.00, fmt: 'usd2', tier: 'P', src: 'anthropic' },
    opus_out:        { v: 25.00,fmt: 'usd2', tier: 'P', src: 'anthropic' },
    token_rate:      { v: 0.25, fmt: 'usd2', tier: 'P', src: 'company', note: 'Cursor Token Rate on third-party models, Teams/Enterprise; first-party models exempt' },
    task_composer:   { v: 0.10, fmt: 'usd2', approx: true, tier: 'E', src: 'digitalapplied', mandatory: 'Per-task cost: Digital Applied estimate' },
    task_opus:       { v: 1.00, fmt: 'usd2', approx: true, tier: 'E', src: 'digitalapplied' },

    /* ---- 11 · the trap (events) ----------------------------- */
    ev_openai_seed:  { v: 'Seeded the $8M round', fmt: 'raw', tier: 'R', src: 'techcrunch', date: 'Oct 2023' },
    ev_openai_cut:   { v: 'Terminated model access', fmt: 'raw', tier: 'P', src: 'openai', date: '28 Aug 2026', note: 'post-close' },
    ev_anth_supply:  { v: 'Supplied the primary models', fmt: 'raw', tier: 'P', src: 'anthropic', date: '2023–' },
    ev_anth_cc:      { v: 'Launched Claude Code', fmt: 'raw', tier: 'P', src: 'anthropic', date: 'Feb 2025' },
    ev_msft_fork:    { v: 'VS Code forked', fmt: 'raw', tier: 'P', src: 'company', date: '2022' },
    ev_msft_bid:     { v: 'Weighed a bid, walked', fmt: 'raw', tier: 'R', src: 'cnbc', date: 'Apr 2026', note: 'antitrust' },
    ev_funds_check:  { v: 'Could write a $2B check', fmt: 'raw', tier: 'R', src: 'techcrunch', date: 'Apr 2026' },
    ev_iconiq:       { v: 'Declined at $50B', fmt: 'raw', tier: 'R', src: ['information', 'contrary'], date: 'Apr 2026',
                       mandatory: 'Iconiq: The Information', note: 'had already funded OpenAI and Anthropic' },

    /* ---- 12 · the deal -------------------------------------- */
    deal_announced:  { v: '21 Apr 2026', fmt: 'raw', tier: 'P', src: 'company' },
    deal_strike:     { v: 60, fmt: 'bn0', tier: 'P', src: 'company', date: '21 Apr 2026' },
    deal_alt:        { v: 10, fmt: 'bn0', tier: 'R', src: 'cnbc', note: 'payment for the collaborative work if not exercised. NOT a break fee' },
    deal_exercised:  { v: '16 Jun 2026', fmt: 'raw', tier: 'P', src: 'company', note: '4 days after the SpaceX IPO' },
    deal_closed:     { v: '14 Aug 2026', fmt: 'raw', tier: 'P', src: 'sec8k' },
    deal_consideration:{ v: 'All stock', fmt: 'raw', tier: 'P', src: 'sec8k' },
    shares:          { v: 389289254, fmt: 'int', tier: 'P', src: 'sec8k', mandatory: 'Share count: SEC Form 8-K' },
    deal_value:      { v: 60, fmt: 'bn0', tier: 'P', src: 'company', display: '$60,000,000,000' },
    deal_record:     { v: 'Largest acquisition of a venture-backed startup on record', fmt: 'raw', tier: 'R', src: 'bloomberg' },
    cmp_wiz:         { v: 32, fmt: 'bn0', tier: 'R', src: 'bloomberg', date: '2025', verify: true, note: 'Google · verify before airing' },
    cmp_whatsapp:    { v: 19, fmt: 'bn0', tier: 'R', src: 'bloomberg', date: '2014', verify: true, note: 'Facebook · verify before airing' },
    disc_strike:     { v: 154.13, fmt: 'usd2', tier: 'C', src: 'bw', note: '$60.0B ÷ 389,289,254', mandatory: 'Boardroom Wire calculation' },
    disc_spcx:       { v: 140, fmt: 'usd0', display: '$135.53–$140', tier: 'R', src: 'cnbc', date: '14 Aug 2026' },
    disc_value:      { v: 54.5, fmt: 'bn1', approx: true, tier: 'C', src: 'bw', mandatory: 'Boardroom Wire calculation' }
  },

  /* Funding rounds in ladder order. post:null = never disclosed. */
  rounds: [
    { id: 'preseed', name: 'Pre-seed', date: 'Apr 2022', raised: 'preseed_raised', post: null, lead: 'incl. Alameda', tick: true },
    { id: 'seed',    name: 'Seed',     date: 'Oct 2023', raised: 'seed_raised',    post: null, lead: 'OpenAI Startup Fund', tick: true },
    { id: 'a',       name: 'Series A', date: 'Aug 2024', raised: 'a_raised', post: 'a_post', lead: 'a16z' },
    { id: 'b',       name: 'Series B', date: 'Dec 2024', raised: 'b_raised', post: 'b_post', lead: 'Thrive' },
    { id: 'c',       name: 'Series C', date: 'Jun 2025', raised: 'c_raised', post: 'c_post', lead: 'Thrive' },
    { id: 'd',       name: 'Series D', date: 'Nov 2025', raised: 'd_raised', post: 'd_post', lead: 'Accel + Coatue' }
  ],

  /* ARR points for the ramp, in order. solid:false = estimate (hollow marker, dashed riser). */
  arr: [
    { id: 'arr_1m_jan24',   t: 'Jan 2024', v: 0.001, label: '$1M',   solid: false },
    { id: 'arr_100m_jan25', t: 'Jan 2025', v: 0.1,   label: '$100M', solid: false, interval: '12 months', milestone: true },
    { id: 'arr_500m_jun25', t: 'Jun 2025', v: 0.5,   label: '$500M', solid: true,  interval: '5 months' },
    { id: 'arr_1b_nov25',   t: 'Nov 2025', v: 1.0,   label: '$1B',   solid: true,  interval: '5 months', milestone: true },
    { id: 'arr_2b_feb26',   t: 'Feb 2026', v: 2.0,   label: '$2B',   solid: true,  interval: '3 months' },
    { id: 'arr_3b_may26',   t: 'May 2026', v: 3.0,   label: '$3B',   solid: true,  interval: '3 months', milestone: true },
    { id: 'arr_4b_mid26',   t: 'mid 2026', v: 4.0,   label: '~$4B',  solid: false, interval: null }
  ],

  /* Figures that do not exist. Listed so the audit can refuse them. */
  forbidden: ['churn', 'net revenue retention', 'NRR', 'S-1 financials', 'headcount 1,500', 'headcount 300', 'Lovable']
};

if (typeof globalThis !== 'undefined') globalThis.BW_DATA = BW_DATA;
if (typeof module !== 'undefined' && module.exports) module.exports = BW_DATA;
