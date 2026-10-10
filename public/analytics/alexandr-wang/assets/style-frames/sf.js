/* Style-frame helpers: SVG marks, linear scales, hatch, and the one credit line rendered from the keys a frame uses. */
const NS = 'http://www.w3.org/2000/svg';
function el(p, tag, a = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, a[k]);
  if (text != null) e.textContent = text;
  p.appendChild(e); return e;
}
const lin = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
const F = (k) => { if (!FIG[k]) throw new Error('no figure ' + k); return FIG[k]; };

/* printing: the ledger carries raw values and units (sf-figures.js); scale and precision are set here, per use */
const fmt = {
  usdB: (v, dp = 1) => '$' + (v / 1e9).toFixed(dp) + 'B',
  usdM: (v) => '$' + Math.round(v / 1e6) + 'M',
  usd: (v) => '$' + v.toFixed(2),
  int: (v) => Math.round(v).toLocaleString('en-US'),
  fix: (v, dp) => v.toFixed(dp),
  pct: (v, dp = 0, sign = false) => (sign && v > 0 ? '+' : '') + v.toFixed(dp) + '%',
  mil: (v, dp = 1) => (v / 1e6).toFixed(dp) + 'M',
  kilo: (v, dp = 1) => (v / 1e3).toFixed(dp) + 'K',
  day: (iso) => +iso.slice(8, 10) + ' ' + 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[+iso.slice(5, 7) - 1],
  doy: (iso) => Math.round((new Date(iso + 'T12:00:00Z') - new Date(iso.slice(0, 4) + '-01-01T12:00:00Z')) / 864e5)
};

/* hatch patterns: projected or not yet booked (house §3.4) */
function defs(svg) {
  const d = el(svg, 'defs');
  const mk = (id, col, w, gap) => {
    const p = el(d, 'pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    el(p, 'rect', { width: w, height: gap, fill: col });
  };
  mk('hatch', 'rgba(245,241,229,.34)', 2, 12);
  mk('hatchGold', '#D4AF37', 3, 11);
  mk('hatchDim', 'rgba(245,241,229,.16)', 2, 12);
  return d;
}

/* the credit: one plain line, built from the tiers of the keys on screen */
function credit(keys, lead, calc) {
  const by = { P: [], R: [], E: [], C: [] };
  keys.forEach(k => { const f = F(k); if (f.t === 'C') by.C.push(k); else if (f.cr && by[f.t] && !by[f.t].includes(f.cr)) by[f.t].push(f.cr); });
  const parts = [];
  if (lead) parts.push(lead);
  if (by.P.length) parts.push('Source: ' + by.P.join('; ') + '.');
  if (by.R.length) parts.push('Reported by ' + by.R.join(' and ') + '.');
  if (by.E.length) parts.push('Estimates: ' + by.E.join('; ') + '.');
  if (by.C.length || calc) parts.push('Boardroom Wire calculation.');
  document.getElementById('credit').textContent = parts.join(' ');
}
