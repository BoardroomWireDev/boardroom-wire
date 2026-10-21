/* tesla-spacex · boards 08 and 09, one canvas (Ive, 18 Oct 2026). The two companies as one ledger read back to back, then
   folded into one, then the value pulled back to the truth and set among the world's most valuable companies. Drawn once here;
   08-each-on-its-own.html plays the ledger (board seconds 0 to the fold) and 09-one-balance-sheet.html plays from the fold on
   (HERO.run({from, to})), so neither cue holds past 90 s and 09 opens on 08's last frame (a matched cut).
   As read (19 Oct, master v10): each page's ?at= lists exactly its own cue's steps (dashboard_cue_sheet.md), from its own first
   frame; 09's are shifted to board time by SPLIT (where 09 starts, 47.93 s into 08). Every other beat follows its step by the
   offset of its word in the recording (cue-map/vo-words.json), so a re-time carries it along.
   The step-by-step note is in each page's header. Load after sf.js and hero.js; the page sets BS_CUE first. */
const H = HERO, s = document.getElementById('s'); el(s, 'defs');
const CUE = (typeof BS_CUE !== 'undefined') ? BS_CUE : 'all';           // 'ledger' (page 08), 'fold' (page 09)
const SPLIT = 48.08;                                                    // 09's first frame in board time ("If you put them together")
/* step times from the corrected word starts (vo-words.json s, 19 Oct) */
const P08 = [['two', 0], ['tesla', 3.24], ['thin', 7.93], ['paper', 14.53], ['spacex', 20.02], ['growth', 26.38], ['burn', 31.59], ['cash', 41.74]];
const P09 = [['merge', 0], ['sums', 1.23], ['rank', 11.87], ['premium', 15.51], ['bets', 27.76], ['markets', 34.22], ['frontier', 41.24]];
const P09b = P09.map(([n, t]) => [n, SPLIT + t]);
const K = CUE === 'fold' ? H.steps(P09b, SPLIT + 49.3, SPLIT) : H.steps(P08, 47.9);
H.derive((CUE === 'fold' ? P08 : P09b).filter(([n]) => K[n] === undefined));
H.derive([['own', K.two + 2.04], ['trev', K.tesla + 1.69], ['tq2', K.thin + .4], ['top', K.thin + 3.98], ['loupe', K.thin + 5.04],
  ['earned', K.paper + .72], ['sshares', K.paper + 3.58], ['srev', K.spacex + 3.38], ['sq2', K.growth], ['grow92', K.growth + 2.0],
  ['sop', K.burn + .79], ['scapex', K.burn + 4.29], ['ai', K.burn + 7.27], ['tcash', K.cash], ['scash', K.cash + 1.36],
  ['fold', K.merge], ['crev', K.sums + 1.4], ['ccash', K.sums + 5.24], ['value', K.sums + 7.76], ['worth', K.sums + 8.58],
  ['ticks', K.premium + 3.48], ['thirty', K.premium + 4.86], ['sx', K.premium + 8.22], ['hundred', K.premium + 10.26],
  ['autonomy', K.markets + 3.98], ['space', K.markets + 5.34], ['aiM', K.markets + 5.76],
  ['orbit', K.frontier + 4.36], ['robots', K.frontier + 5.82]]);

const CR = 'var(--cream)', GOLD = 'var(--gold)', INK = 'var(--bg)', DIM = 'rgba(245,241,229,.55)', RED = 'var(--red)';
const B = 1e9;

/* ---------------- the figures ---------------- */
const PREK = ['tesla_q2_2026_income_before_taxes', 'tesla_q2_2026_pretax_income'].find(k => FIG[k]);
const T = { rev: usd('tesla_fy2025_revenue_total'), q2: usd('tesla_q2_2026_revenue_total'), op: usd('tesla_q2_2026_operating_income'),
  /* the stake gain is pre-tax, so it is drawn inside Tesla's Q2 pre-tax income, never inside after-tax net income (facts
     check v9, row 1). Goldman's row name is not final tonight: the first of these that data.js carries is used, else held. */
  pre: PREK ? usd(PREK) : (has('tesla_q2_2026_income_before_taxes'), null),
  capex: has('tesla_q2_2026_capex') ? usd('tesla_q2_2026_capex') : null,
  gain: usd('tesla_spacex_stake_gain_q2_2026'), cash: usd('tesla_q2_2026_cash_and_investments'), val: usd('tesla_market_cap_cover_shares_2026_10_16') };
const S = { rev: usd('spacex_fy2025_revenue_total'), q2: usd('spacex_q2_2026_revenue_total'), q2ago: usd('spacex_q2_2025_revenue_total'),
  yoy: pct('spacex_q2_2026_revenue_growth_yoy'), op: usd('spacex_q2_2026_op_income_total'), capex: usd('spacex_q2_2026_capex_total'),
  capexAI: usd('spacex_q2_2026_capex_ai'), cash: usd('spacex_cash_and_securities_jun30_2026'), val: usd('spacex_market_cap_2026_10_16') };
const C = { rev: usd('c_combined_fy2025_revenue'), cash: usd('c_combined_cash_2026_06_30'), val: usd('c_combined_mcap_2026_10_16'),
  x: has('c_combined_mcap_to_fy2025_revenue') ? U('c_combined_mcap_to_fy2025_revenue') : null,
  xs: has('c_spacex_mcap_to_fy2025_revenue') ? U('c_spacex_mcap_to_fy2025_revenue') : null };
for (const [k, v] of Object.entries({ ...T, ...S, ...C })) if (v !== null && !isFinite(v)) throw new Error('figure ' + k + ' is not a number in data.js');
calc = true;

/* ---------------- the ledger, back to back on one dollar scale ---------------- */
const SPL = 810, SPR = 1110, MID = 960, K0 = 7 / B;                     // the spine's edges; 7 px per $1B
const ROWS = { rev: 200, q2: 340, op: 480, capex: 620, cash: 760 }, BH = 56;
const NAMES = { rev: ['revenue', '2025'], q2: ['revenue', 'Q2 2026'], op: ['operating income', 'Q2 2026'], capex: ['capex', 'Q2 2026'], cash: ['cash', '30 Jun 2026'] };
/* combined layout: names left, bars from X0; the scale k(t) pulls back once, on "worth", to $0-$5.5T, so the value and the
   world's most valuable companies beside it fit one axis */
const X0 = 420, K2 = 1360 / 5.5e12, CY = { rev: 210, cash: 350, val: 520, sx: 700 }, AX = 840;
const kAt = (t) => H.mix(K0, K2, H.go(t, K.value - .1, K.value + 1.6));
const fold = (t) => H.go(t, K.fold, K.fold + 1.5);
const stepBack = (t) => 1 - H.go(t, K.fold, K.fold + .4);

/* the spine: row names centred, at a third of their ink from frame 0, full on "each company on its own" */
const gSpine = el(s, 'g');
Object.entries(NAMES).forEach(([r, [nm, per]]) => {
  el(gSpine, 'text', { x: MID, y: ROWS[r] + 30, class: 'nm', 'font-size': 32, 'text-anchor': 'middle' }, nm);
  el(gSpine, 'text', { x: MID, y: ROWS[r] + 66, class: 'ax', 'font-size': 28, 'text-anchor': 'middle' }, per);
});
const gMarks = el(s, 'g');
logo(gMarks, 'tesla', SPL - logoW('tesla', 30), 92, 30);
logo(gMarks, 'spacex', SPR, 92, 30);
H.on((t) => { const out = 1 - H.go(t, K.fold, K.fold + .5), u = (1 / 3 + 2 / 3 * H.go(t, K.own - .2, K.own + .5)) * out;
  gSpine.setAttribute('opacity', u.toFixed(3)); gMarks.setAttribute('opacity', out.toFixed(3)); });

/* a bar on the ledger: side -1 grows left from the spine (Tesla), +1 right (SpaceX); it grows on `a` */
function bar(p, side, row, v, a, fill = CR, d = .8) {
  const r = el(p, 'rect', { y: ROWS[row], height: BH, fill });
  const w = Math.abs(v) * K0;
  H.on((t) => { const g = H.go(t, a, a + d); const ww = w * g;
    r.setAttribute('x', (side < 0 ? SPL - ww : SPR).toFixed(2)); r.setAttribute('width', ww.toFixed(2)); r.style.display = g <= 0 ? 'none' : ''; });
  return r;
}
/* its figure: inside the bar at its outer end when it fits (ink), else just outside it (cream) */
function figure(p, side, row, v, txt, a, col = CR, size = 40) {
  const w = Math.abs(v) * K0, tw = txt.length * .6 * size, inside = w > tw + 40;
  const x = side < 0 ? (inside ? SPL - w + 18 : SPL - w - 16) : (inside ? SPR + w - 18 : SPR + w + 16);
  const anchor = (side < 0) === inside ? 'start' : 'end';
  const g = el(p, 'g'), n = el(g, 'text', { x, y: ROWS[row] + BH / 2 + size * .36, class: 'fn', 'font-size': size, 'text-anchor': anchor, style: 'fill:' + (inside ? INK : col) }, txt);
  H.rise(n, a);
  return g;
}

/* rows that cannot be added (Q2 revenue, operating income, capex) step back on the fold */
const gBack = el(s, 'g');
H.on((t) => { const u = stepBack(t); gBack.setAttribute('opacity', u.toFixed(3)); gBack.style.display = u < .002 ? 'none' : ''; });

/* ---- Tesla ---- */
const tRev = bar(s, -1, 'rev', T.rev, K.trev - .2, CR, 1.0);
const fTRev = figure(s, -1, 'rev', T.rev, D('tesla_fy2025_revenue_total', fmt.usdB(T.rev)), K.trev + .5);
bar(gBack, -1, 'q2', T.q2, K.tq2 - .2); figure(gBack, -1, 'q2', T.q2, D('tesla_q2_2026_revenue_total', fmt.usdB(T.q2)), K.tq2 + .4);
bar(gBack, -1, 'op', T.op, K.top - .1, CR, .3); figure(gBack, -1, 'op', T.op, D('tesla_q2_2026_operating_income', fmt.usdM(T.op)), K.top + .3);
/* Tesla's Q2 capex on the same row and scale as SpaceX's (proxy 1 facts: an empty Tesla side read as zero). Its 2026 plan stays
   off: that line was not read. It lands with SpaceX's capex. */
if (T.capex !== null) { bar(gBack, -1, 'capex', T.capex, K.scapex - .2); figure(gBack, -1, 'capex', T.capex, D('tesla_q2_2026_capex', fmt.usdB(T.capex)), K.scapex + .4); }
const tCash = bar(s, -1, 'cash', T.cash, K.tcash - .2, CR, .9);
const fTCash = figure(s, -1, 'cash', T.cash, D('tesla_q2_2026_cash_and_investments', fmt.usdB(T.cash)), K.tcash + .5);

/* the detail sheet: Tesla's thin profit, magnified with no axis (so no scale is implied), on the still-empty SpaceX side */
{ const PX = 1130, PY = 392, PW = 670, PH = 330, MAG = 330 / B, LX = PX + 40;
  const gL = el(s, 'g');
  const sx = SPL - Math.max(T.op * K0, 2), sy = ROWS.op;
  H.draw(el(gL, 'rect', { x: sx - 12, y: sy - 12, width: SPL - sx + 24, height: BH + 24, rx: 10, fill: 'none', stroke: CR, 'stroke-width': 2 }), K.loupe - .5, .35);
  H.draw(el(gL, 'path', { d: `M${SPL - 1},${sy + BH + 12} V${sy + BH + 46} H${PX}`, fill: 'none', stroke: CR, 'stroke-width': 2 }), K.loupe - .2, .35);
  const sh = el(gL, 'g');
  el(sh, 'rect', { x: PX, y: PY, width: PW, height: PH, fill: INK, stroke: 'rgba(245,241,229,.55)', 'stroke-width': 2 });
  corners(sh, PX, PY, PW, PH);
  const r1 = PY + 56, r2 = PY + 196;
  H.grow(el(sh, 'rect', { x: LX, y: r1, width: T.op * MAG, height: 48, fill: CR }), K.loupe + .1, .6, LX, 0, 'x');
  H.rise(el(sh, 'text', { x: LX + T.op * MAG + 16, y: r1 + 38, class: 'fn', 'font-size': 40 }, D('tesla_q2_2026_operating_income', fmt.usdM(T.op))), K.loupe + .5);
  /* "earned on paper": pre-tax income with the pre-tax stake gain inside it (about three quarters); held until the row lands */
  if (T.pre !== null) {
    const gP = el(sh, 'g');
    el(gP, 'text', { x: LX, y: r2 - 18, class: 'nd', 'font-size': 32 }, 'earned on paper');
    el(gP, 'text', { x: LX + 268, y: r2 - 18, class: 'ax', 'font-size': 28 }, 'pre-tax');
    H.rise(gP, K.earned - .7);
    const gN = el(sh, 'g');
    el(gN, 'rect', { x: LX, y: r2, width: T.gain * MAG - 3, height: 48, fill: CR });
    el(gN, 'rect', { x: LX + T.gain * MAG, y: r2, width: (T.pre - T.gain) * MAG, height: 48, fill: CR });
    H.grow(gN, K.earned - .5, .7, LX, 0, 'x');
    H.rise(el(sh, 'text', { x: LX + T.pre * MAG + 16, y: r2 + 38, class: 'fn', 'font-size': 36 }, D(PREK, fmt.usdM(T.pre))), K.earned);
    const gG = el(sh, 'g');
    el(gG, 'path', { d: `M${LX},${r2 + 60} v12 H${LX + T.gain * MAG - 3} v-12`, fill: 'none', stroke: GOLD, 'stroke-width': 2 });
    el(gG, 'text', { x: LX, y: r2 + 110, class: 'nm', 'font-size': 32, style: 'fill:var(--gold)' }, 'SpaceX shares');
    el(gG, 'text', { x: LX + 16, y: r2 + 36, class: 'fn', 'font-size': 32, style: 'fill:var(--bg)' }, D('tesla_spacex_stake_gain_q2_2026', fmt.usdM(T.gain)));
    H.rise(gG, K.sshares); }
  H.wipe(sh, K.loupe - .1, .35, 'y');
  H.show(gL, K.loupe - .5, .01, K.srev - 3.4, .4); }

/* ---- SpaceX ---- */
const sRev = bar(s, 1, 'rev', S.rev, K.srev - .2, CR, .7);
const fSRev = figure(s, 1, 'rev', S.rev, D('spacex_fy2025_revenue_total', fmt.usdB(S.rev)), K.srev + .4);
{ const y = ROWS.q2, w0 = S.q2ago * K0;      // a year earlier, in outline under the quarter
  H.grow(el(gBack, 'rect', { x: SPR, y: y + BH + 8, width: w0, height: 14, fill: 'rgba(245,241,229,.45)' }), K.grow92 - .6, .5, SPR, 0, 'x');
  H.rise(el(gBack, 'text', { x: SPR + w0 + 14, y: y + BH + 27, class: 'ax', 'font-size': 28 }, D('spacex_q2_2025_revenue_total', fmt.usdB(S.q2ago)) + '  Q2 2025'), K.grow92 - .2); }
bar(gBack, 1, 'q2', S.q2, K.sq2 - .2); figure(gBack, 1, 'q2', S.q2, D('spacex_q2_2026_revenue_total', fmt.usdB(S.q2)), K.sq2 + .4);
{ const n = el(gBack, 'text', { x: SPR + S.q2 * K0 + 260, y: ROWS.q2 + BH / 2 + 14, class: 'fn', 'font-size': 40 }, D('spacex_q2_2026_revenue_growth_yoy', '+' + fmt.pct(S.yoy, 1)));
  const g = el(gBack, 'g'); g.appendChild(n); ours(n, CR, 10, 2); H.rise(g, K.grow92); }
/* the operating loss: red, at its true size (a hairline at this scale), growing back toward the spine */
{ const w = Math.max(Math.abs(S.op) * K0, 2), r = el(gBack, 'rect', { x: SPR - w, y: ROWS.op, width: w, height: BH, fill: RED });
  H.fade(r, K.sop - .1, .3);
  H.rise(el(gBack, 'text', { x: SPR + 16, y: ROWS.op + BH / 2 + 14, class: 'fn', 'font-size': 40, style: 'fill:var(--red)' }, D('spacex_q2_2026_op_income_total', fmt.usdM(S.op))), K.sop + .3); }
{ const y = ROWS.capex, g = el(gBack, 'g');
  el(g, 'rect', { x: SPR, y, width: S.capexAI * K0 - 2, height: BH, fill: CR });
  el(g, 'rect', { x: SPR + S.capexAI * K0, y, width: (S.capex - S.capexAI) * K0, height: BH, fill: 'rgba(245,241,229,.45)' });
  H.grow(g, K.scapex - .2, .8, SPR, 0, 'x');
  H.rise(el(gBack, 'text', { x: SPR + S.capex * K0 + 16, y: y + BH / 2 + 14, class: 'fn', 'font-size': 40 }, D('spacex_q2_2026_capex_total', fmt.usdB(S.capex))), K.scapex + .5);
  const gA = el(gBack, 'g');
  el(gA, 'path', { d: `M${SPR},${y + BH + 8} v10 H${SPR + S.capexAI * K0 - 2} v-10`, fill: 'none', stroke: CR, 'stroke-width': 2 });
  el(gA, 'text', { x: SPR, y: y + BH + 50, class: 'nm', 'font-size': 32 }, 'AI');
  el(gA, 'text', { x: SPR + 52, y: y + BH + 50, class: 'fn', 'font-size': 32 }, D('spacex_q2_2026_capex_ai', fmt.usdB(S.capexAI)));
  H.rise(gA, K.ai); }
const sCash = bar(s, 1, 'cash', S.cash, K.scash - .2, CR, 1.0);
const fSCash = figure(s, 1, 'cash', S.cash, D('spacex_cash_and_securities_jun30_2026', fmt.usdB(S.cash)), K.scash + .5);

if (CUE !== 'ledger') {
/* ---------------- the fold: Tesla crosses the spine and docks end to end with SpaceX; the sum turns gold ---------------- */
/* each summable bar is redrawn by one function of t: before the fold it is the ledger bar above; after, a segment of the
   combined bar at scale k(t), from X0 */
const gToday = el(s, 'g'), gC = el(gToday, 'g'); let gTicks = null;
function docked(row, cyKey, from, v, ledgerRect, side) {
  const r = el(gC, 'rect', { height: BH, fill: CR }), gold = el(gC, 'rect', { height: BH, fill: GOLD });
  H.on((t) => { const m = fold(t);
    if (m <= 0) { r.style.display = gold.style.display = 'none'; ledgerRect.style.visibility = ''; return; }
    ledgerRect.style.visibility = 'hidden';
    const k = kAt(t), w0 = v * K0, xA = side < 0 ? SPL - w0 : SPR;
    const xC = X0 + from * k + (from ? 3 : 0), wC = Math.max(v * k - (from ? 3 : 0), 1.5);
    const x = H.mix(xA, xC, m), w = H.mix(w0, wC, m), y = H.mix(ROWS[row], CY[cyKey], m);
    [r, gold].forEach(n => { n.style.display = ''; n.setAttribute('x', x.toFixed(2)); n.setAttribute('width', w.toFixed(2)); n.setAttribute('y', y.toFixed(2)); });
    gold.setAttribute('opacity', H.go(t, K.fold + .9, K.fold + 1.7).toFixed(3)); });
}
docked('rev', 'rev', 0, T.rev, tRev, -1); docked('rev', 'rev', T.rev, S.rev, sRev, 1);
docked('cash', 'cash', 0, T.cash, tCash, -1); docked('cash', 'cash', T.cash, S.cash, sCash, 1);
[fTRev, fSRev, fTCash, fSCash].forEach(g => H.show(g, -1, .01, K.fold, .3));

/* the combined names, left */
const gNames = el(s, 'g'), gNamesToday = el(gToday, 'g');
[['rev', 'revenue', '2025'], ['cash', 'cash', '30 Jun 2026'], ['val', 'value', '16 Oct 2026']].forEach(([k, nm, per], i) => {
  const g = el(k === 'val' ? gNames : gNamesToday, 'g');
  el(g, 'text', { x: 64, y: CY[k] + 30, class: 'nm', 'font-size': 32 }, nm);
  el(g, 'text', { x: 64, y: CY[k] + 64, class: 'ax', 'font-size': 28 }, per);
  H.rise(g, k === 'val' ? K.value : K.fold + .9 + .2 * i);
});
/* the totals ride the bars' ends as the scale moves; ours, so underlined */
function total(cyKey, v, txt, a, size = 44) {
  const n = el(gC, 'text', { y: CY[cyKey] + BH / 2 + size * .36, class: 'fn', 'font-size': size, style: 'fill:var(--gold)' }, txt);
  const x0 = X0 + v * K0 + 20; n.setAttribute('x', x0.toFixed(2));
  const g = el(gC, 'g'); g.appendChild(n); const u = ours(n, GOLD, 10, 3);      // measured at the fold's scale, then rides with the text
  H.on((t) => { const x = X0 + v * kAt(t) + 20; n.setAttribute('x', x.toFixed(2)); u.setAttribute('transform', `translate(${(x - x0).toFixed(2)},0)`); });
  H.rise(g, a);
  return g;
}
total('rev', C.rev, D('c_combined_fy2025_revenue', fmt.usdB(C.rev)), K.crev);
total('cash', C.cash, D('c_combined_cash_2026_06_30', fmt.usdB(C.cash)), K.ccash);

/* ---------------- the value, at the pulled-back scale ---------------- */
{ const y = CY.val, VH = 72, wT = T.val * K2, wS = S.val * K2, g = el(s, 'g');
  const tT = el(g, 'rect', { x: X0, y, width: wT, height: VH, fill: GOLD });
  H.draw(el(g, 'line', { x1: X0 + wT, x2: X0 + wT, y1: y + VH, y2: y + VH + 44, stroke: CR, 'stroke-width': 2 }), K.value + 2.2, .3);
  const tS = el(g, 'rect', { x: X0 + wT, y, width: wS, height: VH, fill: GOLD });
  H.grow(tT, K.value + 1.0, .9, X0, 0, 'x'); H.grow(tS, K.value + 1.6, .9, X0 + wT, 0, 'x');
  // whose part is whose: the marks under the two segments
  H.rise(logo(g, 'tesla', X0, y + VH + 18, 22), K.value + 1.8);
  H.rise(logo(g, 'spacex', X0 + wT + 14, y + VH + 18, 22), K.value + 2.2);
  /* $3.38T rides the head of the growing bar (findings r1 row 18) and comes to rest at its end */
  const v = el(g, 'text', { x: X0 + wT + wS + 24, y: y + VH / 2 + 26, class: 'fh', 'font-size': 72 }, D('c_combined_mcap_2026_10_16', fmt.usdT(C.val)));
  const gx = el(g, 'g'), vg = el(gx, 'g'); vg.appendChild(v); ours(v, GOLD, 12, 3); H.rise(vg, K.worth);
  H.on((t) => { const head = wT * H.go(t, K.value + 1.0, K.value + 1.9) + wS * H.go(t, K.value + 1.6, K.value + 2.5);
    gx.setAttribute('transform', `translate(${(head - wT - wS).toFixed(2)},0)`); });
  // the premium, counted: the value ruled into lengths of the pair's 2025 revenue
  const unit = C.rev * K2, n = Math.floor(C.val / C.rev);
  const gT = el(g, 'g'); gTicks = gT;
  for (let i = 1; i <= n; i++) { const tk = el(gT, 'line', { x1: X0 + i * unit, x2: X0 + i * unit, y1: y, y2: y + VH, stroke: INK, 'stroke-width': 2 });
    H.show(tk, K.ticks + 1.2 * i / n, .1); }
  if (C.x !== null) { const mx = el(g, 'text', { x: X0 + wT + wS, y: y + VH + 56, class: 'fn', 'font-size': 48, 'text-anchor': 'end', style: 'fill:var(--gold)' }, D('c_combined_mcap_to_fy2025_revenue', fmt.mult(C.x)));
  const mg = el(g, 'g'); mg.appendChild(mx); ours(mx, GOLD, 10, 3); H.rise(mg, K.thirty); }
  /* one length = one year of the pair's revenue: extension lines carry the revenue bar's ends down onto the value bar */
  const ge = el(gToday, 'g', { stroke: DIM, 'stroke-width': 2, 'stroke-dasharray': '3 6' });
  [X0, X0 + unit].forEach(x => el(ge, 'line', { x1: x, x2: x, y1: CY.rev + BH + 6, y2: y - 4 }));
  H.wipe(ge, K.ticks - .3, .7, 'y');
  // the axis of the pulled-back scale, in trillions
  const ga = el(g, 'g'), ay = AX;
  el(ga, 'line', { x1: X0, x2: X0 + 5.5e12 * K2, y1: ay, y2: ay, stroke: DIM, 'stroke-width': 2 });
  for (let tr = 0; tr <= 5; tr++) { const x = X0 + tr * 1e12 * K2;
    el(ga, 'line', { x1: x, x2: x, y1: ay - 10, y2: ay, stroke: DIM, 'stroke-width': 2 });
    el(ga, 'text', { x, y: ay - 18, class: 'ax', 'font-size': 28, 'text-anchor': 'middle' }, tr ? '$' + tr + 'T' : '$0'); }
  H.fade(ga, K.value + .6, .6); }

/* ---------------- SpaceX alone: its value in lengths of its own 2025 revenue ---------------- */
{ const y = CY.sx, SH = 48, w = S.val * K2, g = el(s, 'g');
  H.rise(logo(g, 'spacex', 64, y + 12, 24), K.sx - .2);
  const r = el(g, 'rect', { x: X0, y, width: w, height: SH, fill: CR });
  H.grow(r, K.sx, .9, X0, 0, 'x');
  const unit = S.rev * K2, n = Math.floor(S.val / S.rev), gT = el(g, 'g');
  let d = ''; for (let i = 1; i <= n; i++) d += `M${(X0 + i * unit).toFixed(2)},${y}v${SH}`;
  const tk = el(gT, 'path', { d, stroke: INK, 'stroke-width': 2, fill: 'none' });
  H.wipe(tk, K.hundred - 1.4, 1.4, 'x', H.ease.lin);
  if (C.xs !== null) { const m = el(g, 'text', { x: X0 + w + 20, y: y + SH / 2 + 16, class: 'fn', 'font-size': 44 }, D('c_spacex_mcap_to_fy2025_revenue', fmt.mult(C.xs)));
  const mg = el(g, 'g'); mg.appendChild(m); ours(m, CR, 10, 2); H.rise(mg, K.hundred); } }


/* ---------------- the rank: the world's most valuable companies on the same axis ---------------- */
/* each peer a tick under the axis at its value, with its mark in its owner's colours; the pair a gold tick with its place below.
   A peer whose row is not in data.js yet is held (BW_HELD). */
{ const g = el(s, 'g');
  const PEERS = [['amazon', 'amazon_market_cap_2026_10_16'], ['microsoft', 'microsoft_market_cap_2026_10_16'], ['google', 'alphabet_market_cap_2026_10_16'],
    ['apple', 'apple_market_cap_2026_10_16'], ['nvidia', 'nvidia_market_cap_2026_10_16']]
    .filter(([, k]) => has(k)).map(([n, k]) => [n, usd(k)]).sort((a, b) => a[1] - b[1]);
  PEERS.forEach(([n, v], i) => { const x = X0 + v * K2, row = i % 2, h = n === 'nvidia' ? 44 : 28, gp = el(g, 'g');   // Nvidia's file carries whitespace
    el(gp, 'line', { x1: x, x2: x, y1: AX, y2: AX + 18 + row * 46, stroke: DIM, 'stroke-width': 2 });
    logo(gp, n, x - logoW(n, h) / 2, AX + 22 + row * 46 - (n === 'nvidia' ? 8 : 0), h);
    H.rise(gp, K.rank + .3 + .15 * i, .5, 10); });
  const xc = X0 + C.val * K2, gc = el(g, 'g');
  el(gc, 'line', { x1: xc, x2: xc, y1: AX - 6, y2: AX + 56, stroke: GOLD, 'stroke-width': 3 });
  if (has('c_combined_mcap_rank_2026_10_16')) {
    const r = U('c_combined_mcap_rank_2026_10_16'), sfx = (r % 100 >= 11 && r % 100 <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][r % 10] || 'th');
    const o = el(gc, 'text', { x: xc, y: AX + 98, class: 'fn', 'font-size': 40, 'text-anchor': 'middle', style: 'fill:var(--gold)' }, D('c_combined_mcap_rank_2026_10_16', r + sfx));
    ours(o, GOLD, 8, 2); }
  H.rise(gc, K.rank, .5, 10); }

/* ---------------- the bets: today's business steps out; the markets and the frontier ---------------- */
H.on((t) => { const u = 1 - H.go(t, K.bets, K.bets + .8);
  gToday.setAttribute('opacity', u.toFixed(3)); gToday.style.display = u < .002 ? 'none' : '';
  if (gTicks) gTicks.setAttribute('opacity', u.toFixed(3)); });
/* the markets and the frontier are footage, not words (proxy 1 visual, EF 16: the tiles restated the spoken line). The window
   frames stand where the tiles were, at the cue sheet's overlay times: o42, three windows from 30.3 s for 11 s (a robotaxi, a launch,
   an AI data hall); o43, two windows from 41.5 s for 5 s (orbital compute, Optimus). Davinci composites the footage into them. */
['a robotaxi on the road (Tesla footage)', 'a Starship or Falcon launch (SpaceX footage)', 'a SpaceX AI data hall'].forEach((sub, i) =>
  H.slot(s, 't09-markets-' + 'abc'[i], 420 + i * 467, 196, 426, 240, K.bets + 2.54, K.bets + 13.54, sub));
['SpaceX orbital compute satellite (SpaceX imagery)', 'Optimus at work (Tesla footage)'].forEach((sub, i) =>
  H.slot(s, 't09-frontier-' + 'ab'[i], 653 + i * 467, 196, 426, 240, K.frontier + .26, K.frontier + 5.26, sub));
}

/* the cut falls on the complete ledger: the step-back starts exactly on "If you put them together" */
/* receipt cards and footage windows ride over the board (Davinci's layer, bw overlay): the board publishes each one's area and keeps
   it clear while it is up (#bw-slots). Every time hangs off the step it proves (PICTURE-MAP overlays, 19 Oct), so a re-time carries
   it, and each leaves as the next step lands. A window's id is its overlay's (spec/windows.json keys its slot by it). */
if (CUE === 'ledger') {        /* page 08: Tesla's column grows leftward from x 810, SpaceX's rightward from 1110; rows at y 200-815 */
  H.slot(s, 'o64', 146, 320, 640, 360, K.tesla, K.tesla + 3.5, "cars leaving the factory (REQ-007 row 2); Tesla's column, under its 2025 bar, before Q2 lands");
  /* a receipt the voice reads line by line gets the board's width (proxy 3: o37 and o41 read at ~13 px in their column-sized areas):
     while it is up the board steps back under a scrim, all but the row being spoken about, and the card rides over the dimmed rows.
     Each area lets the card grow to 1.5x (o37 needs ~1.24x and o41 ~1.44x for ~26 px text). */
  const scrim = (id, a, b, row) => {
    const m = el(s.querySelector('defs'), 'mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 1920, height: 1080 });
    el(m, 'rect', { x: 0, y: 0, width: 1920, height: 1080, fill: 'white' });
    el(m, 'rect', { x: 0, y: ROWS[row] - 14, width: 1920, height: BH + 36, fill: 'black' });      // the spoken row and its name stay lit
    const r = el(s, 'rect', { x: 0, y: 0, width: 1920, height: 1004, mask: `url(#${id})`, style: 'fill:var(--bg)' });
    H.on((t) => { const u = H.go(t, a - .3, a + .2) * (1 - H.go(t, b - .2, b + .3)); r.setAttribute('opacity', (.62 * u).toFixed(3)); r.style.display = u < .002 ? 'none' : ''; });
  };
  scrim('m-o37', K.thin + 2.93, K.paper, 'op');
  H.card('o37', K.thin + 2.93, K.paper, { x: 64, y: 584, w: 1792, h: 410 }, "Tesla's Q2 10-Q, income from operations (REQ-006 row 14); full width under the operating-income row, the rest of the board dimmed");
  H.card('o39', K.growth, K.growth + 4.0, { x: 1110, y: 440, w: 750, h: 500 }, "SpaceX's Q2 release, revenue and growth (REQ-006 row 10); SpaceX's column, under the revenue rows");
  H.slot(s, 'o40', 1430, 430, 430, 242, K.burn + 1.43, K.burn + 5.43, "SpaceX AI's Memphis hall (REVIEW-015); right of the loss and the capex");
  scrim('m-o41', K.cash, K.cash + 3.5, 'cash');
  H.card('o41', K.cash, K.cash + 3.5, { x: 64, y: 300, w: 1792, h: 430 }, "SpaceX's Q2 balance sheet, cash (REVIEW-006 row 12); full width over the dimmed rows, right above the cash row");
}
/* page 09 at the rank step: the market-value ranking (REVIEW-010, the top five) in the empty top right, above the value bar and clear
   of the axis it proves */
if (CUE === 'fold') H.card('o65', K.rank, K.rank + 3.6, { x: 700, y: 36, w: 1160, h: 470 }, 'CompaniesMarketCap, ranks 1 to 5 (REVIEW-010)');
if (CUE === 'ledger') H.run({ to: Math.min(H.END, K.fold) });
else if (CUE === 'fold') H.run({ from: SPLIT });
else H.run();
