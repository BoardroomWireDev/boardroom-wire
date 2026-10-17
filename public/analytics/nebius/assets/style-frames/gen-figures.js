// node gen-figures.js > sf-figures.js   regenerates the figure table (and the NBIS series) from 02-research.
// Ledger rows: value, unit, tier, as_of and source_name are copied verbatim; only the credit name (cr) is added here.
// A date row carries its date in as_of (value null). A range row carries its ends in its own quote or note: `range` names the
// regex that reads them, so the ends are the ledger's words, not typed here. Fails on a missing key or an unreadable range.
// OWED rows: keys still missing from the ledger, with the figure the script gives, marked owed:true until the row lands.
const fs = require('fs');
const ROOT = require('path').resolve(__dirname, '../../..') + '/';      // videos/nebius/
const L = JSON.parse(fs.readFileSync(ROOT + '02-research/ledger.json', 'utf8'));
const idx = Object.fromEntries(L.map(r => [r.key, r]));
const { K, RANGE } = require('./figure-keys.js');
const OWED = [];   // every key the frames use has landed (13 Oct 2026)
const q = (x) => JSON.stringify(x);
let out = `/* Style frames, nebius: every figure a frame draws, by its ledger key. GENERATED from 02-research\\ledger.json
   (${L.length} rows) and 02-research\\series\\nbis-daily-close.csv, read ${new Date().toISOString().slice(0, 10)}; do not edit by hand:
   node gen-figures.js > sf-figures.js. v, u, t, asOf, on and src are the ledger's value, unit, tier, as_of, date and source_name,
   verbatim; lo and hi are a range row's ends, read from its own note or quote. At build these come from shared\\data.js. */
const FIG = {\n`;
for (const [k, cr, range] of K) {
  if (cr === undefined) { out += `  // ${k}\n`; continue; }
  const r = idx[k]; if (!r) throw new Error('not in ledger: ' + k);
  const f = { v: r.value, u: r.unit, t: r.tier, asOf: r.as_of, on: r.date, src: r.source_name, cr };
  if (range) { const lh = RANGE[range](r); if (!lh) throw new Error('no range in ' + k); [f.lo, f.hi] = lh; }
  out += `  ${k}: ${q(f)},\n`;
}
for (const [k, v, u, t, cr, extra] of OWED) {
  if (idx[k]) throw new Error('landed in the ledger, move to K: ' + k);
  out += `  ${k}: ${q({ v, u, t, cr, owed: true, ...(extra || {}) })},\n`;
}
out += '};\n';
const rows = fs.readFileSync(ROOT + '02-research/series/nbis-daily-close.csv', 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split(','));
out += `/* NBIS daily closes, ${rows.length} rows, ${rows[0][0]} to ${rows[rows.length - 1][0]} (nebius_share_price_daily_from_relisting) */\n`;
out += 'const NBIS = [' + rows.map(([d, c]) => `['${d}',${+c}]`).join(',') + '];\n';
process.stdout.write(out);
