/* ============================================================
   BOARDROOM WIRE — ANTHROPIC IPO · FIGURES AND SOURCES
   Every number on any board or plate lives here with its sourcing tier and outlet; the
   on-screen credit is rendered by BW.provenance(). A correction is one edit here.
   Tiers: P primary · R reported · E estimate · C Boardroom Wire arithmetic
   Filled 2 Oct 2026 from 03-script/03 Fact ledger.md (approved script: 03-script/02 Draft v3.md).
   Every figure from Anthropic's draft prospectus is "as reported by Reuters": it carries
   `mandatory` so the credit says so on screen. No public S-1 exists yet.
   `label` is a name, a date or a unit only (rule 16): it may be shown on a board.
   ============================================================ */
const DRAFT = "Anthropic's draft IPO filing, as reported by Reuters";
const BW_DATA = {
  sources: {
    reuters_draft: { name: 'Reuters', tier: 'R', title: "Anthropic's draft prospectus, seen by Reuters (stories of 28–30 Sep 2026)" },
    /* 'Reuters, citing sources' (not 'Reuters'): these figures are Reuters' own sourced reporting, not the draft,
       and a bare 'Reuters' is swallowed by the DRAFT credit (06-years lost its forecast source, 2 Oct) */
    reuters:       { name: 'Reuters, citing sources', tier: 'R' },
    /* public-record market facts Reuters reported (not its sourced scoops): SpaceX priced 12 Jun 2026. Named 'Reuters
       market data' so a board that also carries the draft's mandatory credit doesn't swallow it (see the note above) */
    reuters_mkt:   { name: 'Reuters market data', tier: 'R' },
    bloomberg:     { name: 'Bloomberg', tier: 'R', title: 'Bloomberg, relayed by CNBC (14–15 Aug 2026)' },
    cnbc:          { name: 'CNBC', tier: 'R' },
    nyt:           { name: 'The New York Times', tier: 'R', title: '19 Sep 2026, people familiar with the finances (via Gulf News)' },
    /* named 'Anthropic announcements', not 'Anthropic': provenance() drops an outlet whose name appears inside a
       mandatory credit, and DRAFT begins "Anthropic's" (07-circle lost its $33B source that way, 2 Oct) */
    anthropic:     { name: 'Anthropic announcements', tier: 'P', title: 'Anthropic funding and compute announcements' },
    meta_10k:      { name: 'Meta Platforms Form 10-K', tier: 'P', url: 'https://www.sec.gov/' },
    morningstar:   { name: 'Morningstar via Reuters', tier: 'E' },
    bw:            { name: 'Boardroom Wire', tier: 'C' }
  },
  figures: {
    /* ---- Misconception #1: the revenue --------------------------------------- */
    /* Reuters 28 Sep: "nearly $4.6 billion", up 12-fold */
    rev_2025:     { v: 4.6,   display: '$4.6B',   tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', label: '2025', mandatory: DRAFT },
    /* Bloomberg via CNBC 14–15 Aug: "more than $11.5 billion", preliminary */
    rev_q2_2026:  { v: 11.5,  display: '$11.5B',  tier: 'R', src: 'bloomberg', asOf: '2026-06-30', label: 'Q2 2026', note: 'more than; preliminary' },
    /* CNBC 15 Aug: $787M in Q2 2025 */
    rev_q2_2025:  { v: 0.787, display: '$787M',   tier: 'R', src: 'cnbc', asOf: '2025-06-30', label: 'Q2 2025' },
    /* CNBC: "14-fold" year on year (11.5 ÷ 0.787 ≈ 14.6) */
    q2_yoy:       { v: 14,    display: '14×',     tier: 'R', src: 'cnbc', asOf: '2026-08-15' },

    /* run-rate milestones: company posts, then CNBC for July */
    rr_jan25:     { v: 1,   display: '$1B',  tier: 'P', src: 'anthropic', asOf: '2025-01', label: 'Jan 2025' },
    rr_aug25:     { v: 5,   display: '$5B',  tier: 'P', src: 'anthropic', asOf: '2025-08', label: 'Aug 2025', note: 'over' },
    rr_dec25:     { v: 9,   display: '$9B',  tier: 'P', src: 'anthropic', asOf: '2025-12', label: 'Dec 2025' },
    rr_feb26:     { v: 14,  display: '$14B', tier: 'P', src: 'anthropic', asOf: '2026-02', label: 'Feb 2026' },
    rr_apr26:     { v: 30,  display: '$30B', tier: 'P', src: 'anthropic', asOf: '2026-04', label: 'Apr 2026', note: 'over' },
    rr_may26:     { v: 47,  display: '$47B', tier: 'P', src: 'anthropic', asOf: '2026-05', label: 'May 2026', note: 'over' },
    rr_jul26:     { v: 65,  display: '$65B', tier: 'R', src: 'cnbc',      asOf: '2026-07-31', label: 'Jul 2026' },
    /* NYT 19 Sep: "on track to exceed $100 billion in annualised revenue by the end of 2026" */
    rr_dec26:     { v: 100, display: '$100B', tier: 'R', src: 'nyt',      asOf: '2026-09-19', label: 'Dec 2026', note: 'on track, per people familiar; a projection' },
    rr_65x:       { v: 65,  display: '65×',  tier: 'C', src: 'bw', asOf: '2026-07-31', label: '19 months' },
    rr_q2_annualised: { v: 46, display: '≈$46B', tier: 'C', src: 'bw', asOf: '2026-06-30', label: 'run rate', note: 'Q2 2026 revenue ($11.5B, rev_q2_2026) × 4: the worked example in 27 (NOTES-pass1, 3 Oct)' },

    /* ---- Misconception #2: the loss ------------------------------------------ */
    loss_2025:    { v: 42,  display: '$42B',  tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', label: '2025', mandatory: DRAFT },
    /* "an accounting charge … rather than money the company spent running its business" */
    noncash_2025: { v: 34,  display: '$34B',  tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', mandatory: DRAFT },
    /* 42 − 34 ≈ 8; Reuters: operating loss "more than $8 billion" */
    burn_2025:    { v: 8,   display: '$8B',   tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', mandatory: DRAFT, note: 'more than' },
    cash_2025:    { v: 20.28, display: '$20.3B', tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', label: 'Dec 31, 2025', mandatory: DRAFT },

    /* ---- The real cost: compute ---------------------------------------------- */
    compute_2025: { v: 7.33, display: '$7.33B', tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', label: 'Compute, 2025', mandatory: DRAFT },
    rev_2025_in:  { v: 4.6,  display: '$4.6B',  tier: 'R', src: 'reuters_draft', asOf: '2025-12-31', label: 'Revenue, 2025', mandatory: DRAFT },
    compute_per_dollar: { v: 1.6, display: '$1.60', tier: 'C', src: 'bw', asOf: '2025-12-31' },

    /* ---- The $518 billion ----------------------------------------------------- */
    commit_total:     { v: 518,   display: '$518B',  tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', mandatory: DRAFT, note: 'at least; about a decade' },
    commit_broadcom:  { v: 161.2, display: '$161B',  tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Broadcom', mandatory: DRAFT },
    commit_google:    { v: 111.1, display: '$111B',  tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Google', mandatory: DRAFT },
    commit_amazon:    { v: 110,   display: '$110B',  tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Amazon', mandatory: DRAFT },
    commit_xai:       { v: 84.5,  display: '$84.5B', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'xAI', mandatory: DRAFT, note: 'up to' },
    commit_microsoft: { v: 31.4,  display: '$31.4B', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Microsoft', mandatory: DRAFT },
    commit_amd:       { v: 20,    display: '$20B',   tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'AMD', mandatory: DRAFT, note: 'more than' },
    /* contract terms (PLAN-build-rest #1, 3 Oct; ledger rows 85, 86, 88, 104): start/end as YYYY-MM (null = not reported);
       v = the end year as a decimal (month/12) for drawing; display = the span as dates */
    term_google:      { v: 2033.5,  start: '2026-04', end: '2033-07', display: 'Apr 2026–Jul 2033', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Google', mandatory: DRAFT },
    term_amazon:      { v: 2036.25, start: '2026-05', end: '2036-04', display: 'May 2026–Apr 2036', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Amazon', mandatory: DRAFT },
    term_msft:        { v: 2033.33, start: '2026-11', end: '2033-05', display: 'Nov 2026–May 2033', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Microsoft', mandatory: DRAFT },
    term_xai:         { v: 2029,    start: null,      end: '2029',    display: 'through 2029',      tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'xAI', mandatory: DRAFT, note: 'largely cancelable with 90 days notice; end year only' },
    /* ledger rows 92/195: Google and Broadcom capacity starts coming online in 2027 (Anthropic's post, 6 Apr 2026) */
    online_2027:      { v: 2027,    display: '2027', tier: 'P', src: 'anthropic', asOf: '2026-04-06', label: 'Google and Broadcom' },
    /* ledger rows 36/170: the draft is 261 pages, about 80 of them risk factors (CNBC) */
    pages_total:      { v: 261,     display: '261',  tier: 'R', src: 'cnbc', asOf: '2026-09-29', label: 'pages' },
    pages_risk:       { v: 80,      display: '80',   tier: 'R', src: 'cnbc', asOf: '2026-09-29', label: 'pages of risk factors', note: 'about' },
    /* "About 80% of that sum is non-cancelable or requires payment regardless of usage" */
    locked_pct:       { v: 80,  fmt: 'pct0', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', mandatory: DRAFT },
    locked_amt:       { v: 414, display: '$414B', tier: 'C', src: 'bw', asOf: '2026-09-29' },

    /* ---- How Anthropic pays for it ------------------------------------------- */
    years_at_jul:     { v: 8,   display: '8',   tier: 'C', src: 'bw', asOf: '2026-07-31', label: 'years' },
    /* Reuters 15 Aug (sources): valuation "hinges on" $190–200B of revenue in 2028 */
    fcst_2028:        { v: 195, display: '$190–200B', tier: 'R', src: 'reuters', asOf: '2026-08-15', label: '2028' },
    years_at_2028:    { v: 2.7, display: '2.7', tier: 'C', src: 'bw', asOf: '2026-08-15', label: 'years' },
    /* Meta FY2025 10-K: revenue $200,966M */
    meta_rev_2025:    { v: 201, display: '$201B', tier: 'P', src: 'meta_10k', asOf: '2025-12-31', label: 'Meta, 2025' },
    raised_feb26:     { v: 30,  display: '$30B',  tier: 'P', src: 'anthropic', asOf: '2026-02-12', label: 'Feb 2026' },
    raised_may26:     { v: 65,  display: '$65B',  tier: 'P', src: 'anthropic', asOf: '2026-05-28', label: 'May 2026' },
    credit_line:      { v: 15,  display: '$15B',  tier: 'R', src: 'bloomberg', asOf: '2026-09-03' },
    ipo_raise:        { v: 100, display: '$100B', tier: 'R', src: 'reuters', asOf: '2026-09-11', label: 'IPO', note: 'as much as' },
    /* circular financing: Amazon $8B + $5B + up to $20B more (Anthropic posts; our sum) */
    amzn_equity:      { v: 33,  display: '$33B',  tier: 'P', src: 'anthropic', asOf: '2026-04-20', label: 'Amazon', note: 'up to' },
    amzn_compute:     { v: 110, display: '$110B', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Amazon', mandatory: DRAFT },
    goog_compute:     { v: 111.1, display: '$111B', tier: 'R', src: 'reuters_draft', asOf: '2026-09-29', label: 'Google', mandatory: DRAFT },

    /* ---- The $2 trillion math ------------------------------------------------ */
    val_e:   { v: 61.5, display: '$61.5B', tier: 'P', src: 'anthropic', asOf: '2025-03-03', label: 'Mar 2025' },
    val_f:   { v: 183,  display: '$183B',  tier: 'P', src: 'anthropic', asOf: '2025-09-02', label: 'Sep 2025' },
    val_g:   { v: 380,  display: '$380B',  tier: 'P', src: 'anthropic', asOf: '2026-02-12', label: 'Feb 2026' },
    val_h:   { v: 965,  display: '$965B',  tier: 'P', src: 'anthropic', asOf: '2026-05-28', label: 'May 2026' },
    /* Reuters' sources: "around / about / more than $2 trillion". Not a prospectus figure */
    val_ipo: { v: 2000, display: '$2T',    tier: 'R', src: 'reuters', asOf: '2026-09-29', label: 'IPO' },
    /* post-money ÷ run-rate at the time of each round (61.5/1, 183/5, 380/14, 965/47) */
    mult_e:  { v: 61, display: '61×', tier: 'C', src: 'bw', asOf: '2025-03-03', label: 'Mar 2025' },
    mult_f:  { v: 37, display: '37×', tier: 'C', src: 'bw', asOf: '2025-09-02', label: 'Sep 2025' },
    mult_g:  { v: 27, display: '27×', tier: 'C', src: 'bw', asOf: '2026-02-12', label: 'Feb 2026' },
    mult_h:  { v: 20, display: '20×', tier: 'C', src: 'bw', asOf: '2026-05-28', label: 'May 2026' },
    /* $2T against four revenue bases: 2,000 ÷ 4.6 · 65 · 100 · 195 */
    mult_booked: { v: 435, display: '435×', tier: 'C', src: 'bw', asOf: '2025-12-31', label: '2025' },
    mult_jul:    { v: 31,  display: '31×',  tier: 'C', src: 'bw', asOf: '2026-07-31', label: 'Jul 2026' },
    mult_dec26:  { v: 20,  display: '20×',  tier: 'C', src: 'bw', asOf: '2026-09-19', label: 'Dec 2026' },
    mult_2028:   { v: 10,  display: '10×',  tier: 'C', src: 'bw', asOf: '2026-08-15', label: '2028' },
    morningstar_mult: { v: 19, display: '18–20×', tier: 'E', src: 'morningstar', asOf: '2026-09-29' },
    /* Reuters 28 Sep: SpaceX listed at $1.77T (Nasdaq, 12 Jun 2026); fact ledger row 137 */
    spacex_val:       { v: 1770, display: '$1.77T', tier: 'R', src: 'reuters_mkt', asOf: '2026-06-12', label: 'SpaceX' },
    /* verified 2 Oct (the figure audit): $75B at $1.77T is the record IPO raise (Aramco raised $29.4B) */
    spacex_raise:     { v: 75, display: '$75B', tier: 'R', src: 'reuters_mkt', asOf: '2026-06-12', label: 'SpaceX' },

    /* ---- Flagships (20–23, 2 Oct): Boardroom Wire arithmetic on the figures above, nothing new reported ---- */
    /* renting = Google + Amazon + xAI + Microsoft (111.1 + 110 + 84.5 + 31.4); hardware = Broadcom + AMD (161.2 + 20) */
    group_rent:   { v: 337,   display: '$337B', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    group_hw:     { v: 181.2, display: '$181B', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    /* each partner's share of the $518B */
    share_broadcom:  { v: 31.1, fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    share_google:    { v: 21.4, fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    share_amazon:    { v: 21.2, fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    share_xai:       { v: 16.3, fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    share_microsoft: { v: 6.1,  fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    share_amd:       { v: 3.9,  fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    /* 518 − 414 */
    unlocked_amt: { v: 104, display: '$104B', tier: 'C', src: 'bw', asOf: '2026-09-29' },
    unlocked_pct: { v: 20,  fmt: 'pct0', tier: 'C', src: 'bw', asOf: '2026-09-29' }
  }
};
if (typeof module !== 'undefined') module.exports = BW_DATA;
