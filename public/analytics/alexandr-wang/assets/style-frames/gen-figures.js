// node gen-figures.js -> regenerates sf-figures.js from 02-research/ledger.json: value, unit, tier, as_of and source_name are
// copied verbatim; only the credit name (cr) and on-screen names (label) are added here. Fails on a missing key.
const fs = require('fs');
const ROOT = require('path').resolve(__dirname, '../../..') + '/';      // videos/alexandr-wang/
const L = JSON.parse(fs.readFileSync(ROOT + '02-research/ledger.json', 'utf8'));
const idx = Object.fromEntries(L.map(r => [r.key, r]));
const ER = 'company earnings releases', AA25 = 'Artificial Analysis, 21 Apr 2025', AA26 = 'Artificial Analysis, 8 Apr 2026';
const Q2 = 'Meta Q2 2026 earnings release', NR = 'Meta newsroom';
const K = [
  ['H1: the capex race (cash purchases of property and equipment, calendar years)'],
  ['capex_amzn_2024', ER], ['capex_amzn_2025', ER], ['capex_googl_2024', ER], ['capex_googl_2025', ER],
  ['capex_msft_cy2024_calc', 'Microsoft converted to calendar years'], ['capex_msft_cy2025_calc', 'Microsoft converted to calendar years'],
  ['capex_meta_cash_2024', ER], ['capex_meta_cash_2025', ER],
  ['H1: the April 2025 edition of the index (names as Artificial Analysis spells them)'],
  ['aa_apr2025_o4_mini_high', AA25, 'o4-mini (high)'],
  ['aa_apr2025_gemini25pro', AA25, 'Gemini 2.5 Pro Preview'],
  ['aa_apr2025_deepseek_r1', AA25, 'DeepSeek R1'],
  ['aa_apr2025_claude37_sonnet_thinking', AA25, 'Claude 3.7 Sonnet (Extended Thinking)'],
  ['aa_apr2025_deepseek_v3_0324', AA25, 'DeepSeek V3 0324'],
  ['aa_apr2025_gpt41', AA25, 'GPT-4.1'],
  ['aa_apr2025_llama4_maverick', AA25, 'Llama 4 Maverick'],
  ['aa_apr2025_llama4_scout', AA25, 'Llama 4 Scout'],
  ['aa_gap_maverick_vs_frontier_apr2025', ''], ['aa_gap_maverick_vs_deepseek_v3_0324', ''],
  ['H2: the Scale deal'],
  ['scale_valuation_floor', 'Scale AI, 12 Jun 2025'], ['scale_deal_total_reported', 'Reuters'], ['scale_deal_stake_reported', 'Reuters'],
  ['meta_scale_booked_fy2025', 'Meta Form 10-K, FY2025'], ['google_cuts_scale', 'Reuters'],
  ['wang_scale_founded_year', 'Meta executive bio'],
  ['H4: the April 2026 edition of the index'],
  ['aa_llama4_scout_apr2026', AA26, 'Llama 4 Scout'], ['aa_llama4_maverick_apr2026', AA26, 'Llama 4 Maverick'],
  ['aa_muse_spark_apr2026', AA26, 'Muse Spark'],
  // the three ahead, in the article's own words (the row's note): order only, no scores
  ['aa_meta_is_back', AA26, ['Gemini 3.1 Pro Preview', 'GPT-5.4', 'Claude Opus 4.6']],
  ['ratio_spark_vs_maverick_apr2026', ''],
  ['llama4_release', 'Meta AI blog'], ['muse_spark_open_future', NR],
  ['H5: how Muse works'],
  ['muse_secure_vm', NR, 'Muse Secure VM'], ['muse_browser_forms', NR, 'browser'], ['muse_openclaw_reuters', 'Reuters'],
  ['H6 and H9: reach and price'],
  ['meta_dap_jun2026', Q2], ['muse_free_tier', NR, 'free tier'], ['grokbot_plans', 'SpaceXAI', 'paid plans only'],
  ['dots_plans', 'OpenAI', 'Pro and Business Premium'],
  ['H7: Number One (tracker estimates)'],
  ['muse_rank_0910', 'Sensor Tower via TechCrunch'], ['muse_ios_early', 'Sensor Tower via TechCrunch'],
  ['muse_top_ios_free', 'Sensor Tower via CNBC'], ['muse_downloads_5days', 'Sensor Tower via CNBC'],
  ['muse_downloads_0921', 'Sensor Tower via CNBC'], ['meta_stock_0921', 'The Next Web'], ['meta_stock_0921_pct', ''],
  ['H8: the face of it'],
  ['wang_muse_posts_5days', 'Business Insider'], ['wang_muse_posts', 'Business Insider'], ['wang_x_followers', 'X, 4 Oct 2026'],
  ['H9: three agents'],
  ['grokbot_launch', 'SpaceXAI'], ['muse_launch', NR], ['dots_launch', 'OpenAI'],
  ['gap_grokbot_to_muse_days', ''], ['gap_muse_to_dots_days', ''], ['grokbot_weekly_users', ''],   /* Goldman, 10 Oct: read at AI Weekly citing Bloomberg; gen-data credits 'Bloomberg via AI Weekly' */
  ['H11: the bill'],
  ['meta_capex_guide_2026_jul_low', Q2], ['meta_capex_guide_2026_jul_high', Q2], ['meta_expense_guide_2026_jul', Q2],
  ['meta_capex_2024', 'Meta Q4 2024 earnings release'], ['meta_capex_2025', 'Meta Form 10-K, FY2025'],
  ['meta_revenue_q2_2026', Q2], ['meta_ocf_q2_2026', Q2], ['meta_capex_q2_2026', Q2], ['meta_fcf_q2_2026', Q2],
  ['meta_close_0918', 'Yahoo Finance'],
  ['meta_rev_consensus_fy2026', 'S&P Global Market Intelligence via StockAnalysis, 8 Oct 2026', 'S&P Global']
];
// rows a frame draws only when the ledger has them (until then the frame draws an empty dashed slot)
const OPTIONAL = [];
const q = (x) => JSON.stringify(x);
let out = `/* Style frames, alexandr-wang: every figure a frame draws, by its ledger key. GENERATED from 02-research\\ledger.json
   (${L.length} rows, read ${new Date().toISOString().slice(0, 10)}); do not edit by hand: node gen-figures.js.
   v, u, t, asOf, on and src are the ledger's value, unit, tier, as_of, date and source_name, verbatim: scaling and printing happen
   in the frames (sf.js fmt). Added here only: cr, the credit name; label, an on-screen name. At build these come from
   shared\\data.js under the same keys. */
const FIG = {\n`;
for (const [k, cr, label] of K) {
  if (cr === undefined) { out += `  // ${k}\n`; continue; }
  const r = idx[k]; if (!r) throw new Error('not in ledger: ' + k);
  const f = { v: r.value, u: r.unit, t: r.tier, asOf: r.as_of, on: r.date, src: r.source_name, cr };
  if (label !== undefined) f.label = label;
  if (r.value_high !== undefined) f.vh = r.value_high;          // a range: the ledger's own high end
  if (r.change_pct !== undefined) f.chg = r.change_pct;        // a price row: the ledger's own day change, percent
  out += `  ${k}: ${q(f)},\n`;
}
for (const [k, cr] of OPTIONAL) {
  const r = idx[k]; if (!r) { out += `  // ${k}: not in the ledger yet\n`; continue; }
  const f = { v: r.value, u: r.unit, t: r.tier, asOf: r.as_of, src: r.source_name, cr: cr || r.source_name };
  if (r.value_high !== undefined) f.vh = r.value_high;
  out += `  ${k}: ${q(f)},\n`;
}
out += '};\n';
fs.writeFileSync(ROOT + 'dashboards/assets/style-frames/sf-figures.js', out);
console.log('wrote', K.filter(x => x[1] !== undefined).length, 'keys');
