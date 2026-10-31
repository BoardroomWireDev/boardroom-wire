/**
 * sync-article.mjs
 *
 * One re-runnable step that brings a video's article onto the site from the video project, so
 * no number on the page is typed here:
 *
 *   npm run sync:article -- tesla-spacex
 *
 *   1. syncs the boards (scripts/sync-dashboards.mjs --only <slug>);
 *   2. opens each board headless at ?final&still and reads what it rendered: its credit line,
 *      the figure keys it drew, and its footage windows (hidden on the web, which has no footage);
 *   3. writes src/data/figures/<slug>.json: those, plus every figure in the video's
 *      shared/data.js (display, spoken form, label, credit, tier, date). The manifest's copy
 *      prints the spoken form ("about $1.98 trillion"), the breakdown table the display ("$1.98T");
 *   4. rebuilds the body of src/content/articles/<slug>.mdx from the words: the video's
 *      ship/site/ARTICLE.md when the head writer has written it, else the essay generated from
 *      the locked script. Each board lands after the paragraph holding its anchor; a missing
 *      anchor stops the run, so a re-cut script cannot drop a board silently. The frontmatter
 *      already in the .mdx is kept;
 *   5. renders the posters (scripts/render-posters.mjs --only <slug>).
 *
 * Print-only changes to the words belong in ARTICLE.md, never in the .mdx (it is regenerated).
 * Override Chrome with CHROME_PATH.
 */
import { execFile, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOARDROOM = path.resolve(ROOT, '../../OneDrive/Desktop/Boardroom 2.0');

/* Per article: the boards (file, web slug, the words of the paragraph it follows), the quotes the
   video plays as clips (shown in print from data.js, after their paragraph), and the narration's
   pointer to this page, which print drops; the breakdown table closes the article instead. */
const ARTICLES = {
  'tesla-spacex': {
    boards: [
      ['02-the-tune-changes.html', 'the-tune-changes', 'people are betting real money on it'],
      ['03-the-last-big-piece.html', 'the-last-big-piece', 'And Tesla is the last big piece.'],
      ['04-the-deal-on-the-table.html', 'the-deal-on-the-table', 'Together, that\'s a company worth'],
      // Lock day (Jarvis, 19 Oct): Ive's re-cut of 05 drops the Cybercab row from its last frame, so after that
      // resync the board rests at `?t=eighty-0.5`, not `?final`: set `rest: 't=eighty-0.5'` on the-autonomy-bet in
      // src/data/analytics.ts (it drives the embed's rest frame and the poster), then re-render the posters.
      ['05-the-autonomy-bet.html', 'the-autonomy-bet', 'Tesla\'s value is a bet on autonomy'],
      ['06-the-five-layers.html', 'the-five-layers', 'the money is moving up the layers fast'],
      ['07-the-loop.html', 'the-loop', 'You can already see it.'],
      ['08-each-on-its-own.html', 'each-on-its-own', 'SpaceX is smaller, but growing much faster.'],
      ['09-one-balance-sheet.html', 'one-balance-sheet', 'Put them together'],
      ['10-a-hundred-trillion.html', 'a-hundred-trillion', 'I\'m not underwriting that $100 trillion number'],
      ['11-control.html', 'control', 'the first one is control'],
    ],
    quotes: [
      ['Musk told the crowd exactly what they were about to see.', 'clue_roadster_musk_collaboration_remark_oct2026'],
    ],
    breakdown: 'is up on boardroomwire.com',
    /* How the narration says a figure, word for word, where it does: the copy around the boards prints
       these instead of the board's shorthand. Each phrase must appear in the words, or the run stops
       (a lock-day re-cut that changes a number changes its phrase too). Every other figure gets the
       general spoken form below. */
    spoken: {
      spacex_market_cap_2026_10_16: 'about $1.98 trillion',
      tesla_market_cap_cover_shares_2026_10_16: 'about $1.4 trillion',
      c_combined_mcap_2026_10_16: 'about $3.4 trillion',
      c_combined_mcap_to_fy2025_revenue: 'about 30 times',
      c_spacex_mcap_to_fy2025_revenue: 'about a hundred times',
      musk_claim_c_100t_implied_growth: 'roughly 48% a year',
      fwd_tsla_rt_cybercab_capacity_deck: 'more than 125,000',
      fwd_tsla_opt_q4_deck_capacity_1m: 'a million',
      fwd_tsla_fsd_active_subs_q2: 'about 1.5 million',
      barclays_combined_musk_37_56: 'more than half',
      tesla_fy2025_revenue_total: 'about $95 billion',
      spacex_fy2025_revenue_total: 'about $19 billion',
      c_combined_fy2025_revenue: 'about $114 billion',
      c_combined_cash_2026_06_30: 'about $144 billion',
      tesla_q2_2026_operating_income: 'under $400 million',
      spacex_q2_2026_capex_total: 'about $18 billion',
      spacex_ipo_valuation: 'about $1.8 trillion',
      spacex_fy2025_revenue_share_connectivity: 'about 60%',
      spacex_q2_2026_revenue_share_ai: 'a third',
      c_tesla_fy2025_automotive_revenue_share: 'about three quarters',
      tesla_musk_ownership_pct: 'about a fifth',
      spacex_musk_voting_power_post_ipo: 'more than 80%',
      spacex_class_b_ten_votes: 'ten',
    },
  },
  /* Meta Q3: the boards in the order Shakespeare placed them in ship/site/ARTICLE.md, each after the paragraph holding its
     anchor. No clip is printed from data.js (the article prints the call's quotes in its words). The narration's pointer to
     this page is dropped in print; there is no breakdown table for this video (`drop`, not `breakdown`). */
  'meta-muse-wonder': {
    boards: [
      ['09-the-waterline.html', 'the-waterline', 'a company known for printing cash'],
      ['hero-scorecard.html', 'the-scorecard', 'broke my brain'],
      ['hero-wonder.html', 'muse-wonder', "just behind Anthropic's Claude Opus 5.5 at 58"],
      ['hero-revenue.html', 'the-revenue', 'keeping the trains running on time'],
      ['hero-profit-vs-cash.html', 'profit-and-cash', 'still grew 9%'],
      ['hero-cash.html', 'cash-in-cash-out', 'a little more debt than cash'],
      ['32-the-capex-column.html', 'the-capex-column', 'for the fourth quarter alone'],
      ['26-the-stock.html', 'the-stock', 'down almost 7%'],
      ['27-the-theoretical-maximum.html', 'a-theoretical-maximum', 'not its actual plan'],
      ['37-the-raise.html', 'the-raise', 'As I was finishing this piece'],
      ['hero-ai-strategy.html', 'the-strategy', "a store's agent"],
      ['07-the-muse-cases.html', 'the-muse-cases', 'That comes to about $16 billion'],
      ['33-the-waterline-reprise.html', 'not-yet', 'Meta spent more than its business brought in'],
    ],
    drop: 'is up on boardroomwire.com',
    quotes: [],
    spoken: {
      meta_fcf_q3_2026: 'minus $2.1 billion',
      c_meta_muse_daily_people_q3_2026: 'roughly 2.5 million',
      meta_legal_charge_q3_2026: '$9.9 billion',
      c_meta_capex_q4_2026_implied: 'about $50 to $60 billion',
      meta_capex_2025: '$72 billion',
      meta_capex_9m_2026: 'about $86 billion',
      meta_atm_program_2027_max: 'up to another $60 billion',
      meta_capex_guide_fy2026: 'up to $145 billion',
      meta_share_price_change_22_oct_2026: 'almost 7%',
      fwd_meta_muse_revenue_share_of_capex_2027_bull: 'around a tenth',
      aa_wonder_full_index: '56',
      aa_opus55_index: '58',
    },
  },
  /* SpaceX Q3: Shakespeare places the four hero boards himself, as <DashboardEmbed> lines in ship/site/ARTICLE.md, so
     these carry no anchor (null): the run only checks the words still hold each one. No clip is printed from data.js
     (the article prints the call's quotes in its words) and there is no pointer to this page to drop. */
  'spacex-q3-2026': {
    boards: [
      ['69-quarter-dashboard.html', 'the-quarter', null],
      ['83-cases-dashboard.html', 'the-three-cases', null],
      ['89-coreweave-dashboard.html', 'coreweave-and-spacex', null],
      ['94-cash-dashboard.html', 'the-cash', null],
    ],
    quotes: [],
    spoken: {
      c_spacex_q3_2026_si_growth_multiple_yoy: 'more than nine times',
      spacex_q3_2026_si_share_of_revenue: '52%',
      c_spacex_q3_2026_connectivity_share_of_revenue: '36%',
      spacex_q3_2026_space_share_of_revenue: '12%',
      c_spacex_case_high_20gw_50: '$1 trillion',
      c_spacex_case_mid_vs_targets: 'triple',
      c_spacex_si_ex_cursor_vs_coreweave_q2: 'roughly two and a half times',
      coreweave_q2_2026_revenue: 'about $2.6 billion',
      spacex_q3_2026_fcf: 'about $10 billion',
      spacex_q3_2026_cash_and_securities: 'nearly $90 billion',
    },
  },
};

/* The general spoken form of a board's shorthand: "$1.98T" -> "$1.98 trillion", "125,000+" -> "more than
   125,000", "~48%" -> "about 48%", "29.8×" -> "29.8 times", "5th" -> "fifth"; our arithmetic and analysts'
   estimates (tiers C and E) are said with "about", as the writer does. */
const ORDINALS = { '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '6th': 'sixth',
  '7th': 'seventh', '8th': 'eighth', '9th': 'ninth', '10th': 'tenth' };
function spokenForm(display, tier) {
  let s = String(display).trim();
  if (ORDINALS[s]) return ORDINALS[s];
  let lead = '';
  if (s.startsWith('~')) { lead = 'about '; s = s.slice(1); }
  if (s.endsWith('+')) { lead = 'more than '; s = s.slice(0, -1); }
  if (s.startsWith('+') && s.endsWith('%')) s = s.slice(1);
  if (/^[−-]\$/.test(s)) s = `minus ${s.slice(1)}`;
  const units = { T: 'trillion', B: 'billion', M: 'million', K: 'thousand' };
  // Every amount in the display, so a range ("$135B to $145B") or a lead ("about $35B", "up to $60B") reads whole.
  s = s.replace(/(^|[\s$-])(\d[\d,]*(?:\.\d+)?)([TBMK])\b/g, (_, a, n, u) => `${a}${n.replace(/\.0+$/, '')} ${units[u]}`);
  s = s.replace(/^(\d[\d,]*(?:\.\d+)?)×$/, '$1 times');
  if (!lead && (tier === 'C' || tier === 'E') && /^\$?\d/.test(s)) lead = 'about ';
  return lead + s;
}

const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean).find((p) => existsSync(p));

function step(label, args) {
  console.log(`\n  ${label}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${label} failed`);
}

/* What the board drew: Chrome renders it and dumps the DOM. The timeout kills only this child. */
async function readBoard(file) {
  const url = `${pathToFileURL(file).href}?final&still&fit=0`;
  const { stdout } = await run(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-extensions',
    '--window-size=1920,1080', '--virtual-time-budget=9000', '--dump-dom', url], { timeout: 90000, maxBuffer: 64e6 });
  const credit = (stdout.match(/class="bw-source"[^>]*>([^<]*)</) || [])[1];
  const figures = (stdout.match(/data-figures="([^"]*)"/) || [])[1];
  const slots = JSON.parse((stdout.match(/<script id="bw-slots"[^>]*>([^<]*)</) || [])[1] || '{"slots":[]}').slots;
  if (!credit || !figures) throw new Error(`${path.basename(file)}: no credit line or figure list rendered`);
  const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return {
    credit: unescape(credit).trim(),
    figures: figures.trim().split(/\s+/),
    noslot: slots.filter((s) => s.kind === 'footage').map((s) => s.id).join(','),
  };
}

/* The words: ARTICLE.md (frontmatter dropped) or the essay (its title and generator note dropped). */
async function words(video) {
  /* WORDS=<file> stands in for the words while the head writer is still writing them (a preview only). */
  if (process.env.WORDS) {
    console.log(`    words from ${process.env.WORDS} (WORDS override, preview only)`);
    return (await readFile(process.env.WORDS, 'utf8')).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  }
  const article = path.join(video, 'ship/site/ARTICLE.md');
  if (existsSync(article)) {
    console.log('    words from ship/site/ARTICLE.md');
    return (await readFile(article, 'utf8')).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  }
  const essay = path.join(video, `${path.basename(video)}-essay.md`);
  console.log(`    words from ${path.basename(essay)} (no ship/site/ARTICLE.md yet)`);
  const text = await readFile(essay, 'utf8');
  return text.replace(/^# .*\r?\n\r?\n[\s\S]*?\r?\n\r?\n/, '');
}

async function main() {
  const slug = process.argv[2];
  const cfg = ARTICLES[slug];
  if (!cfg) throw new Error(`No article config for "${slug}"; add it to ARTICLES in scripts/sync-article.mjs.`);
  if (!CHROME) throw new Error('Chrome not found; set CHROME_PATH.');
  const video = path.join(BOARDROOM, 'videos', slug);

  step(`1. boards`, ['scripts/sync-dashboards.mjs', '--only', slug]);

  console.log('\n  2. what each board renders');
  const pub = path.join(ROOT, 'public/analytics', slug);
  const ctx = { module: {} };
  vm.runInNewContext(`${await readFile(path.join(pub, 'shared/data.js'), 'utf8')}\n;module.exports = BW_DATA;`, ctx);
  const data = ctx.module.exports;
  const boards = {};
  for (const [file, web] of cfg.boards) {
    boards[web] = { file, ...(await readBoard(path.join(pub, file))) };
    console.log(`    ${web.padEnd(24)} ${boards[web].figures.length} figures${boards[web].noslot ? ', footage hidden' : ''}`);
  }

  console.log('\n  3. figures');
  const text = await words(video);
  const said = text.replace(/\s+/g, ' ').toLowerCase();
  for (const [k, phrase] of Object.entries(cfg.spoken ?? {})) {
    if (!data.figures[k]) throw new Error(`No figure ${k} in data.js for its spoken form "${phrase}".`);
    if (!said.includes(phrase.toLowerCase())) throw new Error(`The words no longer say "${phrase}" (${k}): update spoken in scripts/sync-article.mjs.`);
  }
  const figures = {};
  for (const [k, f] of Object.entries(data.figures)) {
    const sources = (Array.isArray(f.src) ? f.src : [f.src]).filter(Boolean).map((s) => data.sources[s]?.name ?? s);
    const display = f.display ?? String(f.v);
    figures[k] = { display, spoken: cfg.spoken?.[k] ?? spokenForm(display, f.tier), label: f.label ?? '', credit: f.credit ?? '',
      tier: f.tier, asOf: f.asOf, sources, ...(f.mandatory && { mandatory: f.mandatory }) };
  }
  const json = path.join(ROOT, 'src/data/figures', `${slug}.json`);
  await mkdir(path.dirname(json), { recursive: true });
  await writeFile(json, `${JSON.stringify({ source: `videos/${slug}/dashboards/shared/data.js`, boards, figures }, null, 1)}\n`);
  console.log(`    ${Object.keys(figures).length} figures -> ${path.relative(ROOT, json)}`);

  console.log('\n  4. article');
  const mdx = path.join(ROOT, 'src/content/articles', `${slug}.mdx`);
  if (!existsSync(mdx)) throw new Error(`Write the frontmatter of ${path.relative(ROOT, mdx)} first; this step keeps it and rebuilds the body.`);
  const front = (await readFile(mdx, 'utf8')).match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)[0];
  const paras = text.trim().split(/\r?\n\s*\r?\n/);
  const at = (needle) => {
    const i = paras.findIndex((p) => p.includes(needle));
    if (i < 0) throw new Error(`No paragraph holds "${needle}": the words changed; update ARTICLES in scripts/sync-article.mjs.`);
    return i;
  };
  const after = new Map();
  const add = (i, s) => after.set(i, [...(after.get(i) ?? []), s]);
  for (const [needle, key] of cfg.quotes ?? []) {
    if (!figures[key]) throw new Error(`No figure ${key} in data.js for the quote after "${needle}".`);
    add(at(needle), `<Quote collection="${slug}" figure="${key}" />`);
  }
  for (const [, web, needle] of cfg.boards) {
    const embed = `<DashboardEmbed collection="${slug}" slug="${web}" />`;
    if (needle) add(at(needle), embed);
    else if (!paras.includes(embed)) throw new Error(`The words no longer place ${web}: expected a line "${embed}".`);
  }
  const drop = cfg.breakdown ? at(cfg.breakdown) : cfg.drop ? at(cfg.drop) : -1;
  const body = [
    ...paras.flatMap((p, i) => i === drop ? [] : [p, ...(after.get(i) ?? [])]),
    ...(cfg.breakdown ? ['## The Full Breakdown', `<Breakdown collection="${slug}" />`] : []),
  ];
  const imports = [
    ...(cfg.breakdown ? ["import Breakdown from '../../components/Breakdown.astro';"] : []),
    ...(cfg.quotes?.length ? ["import Quote from '../../components/Quote.astro';"] : []),
  ];
  await writeFile(mdx, `${front}\n${imports.join('\n')}\n\n${body.join('\n\n')}\n`);
  console.log(`    ${paras.length} paragraphs, ${cfg.boards.length} boards -> ${path.relative(ROOT, mdx)}`);

  /* The browser tab and search result of "Open full screen" read the board's own <title>, which is written for the edit
     ("Boardroom Wire — The capex column (meta-muse-wonder 32, W3)", "Scenario board"). Each shipped board takes its public
     title from the manifest instead, alone: no dash, no slug, no codes. */
  console.log('\n  4b. board titles');
  const { findCollection } = await import(pathToFileURL(path.join(ROOT, 'src/data/analytics.ts')).href);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const d of findCollection(slug)?.dashboards ?? []) {
    const p = path.join(pub, d.file);
    const html = await readFile(p, 'utf8');
    const out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(d.title)}</title>`);
    if (out !== html) await writeFile(p, out);
    console.log(`    ${d.file.padEnd(32)} ${d.title}`);
  }

  step('5. posters', ['scripts/render-posters.mjs', '--only', slug]);
  console.log('\n  Done. Next: npm run build, then check /wire/' + slug + '/ in a browser.\n');
}

main().catch((err) => {
  console.error(`\n  ${err.message}\n`);
  process.exit(1);
});
