/* ============================================================================================================================
   THE PRINT: the board kit for the earnings format (Ive, 24 Oct 2026; strategy\proposals\2026-10-24-earnings-season-sprint.md)

   Eight boards, built once, filled per video from its dashboards\shared\data.js by key. A board page is a few lines:

       <script src="assets/print/print.js"></script>
       <script>PRINT.trend({ bars: ['meta_fcf_q3_24', …], steps: [['axis', 0.6], ['bars', 1.4], ['last', 6.0]], secs: 12 });</script>

   The kit pages in the template (print-*.html) are the worked examples; a video copies one to dashboards\NN-<slug>.html and
   changes only the spec. Nothing is typed: every figure, every period and every line-item name on screen is read from data.js
   (`display`, `label`, `name`, and `v` with its `unit`); the credit is rendered from the keys the board reads (BW.provenance).
   A key missing from data.js stops the board with the list of missing keys written on the frame (and in data-error for bw audit).

   data.js, per figure (Davinci writes it; the Print's convention):
     v        the value as filed. unit 'USD' (or none) = dollars; '$M' / '$B' = millions / billions; '%' = a percentage
     display  the voice's form, used where the board shows the figure at hero size ('−$2.1B')
     label    the period or case: 'Q3 2026', 'FY 2026', 'Bear'          name  the line item: 'Free cash flow', 'Advertising'
     tier, src, asOf as everywhere (the credit line is built from them)
   Chart labels print the figure at full precision in millions, as filed ('15,522', '−2,120'), with '$M' on the axis: the voice
   may round, the screen does not (HOUSE-STYLE §6.5). The hero figure prints `display`.

   One clock (the Nebius HERO runtime, generalised): the board builds its whole drawing once and registers how each part enters
   as a pure function of board time t. steps: [[name, seconds], …] land on the voice's words; ?at=a,b,c re-times them in
   order and ?secs= sets the length (Davinci, from the VO). ?t=<secs|step>, ?capture, ?still, ?final and ?beats all draw the
   same frame for the same t.

   Motion (EDITING-FRAMEWORK 12-15): a mark lands, a line draws, type rises; quantitative marks grow from their own baseline and
   never pass their value; nothing glows, floats or drifts. Gold is the subject, red is loss and only loss, grey is the past,
   hatching is a projection or an estimate (HOUSE-STYLE §3). Every frame from 0 is drawn (no bare-ink head, rule 17).
   Web: every mark carries a <title> (the figure at full precision, its period, tier and source), so the same page is the
   article's interactive board.
   ============================================================================================================================ */
const PRINT = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const Q = new URLSearchParams(location.search);
  const W = 1920, H = 1080;
  const C = { gold: 'var(--gold)', red: 'var(--red)', cream: 'var(--cream)', dim: 'rgba(245,241,229,.5)', ghost: 'rgba(245,241,229,.28)',
    grid: 'rgba(245,241,229,.07)', zero: 'rgba(245,241,229,.6)', bg: 'var(--bg)', hair: 'rgba(245,241,229,.38)' };
  const MINUS = '−', DASH = '–';

  /* ---------- drawing ---------- */
  function el(p, tag, a = {}, text) {
    const e = document.createElementNS(NS, tag);
    for (const k in a) if (a[k] !== undefined && a[k] !== null) e.setAttribute(k, a[k]);
    if (text != null) e.textContent = text;
    p.appendChild(e); return e;
  }
  const lin = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
  let SVG = null;
  function svg() {
    SVG = document.querySelector('svg.print');
    if (!SVG) { SVG = el(document.querySelector('.stage'), 'svg', { class: 'print', viewBox: `0 0 ${W} ${H}` }); document.querySelector('.stage').prepend(SVG); }
    const d = el(SVG, 'defs');
    const hatch = (id, col, w, gap) => { const p = el(d, 'pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }); el(p, 'rect', { width: w, height: gap, fill: col }); };
    hatch('pk-hatch', 'rgba(245,241,229,.40)', 2, 11);
    hatch('pk-hatchDim', 'rgba(245,241,229,.18)', 2, 11);
    hatch('pk-hatchGold', '#D4AF37', 2.6, 10);                     // the gold token (--gold), as a pattern fill cannot take a var
    hatch('pk-hatchRed', '#FF5247', 2.6, 10);                      // the red token (--red)
    return SVG;
  }
  /* measured text width (fonts are loaded before a board builds) */
  function tw(node) { try { return node.getComputedTextLength(); } catch { return 0; } }
  function tip(node, text) { el(node, 'title', {}, text); return node; }

  /* ---------- figures ---------- */
  const used = new Set(), missing = [];
  const MULT = { USD: 1, '$': 1, '$K': 1e3, '$M': 1e6, '$B': 1e9, '$T': 1e12, 'USD millions': 1e6, 'USD billions': 1e9, 'USD thousands': 1e3 };
  const DATA = () => (typeof BW_DATA !== 'undefined' ? BW_DATA : { sources: {}, figures: {} });
  function F(k) {
    const f = DATA().figures[k];
    if (!f) { if (!missing.includes(k)) missing.push(k); return { v: NaN, label: '', name: '', display: '' }; }
    used.add(k); return f;
  }
  /* optional parts of a board (a comparison, a second series, an implied range) are drawn only when every key they need is
     in data.js; a part left out is listed in <html data-print-skipped> and the console, never silently invented */
  const skipped = [];
  function has(...ks) {
    const all = ks.flat(Infinity).filter(Boolean), miss = all.filter(k => !DATA().figures[k]);
    if (miss.length) { skipped.push(...miss); console.warn('The Print: left out (not in data.js): ' + miss.join(', ')); }
    return all.length > 0 && !miss.length;
  }
  /* a list a board takes may be named: 'fcf_quarters' reads BW_DATA.fcf_quarters (Davinci keeps the order there) */
  const list = (x) => typeof x === 'string' ? (DATA()[x] || []) : (x || []);
  const mult = (f) => MULT[f.unit] ?? 1;
  /* the value in the board's base: dollars for money, the number itself for a percent or a count */
  function V(k) { const f = F(k); return +f.v * mult(f); }
  const sgn = (v, plus = false) => v < 0 ? MINUS : (plus && v > 0 ? '+' : '');
  const grp = (x, dp = 0) => Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  /* full precision in millions, as filed: 15,522 · −2,120 */
  const full = (k, dp = 0, plus = false) => { const v = V(k) / 1e6; return sgn(v, plus) + grp(v, dp); };
  const fullUSD = (k) => { const v = V(k) / 1e6; return sgn(v) + '$' + grp(v) + 'M'; };
  const disp = (k) => { const f = F(k); return String(f.display || full(k)).replace(/^-/, MINUS).replace(/^\+?\$?-/, MINUS); };
  /* a figure's words: `name` (the line item) and `label` (the period) when data.js keeps them apart; a single label such as
     'free cash flow, Q3 2026' splits at its last comma. Q3'24 prints as Q3 2024. Sentence case on screen. */
  const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
  const per = (s) => String(s || '').replace(/^(Q\d|H\d)\s*'(\d{2})$/, (m, a, b) => a + ' 20' + b);
  function parts(k) {
    const f = F(k); if (f.name) return [f.name, f.label || ''];
    const l = f.label || '', i = l.lastIndexOf(', ');
    if (i > 0) return [l.slice(0, i), l.slice(i + 2)];
    return /^(Q\d|H\d|FY|\d{4}$)/.test(l) ? ['', l] : [l, ''];
  }
  const name = (k) => cap(parts(k)[0]);
  const label = (k) => per(parts(k)[1]);
  const isDate = (s) => /\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(s || '');
  /* a range: one key holding lo and hi (with its own display), or {lo, hi} keys */
  function range(r) {
    if (typeof r === 'string') { const f = F(r), m = mult(f); return { lo: +f.lo * m, hi: +f.hi * m, text: String(f.display || '').replace(/^-/, MINUS), key: r, keys: [r] }; }
    return { lo: V(r.lo), hi: V(r.hi), text: `${disp(r.lo)}${DASH}${disp(r.hi)}`, key: r.lo, keys: [r.lo, r.hi] };
  }
  const people = (w) => (DATA().names && DATA().names[w]) || w || '';
  function srcName(k) { const f = F(k), s = DATA().sources[Array.isArray(f.src) ? f.src[0] : f.src] || {}; return s.name || ''; }
  const tipText = (k) => [name(k), label(k)].filter(Boolean).join(', ') + ': ' + (/^(%|percent)$/.test(F(k).unit) ? F(k).v + '%' : F(k).v == null ? (F(k).display || '') : fullUSD(k)) + ' (' + (F(k).tier || '') + (srcName(k) ? ', ' + srcName(k) : '') + ')';

  /* axis numbers: nice steps (1, 2, 2.5, 5 × 10^n) */
  function ticks(lo, hi, n = 5) {
    const span = Math.max(1e-9, hi - lo), raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), e = raw / mag;
    const step = (e >= 7.5 ? 10 : e >= 3.5 ? 5 : e >= 2.25 ? 2.5 : e >= 1.5 ? 2 : 1) * mag;
    const out = []; for (let v = Math.floor(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(+v.toPrecision(12));
    if (out[out.length - 1] < hi - 1e-9) out.push(+(out[out.length - 1] + step).toPrecision(12));
    return { step, out, lo: Math.min(out[0], lo), hi: Math.max(out[out.length - 1], hi) };
  }
  /* a domain that hugs the data (a little air above, and below zero only as far as the data goes), with the nice ticks
     that fall inside it: no empty -10,000 row under a -2,120 bar */
  function domain(lo, hi, n = 5) {
    const span = hi - lo, d0 = lo < 0 ? lo - span * .08 : lo, d1 = hi > 0 ? hi + span * .05 : hi;
    const T = ticks(lo, hi, n);
    return { lo: d0, hi: d1, out: T.out.filter(v => v >= d0 - 1e-9 && v <= d1 + 1e-9), step: T.step };
  }
  const tickM = (v) => sgn(v) + grp(v / 1e6);                              // in $M, as the chart labels
  const tickB = (v) => { if (v === 0) return '0'; const b = Math.abs(v / 1e9), dp = Number.isInteger(+b.toFixed(6)) ? 0 : (Number.isInteger(+(b * 10).toFixed(6)) ? 1 : 2); return sgn(v) + '$' + grp(b, dp) + 'B'; };

  /* ---------- the clock ---------- */
  const K = {}; let NAMES = [], END = 0;
  function steps(list, secs) {
    const AT = (Q.get('at') || '').split(',').filter(s => s.trim() !== '').map(Number);
    list.forEach(([n, t], i) => { K[n] = i < AT.length ? AT[i] : t; });
    NAMES = list.map(x => x[0]);
    END = +(Q.get('secs') || 0) || secs || (Math.max(...list.map(x => K[x[0]])) + 4);
    return K;
  }
  const clamp = (u) => u < 0 ? 0 : u > 1 ? 1 : u;
  const ease = { io: (u) => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, out: (u) => 1 - Math.pow(1 - u, 3), lin: (u) => u };
  const go = (t, a, b, e = ease.io) => t >= b ? e(1) : t <= a ? e(0) : e(clamp((t - a) / (b - a)));
  const mix = (a, b, u) => a + (b - a) * u;
  const R = []; const on = (fn) => { R.push(fn); return fn; };
  function wrap(n) { if (n.__w) return n.__w; const g = document.createElementNS(NS, 'g'); n.parentNode.insertBefore(g, n); g.appendChild(n); n.__w = g; return g; }
  function show(n, a, d = .45, to = 1, b = Infinity, d2 = .4, toB = 0) {
    on((t) => { const u = go(t, a, a + d, ease.out); const o = mix(u * to, toB, go(t, b, b + d2)); n.setAttribute('opacity', o.toFixed(3)); n.style.display = o < .002 ? 'none' : ''; });
    return n;
  }
  /* drawn from frame 0 at `base` of its ink, full from `a` (rule 17: a page never opens on bare ink); optional fade out at b */
  function half(n, a, d = .5, base = .35, b = Infinity, d2 = .4) {
    on((t) => { const o = mix(base, 1, go(t, a, a + d, ease.out)) * (1 - go(t, b, b + d2)); n.setAttribute('opacity', o.toFixed(3)); n.style.display = o < .002 ? 'none' : ''; });
    return n;
  }
  /* type and marks rise into place (no blur, no bounce) */
  function rise(n, a, d = .55, dy = 22) {
    const g = wrap(n);
    on((t) => { const u = go(t, a, a + d, ease.out); g.setAttribute('transform', `translate(0,${(dy * (1 - u)).toFixed(2)})`); g.setAttribute('opacity', u.toFixed(3)); g.style.display = u < .002 ? 'none' : ''; });
    return n;
  }
  /* a stroke draws along its length */
  function draw(n, a, d = .8, e = ease.io) {
    const nodes = n.tagName === 'g' ? [...n.querySelectorAll('path,line,polyline,rect,circle')] : [n];
    nodes.forEach(x => {
      const dash = x.getAttribute('stroke-dasharray');
      if (dash && dash !== 'none') { on((t) => { const u = go(t, a, a + d, e); x.setAttribute('opacity', u.toFixed(3)); x.style.display = u <= 0 ? 'none' : ''; }); return; }
      x.setAttribute('pathLength', 1);
      on((t) => { const u = go(t, a, a + d, e); x.setAttribute('stroke-dasharray', u >= 1 ? 'none' : `${u.toFixed(4)} 1`); x.style.display = u <= 0 ? 'none' : ''; });
    });
    return n;
  }
  /* a clipping wipe across the node's own box: 'x' left to right, '-x', 'y' top down, '-y' bottom up */
  let _c = 0;
  function wipe(n, a, d = .7, dir = 'x', e = ease.io, box) {
    const g = wrap(n), bb = box || n.getBBox(), pad = 30, id = 'pkw' + (++_c);
    const cp = el(SVG.querySelector('defs'), 'clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
    const r = el(cp, 'rect', { x: bb.x - pad, y: bb.y - pad, width: bb.width + 2 * pad, height: bb.height + 2 * pad });
    g.setAttribute('clip-path', `url(#${id})`);
    on((t) => { const u = go(t, a, a + d, e), w = bb.width + 2 * pad, h = bb.height + 2 * pad;
      if (dir === 'x') r.setAttribute('width', w * u);
      else if (dir === '-x') { r.setAttribute('x', bb.x - pad + w * (1 - u)); r.setAttribute('width', w * u); }
      else if (dir === 'y') r.setAttribute('height', h * u);
      else { r.setAttribute('y', bb.y - pad + h * (1 - u)); r.setAttribute('height', h * u); }
      g.style.display = u <= 0 ? 'none' : ''; });
    return n;
  }
  /* a quantitative mark grows from its own baseline (ox, oy) to its true size, never past it */
  function grow(n, a, d = .8, ox = 0, oy = 0, axis = 'y', e = ease.io) {
    const g = wrap(n);
    on((t) => { const u = go(t, a, a + d, e), sx = axis === 'y' ? 1 : u, sy = axis === 'x' ? 1 : u;
      g.setAttribute('transform', `translate(${ox},${oy}) scale(${Math.max(sx, 1e-4)},${Math.max(sy, 1e-4)}) translate(${-ox},${-oy})`);
      g.style.display = u <= 0 ? 'none' : ''; });
    return n;
  }

  /* ---------- run ---------- */
  let extraUses = [], footer = '';
  function fail(msg) {
    const d = document.createElement('div'); d.id = 'print-err'; d.textContent = msg; document.querySelector('.stage').appendChild(d);
    document.documentElement.dataset.error = msg.slice(0, 400);
  }
  function run() {
    if (missing.length) { fail('The Print: not in data.js yet: ' + missing.join(', ')); if (SVG) SVG.style.display = 'none'; }   // the error alone, never half a board
    if (skipped.length) document.documentElement.dataset.printSkipped = [...new Set(skipped)].join(' ');
    BW.provenance({ uses: [...used, ...extraUses], footer });
    const paint = (t) => { for (const f of R) f(t); };
    function play() { BW.chromeShow(); const tl = gsap.timeline(), p = { t: 0 }; NAMES.forEach(n => BW.mark(tl, n, K[n]));
      tl.to(p, { t: END, duration: END, ease: 'none', onUpdate: () => paint(p.t) }, 0); paint(0); return tl; }
    function rest() { BW.chromeShow(); paint(END); }
    BW.run({ play, rest });
  }
  /* every board builds once the fonts are in (text is measured), then hands its clock to BW.run */
  function board(build) {
    return (spec) => {
      const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]) : Promise.resolve();
      fonts.then(() => { svg(); try { build(spec || {}); } catch (e) { fail('The Print: ' + (e && e.message || e)); console.error(e); } run(); });
    };
  }
  /* wrap a line-item name to at most two lines of about `n` characters */
  function lines2(s, n = 18) {
    if (s.length <= n) return [s];
    const w = s.split(' '); let a = '';
    while (w.length && (a + ' ' + w[0]).trim().length <= n) a = (a + ' ' + w.shift()).trim();
    return [a, w.join(' ')];
  }
  function textLines(p, x, y, arr, attrs, lh) { const g = el(p, 'g'); arr.forEach((s, i) => el(g, 'text', { x, y: y + i * lh, ...attrs }, s)); return g; }

  /* ======================================================================================================================
     1  THE NUMBER  { key, compare?, delta?, steps: [['figure'],['then'],['move']], secs }
        The figure at hero size, its line item and period, its as-filed value to the million; then a ruler on one true scale:
        the comparison lands, and a line runs from it to this figure (across zero when it crosses).
     ====================================================================================================================== */
  const number = board((S) => {
    const s = SVG, k = steps(S.steps || [['figure', 0.8], ['then', 3.2], ['move', 4.6]], S.secs || 9);
    const v = V(S.key), col = v < 0 ? C.red : C.gold, X0 = 200;
    const hasR = !!S.compare && has(S.compare), YH = hasR ? 470 : 620;                // without a ruler the figure sits at the frame's centre
    const nmT = el(s, 'text', { x: X0, y: YH - 268, class: 'nd', 'font-size': 46 }, name(S.key));
    const lbT = el(s, 'text', { x: X0 + tw(nmT) + 40, y: YH - 268, class: 'ax', 'font-size': 46, style: 'fill:rgba(245,241,229,.62)' }, label(S.key));
    half(nmT, k.figure - .35, .45, .4); half(lbT, k.figure - .35, .45, .4);   // frame 0 is drawn, at a third
    const hero = el(s, 'text', { x: X0 - 14, y: YH, class: 'fh', 'font-size': 290, style: `fill:${col}` }, disp(S.key));
    tip(hero, tipText(S.key)); rise(hero, k.figure, .7, 40);
    rise(el(s, 'text', { x: X0, y: YH + 92, class: 'fn', 'font-size': 44, style: 'fill:rgba(245,241,229,.72)' }, fullUSD(S.key)), k.figure + .35);
    if (!hasR) return;
    const c = V(S.compare), lo = Math.min(0, v, c), hi = Math.max(0, v, c), pad = (hi - lo) * .08;
    const T = ticks(lo - pad, hi + pad, 6), d0 = Math.min(lo - pad, T.out.find(q => q >= lo - pad) ?? lo), d1 = hi + pad;
    const TT = T.out.filter(q => q >= d0 && q <= d1), x = lin(d0, d1, X0, 1720), Y = 790;
    const ax = el(s, 'g');
    el(ax, 'line', { x1: X0, x2: 1720, y1: Y, y2: Y, stroke: C.hair, 'stroke-width': 2 });
    TT.forEach(tv => {
      el(ax, 'line', { x1: x(tv), x2: x(tv), y1: Y - (tv === 0 ? 30 : 10), y2: Y + (tv === 0 ? 30 : 10), stroke: tv === 0 ? C.zero : C.hair, 'stroke-width': tv === 0 ? 3 : 2 });
      el(ax, 'text', { x: x(tv), y: Y + 66, class: 'ax', 'font-size': 32, 'text-anchor': 'middle' }, tickB(tv));
    });
    wipe(ax, k.then - .2, .8, 'x');
    /* the move: a line runs from the comparison to this figure on the same scale (drawn under the two marks) */
    const mv = el(s, 'line', { x1: x(c), x2: x(v), y1: Y, y2: Y, stroke: col, 'stroke-width': 8, 'stroke-linecap': 'round' });
    draw(mv, k.move, 1.3);
    const gC = el(s, 'g');
    tip(el(gC, 'circle', { cx: x(c), cy: Y, r: 11, fill: 'rgba(245,241,229,.7)' }), tipText(S.compare));
    el(gC, 'text', { x: x(c), y: Y - 74, class: 'nd', 'font-size': 34, 'text-anchor': 'middle' }, label(S.compare));
    el(gC, 'text', { x: x(c), y: Y - 30, class: 'fn', 'font-size': 36, 'text-anchor': 'middle', style: 'fill:rgba(245,241,229,.8)' }, full(S.compare, 0, true));
    rise(gC, k.then + .3);
    const gN = el(s, 'g');
    tip(el(gN, 'circle', { cx: x(v), cy: Y, r: 14, fill: col }), tipText(S.key));
    el(gN, 'text', { x: x(v), y: Y - 74, class: 'nd', 'font-size': 34, 'text-anchor': 'middle' }, label(S.key));
    el(gN, 'text', { x: x(v), y: Y - 30, class: 'fn', 'font-size': 36, 'text-anchor': 'middle', style: `fill:${col}` }, full(S.key, 0, true));
    rise(gN, k.move + 1.1);
    if (S.delta && has(S.delta)) {
      const yD = Y + 150, a =Math.min(x(c), x(v)), b = Math.max(x(c), x(v)), gD = el(s, 'g');
      [[a, a], [b, b]].forEach(([p]) => el(gD, 'line', { x1: p, x2: p, y1: yD - 14, y2: yD + 14, stroke: C.dim, 'stroke-width': 2 }));
      el(gD, 'line', { x1: a, x2: b, y1: yD, y2: yD, stroke: C.dim, 'stroke-width': 2 });
      const dt = el(gD, 'text', { x: (a + b) / 2, y: yD - 16, class: 'fn', 'font-size': 32, 'text-anchor': 'middle', style: 'fill:rgba(245,241,229,.75)' }, full(S.delta, 0, true));
      tip(dt, tipText(S.delta)); rise(gD, k.move + 1.6);
    }
  });

  /* ======================================================================================================================
     2  QUARTER TREND  { bars: [8-9 keys, oldest first], hero?: index (last), lines?: [{keys:[…], tone?:'cream'|'dim'}],
                         steps: [['axis'],['bars'],['last'],['lines']?], secs }
        Every quarter on one linear scale from a true zero, labelled at full precision in $M. The past is grey; the quarter is
        gold, or red if it is a loss. Optional lines (same scale) draw the two series the bars are the difference of.
     ====================================================================================================================== */
  const trend = board((S) => {
    S = Object.assign({}, S, { bars: list(S.bars) });
    if (!S.bars.length) throw new Error('no bars: BW_DATA has no list or keys for "' + S.bars + '"');
    const s = SVG, n = S.bars.length, hi = S.hero ?? n - 1;
    const L = (S.lines || []).map(l => Object.assign({}, l, { keys: list(l.keys) })).filter(l => has(l.keys));
    const k = steps(S.steps || [['axis', 0.4], ['bars', 1.2], ['last', 5.0], ...(L.length ? [['lines', 8.0]] : [])], S.secs || (L.length ? 14 : 10));
    const vals = S.bars.map(V), lv = L.map(l => l.keys.map(V));
    const all = [0, ...vals, ...lv.flat()], T = domain(Math.min(...all), Math.max(...all), 4);
    const X0 = 270, X1 = L.length ? 1500 : 1740, YT = 160, YB = 800;
    const y = lin(T.lo, T.hi, YB, YT), Z = y(0), band = (X1 - X0) / n, bw = Math.min(118, band * .58);
    const cx = (i) => X0 + band * (i + .5);
    /* the frame: grid, axis numbers, the unit, zero, the quarters (drawn from frame 0 at a third, full on 'axis') */
    const gA = el(s, 'g');
    T.out.forEach(tv => {
      el(gA, 'line', { x1: X0 - 20, x2: X1 + 10, y1: y(tv), y2: y(tv), stroke: tv === 0 ? C.zero : C.grid, 'stroke-width': tv === 0 ? 3 : 2 });
      el(gA, 'text', { x: X0 - 36, y: y(tv) + 11, class: 'ax', 'font-size': 32, 'text-anchor': 'end' }, tickM(tv));
    });
    el(gA, 'text', { x: X0 - 36, y: YT - 40, class: 'ax', 'font-size': 32, 'text-anchor': 'end' }, '$M');
    /* the quarters: 'Q3 2024' sets as Q3 over its year, the year printed where it changes (and on the first bar) */
    let lastYr = '';
    S.bars.forEach((key, i) => {
      const lb = label(key), m = lb.match(/^(Q\d|H\d|FY)\s*'?(\d{2,4})$/), st = i === hi ? 'fill:var(--cream)' : '';
      const yq = Math.max(YB, Z) + 66;
      if (!m) { el(gA, 'text', { x: cx(i), y: yq, class: 'ax', 'font-size': 32, 'text-anchor': 'middle', style: st }, lb); return; }
      el(gA, 'text', { x: cx(i), y: yq, class: 'ax', 'font-size': 32, 'text-anchor': 'middle', style: st }, m[1]);
      if (m[2] !== lastYr) el(gA, 'text', { x: cx(i), y: yq + 42, class: 'ax', 'font-size': 32, 'text-anchor': 'middle', style: st || 'fill:rgba(245,241,229,.38)' }, m[2]);
      lastYr = m[2];
    });
    half(gA, k.axis, .5, .35);
    /* the bars, oldest first; the hero quarter last, at its own word */
    const stag = Math.min(.42, Math.max(.18, (k.last - k.bars - .8) / Math.max(1, n - 1)));
    S.bars.forEach((key, i) => {
      const v = vals[i], top = Math.min(y(v), Z), h = Math.abs(y(v) - Z), isH = i === hi, col = isH ? (v < 0 ? C.red : C.gold) : C.ghost;
      const at = isH ? k.last : k.bars + stag * (i > hi ? i - 1 : i);
      const r = el(s, 'rect', { x: cx(i) - bw / 2, y: top, width: bw, height: Math.max(h, 2), fill: col });
      tip(r, tipText(key)); grow(r, at, .8, 0, Z, 'y');
      const fs = isH ? 52 : 32, yl = v >= 0 ? y(v) - 18 : y(v) + fs + 10;
      const t = el(s, 'text', { x: cx(i), y: yl, class: isH ? 'fh' : 'fn', 'font-size': fs, 'text-anchor': 'middle', style: isH ? `fill:${col}` : 'fill:rgba(245,241,229,.78)' }, full(key));
      rise(t, at + .5, .5, v >= 0 ? 16 : -16);
      /* once the lines draw, the past quarters' figures step back so the lines read; the quarter's stays */
      if (L.length && !isH) on((tt) => t.setAttribute('opacity', (1 - .62 * go(tt, k.lines, k.lines + .6)).toFixed(3)));
    });
    /* the lines the bars are the difference of: same scale, drawn left to right, named at their ends */
    L.forEach((l, j) => {
      const pts = l.keys.map((key, i) => [cx(i), y(lv[j][i])]), col = l.tone === 'dim' ? 'rgba(245,241,229,.55)' : C.cream;
      const p = el(s, 'polyline', { points: pts.map(q => q.map(z => z.toFixed(1)).join(',')).join(' '), fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linejoin': 'round', 'stroke-dasharray': l.dash ? '14 9' : null });
      if (l.dash) wipe(p, k.lines + j * .9, 1.6, 'x'); else draw(p, k.lines + j * .9, 1.6);
      const gP = el(s, 'g'); l.keys.forEach((key, i) => tip(el(gP, 'circle', { cx: pts[i][0], cy: pts[i][1], r: 6, fill: col }), tipText(key)));
      wipe(gP, k.lines + j * .9, 1.6, 'x');
      const last = l.keys[l.keys.length - 1], [ex, ey] = pts[pts.length - 1], other = L.length > 1 ? lv[1 - j][lv[1 - j].length - 1] : null;
      const nudge = other == null ? 0 : (lv[j][lv[j].length - 1] >= other ? -22 : 22);     // two line ends close together part
      const gE = el(s, 'g');
      el(gE, 'text', { x: ex + 26, y: ey + 12 + nudge, class: 'fn', 'font-size': 32, style: `fill:${col}` }, full(last));
      el(gE, 'text', { x: ex + 150, y: ey + 12 + nudge, class: 'nm', 'font-size': 32, style: `fill:${col}` }, name(last));
      rise(gE, k.lines + j * .9 + 1.5);
    });
  });

  /* ======================================================================================================================
     3  PROFIT-AND-CASH WATERFALL  { items: [{key, kind:'start'|'less'|'add'|'total'}], steps: [['w0'],['w1'],…], secs }
        One dollar scale with a true zero: the start stands, each item drops (or adds) from the level the last one left, a level
        line carries each step across, and the total stands on zero: gold if it is positive, red if it is a loss.
     ====================================================================================================================== */
  const waterfall = board((S) => {
    /* items as the spec gives them ({key, kind}) or as data.js keeps a walk ({id, step: start|minus|plus|result}) */
    const KIND = { start: 'start', less: 'less', minus: 'less', add: 'add', plus: 'add', total: 'total', result: 'total' };
    if (!list(S.items).length) throw new Error('no items: BW_DATA has no walk "' + S.items + '"');
    const s = SVG, I = list(S.items).map(it => ({ key: it.key || it.id, kind: KIND[it.kind || it.step] || 'less' })), n = I.length;
    const k = steps(S.steps || I.map((_, i) => ['w' + i, 0.8 + i * 2.6]), S.secs || (0.8 + n * 2.6 + 3));
    let run0 = 0; const seg = I.map(it => { const v = V(it.key);
      if (it.kind === 'start') { run0 = v; return { a: 0, b: v }; }
      if (it.kind === 'total') return { a: 0, b: v };
      const a = run0; run0 = it.kind === 'less' ? run0 - v : run0 + v; return { a, b: run0 }; });
    const all = [0, ...seg.flatMap(q => [q.a, q.b])], T = domain(Math.min(...all), Math.max(...all), 5);
    const X0 = 300, X1 = 1740, YT = 170, YB = 760, y = lin(T.lo, T.hi, YB, YT), Z = y(0);
    const band = (X1 - X0) / n, bw = Math.min(230, band * .56), cx = (i) => X0 + band * (i + .5);
    const gA = el(s, 'g');
    T.out.forEach(tv => {
      el(gA, 'line', { x1: X0 - 20, x2: X1, y1: y(tv), y2: y(tv), stroke: tv === 0 ? C.zero : C.grid, 'stroke-width': tv === 0 ? 3 : 2 });
      el(gA, 'text', { x: X0 - 36, y: y(tv) + 11, class: 'ax', 'font-size': 32, 'text-anchor': 'end' }, tickM(tv));
    });
    el(gA, 'text', { x: X0 - 36, y: YT - 40, class: 'ax', 'font-size': 32, 'text-anchor': 'end' }, '$M');
    half(gA, k[NAMES[0]] - .4, .5, .35);
    I.forEach((it, i) => {
      const at = k[NAMES[i]], { a, b } = seg[i], top = Math.min(y(a), y(b)), h = Math.max(2, Math.abs(y(a) - y(b))), v = V(it.key);
      const tot = it.kind === 'total' || it.kind === 'start', col = it.kind === 'total' ? (v < 0 ? C.red : C.gold) : it.kind === 'start' ? C.cream : null;
      const r = el(s, 'rect', { x: cx(i) - bw / 2, y: top, width: bw, height: h,
        fill: col || (it.kind === 'less' ? 'rgba(245,241,229,.16)' : 'rgba(212,175,55,.35)'), stroke: col ? 'none' : C.cream, 'stroke-width': 2 });
      tip(r, tipText(it.key));
      grow(r, at, .9, 0, tot ? Z : y(a), 'y');
      /* the level the last item left, carried across to this one */
      if (i > 0) { const lv = el(s, 'line', { x1: cx(i - 1) + bw / 2, x2: cx(i) - bw / 2, y1: y(a), y2: y(a), stroke: C.dim, 'stroke-width': 2, 'stroke-dasharray': '5 7' });
        if (!tot) wipe(lv, at - .5, .5, 'x'); else { lv.remove(); } }
      const sign = it.kind === 'less' ? -1 : 1, shown = (v * sign) / 1e6, isT = it.kind === 'total';
      const below = Math.min(y(a), y(b)) === y(b) ? false : true;            // the label sits past the bar's moving end
      const fs = isT ? 60 : 40, yl = (it.kind === 'less' || b < 0) ? Math.max(y(a), y(b)) + fs + 12 : Math.min(y(a), y(b)) - 20;
      const vt = el(s, 'text', { x: cx(i), y: yl, class: isT ? 'fh' : 'fn', 'font-size': fs, 'text-anchor': 'middle', style: `fill:${col || C.cream}` }, sgn(shown) + grp(shown));
      rise(vt, at + .7, .5, (it.kind === 'less' || b < 0) ? -16 : 16);
      /* one line where the column allows it (a split name reads as two labels); measured, else split near the middle */
      const nm0 = name(it.key), probe = el(s, 'text', { class: 'nd', 'font-size': 32 }, nm0), fits = tw(probe) <= band - 28; probe.remove();
      const nmL = fits ? [nm0] : lines2(nm0, Math.ceil(nm0.length / 2) + 3);
      const yN = YB + 150;                                                   // under the lowest figure, one row for every name
      const nt = textLines(s, cx(i), yN, nmL, { class: isT ? 'nm' : 'nd', 'font-size': 32, 'text-anchor': 'middle' }, 40);
      half(nt, at - .2, .45, .3);
      void below;
    });
    /* the period, once, over the axis numbers */
    const per = label(I[I.length - 1].key);
    if (per) { const pt = el(s, 'text', { x: X1, y: YT - 40, class: 'ax', 'font-size': 32, 'text-anchor': 'end', style: 'fill:rgba(245,241,229,.75)' }, per); half(pt, k[NAMES[0]] - .4, .5, .35); }
  });

  /* ======================================================================================================================
     4  SEGMENT BARS  { rows: [{now, then?}], hero?: index, steps: [['frame'],['rows'],['then']], secs }
        Each line item on one shared scale, this period solid (the hero row gold), the year-ago period as an outline at its own
        true length. Values at full precision in $M; a loss runs left of zero, in red.
     ====================================================================================================================== */
  const segments = board((S) => {
    const rows = S.rows.map(r => Object.assign({}, r, { then: r.then && has(r.then) ? r.then : null }));
    const s = SVG, n = rows.length, hasThen = rows.some(r => r.then);
    const k = steps(S.steps || [['frame', 0.4], ['rows', 1.2], ...(hasThen ? [['then', 1.2 + n * .8 + 2.2]] : [])], S.secs || (n * .8 + 7));
    const now = rows.map(r => V(r.now)), then = rows.map(r => r.then ? V(r.then) : 0);
    const all = [0, ...now, ...then], T = domain(Math.min(...all), Math.max(...all), 4);
    const XL = 200, X0 = 700, X1 = 1560, x = lin(T.lo, T.hi, X0, X1), Z = x(0);
    const RH = Math.min(190, 640 / n), Y0 = 540 - RH * n / 2 + 40, bh = Math.min(64, RH * .38);
    const gA = el(s, 'g');
    T.out.forEach(tv => {
      el(gA, 'line', { x1: x(tv), x2: x(tv), y1: Y0 - 30, y2: Y0 + RH * n - 10, stroke: tv === 0 ? C.zero : C.grid, 'stroke-width': tv === 0 ? 3 : 2 });
      el(gA, 'text', { x: x(tv), y: Y0 + RH * n + 40, class: 'ax', 'font-size': 30, 'text-anchor': 'middle' }, tickM(tv));
    });
    el(gA, 'text', { x: X1 + 60, y: Y0 + RH * n + 40, class: 'ax', 'font-size': 30 }, '$M');
    /* the two periods, named once (top right) */
    const gK = el(gA, 'g'), ky = Y0 - 96;
    el(gK, 'rect', { x: X0, y: ky - 22, width: 44, height: 24, fill: C.cream });
    const k1 = el(gK, 'text', { x: X0 + 60, y: ky, class: 'ax', 'font-size': 32, style: 'fill:var(--cream)' }, label(rows[0].now));
    if (hasThen) { const r0 = rows.find(r => r.then), kx2 = X0 + 60 + tw(k1) + 56;
      el(gK, 'rect', { x: kx2, y: ky - 21, width: 42, height: 22, fill: 'none', stroke: 'rgba(245,241,229,.6)', 'stroke-width': 2 });
      el(gK, 'text', { x: kx2 + 60, y: ky, class: 'ax', 'font-size': 32 }, label(r0.then)); }
    half(gA, k.frame, .5, .35);
    rows.forEach((r, i) => {
      const yc = Y0 + RH * (i + .5), at = k.rows + i * .8, v = now[i], isH = i === (S.hero ?? -1);
      const col = v < 0 ? C.red : isH ? C.gold : C.cream;
      const nt = textLines(s, XL, yc + 12 - (lines2(name(r.now), 20).length - 1) * 20, lines2(name(r.now), 20), { class: 'nm', 'font-size': 38 }, 42);
      half(nt, at - .1, .4, .35);
      const a = Math.min(Z, x(v)), w = Math.max(2, Math.abs(x(v) - Z));
      const bar = el(s, 'rect', { x: a, y: yc - bh / 2, width: w, height: bh, fill: col }); tip(bar, tipText(r.now));
      grow(bar, at, .8, Z, 0, 'x');
      const vx = v >= 0 ? Math.max(x(v), Z) + 22 : Math.min(x(v), Z) - 22;
      const vt = el(s, 'text', { x: vx, y: yc + 14, class: 'fn', 'font-size': 40, 'text-anchor': v >= 0 ? 'start' : 'end', style: `fill:${col}` }, full(r.now));
      rise(vt, at + .55);
      if (r.then) {
        const tv = then[i], ta = Math.min(Z, x(tv)), tw0 = Math.max(2, Math.abs(x(tv) - Z));
        const o = el(s, 'rect', { x: ta, y: yc - bh / 2 - 8, width: tw0, height: bh + 16, fill: 'none', stroke: 'rgba(245,241,229,.6)', 'stroke-width': 2 });
        tip(o, tipText(r.then)); wipe(o, k.then + i * .25, .8, tv >= 0 ? 'x' : '-x');
        /* the year-ago value under this period's, smaller and grey */
        const tt = el(s, 'text', { x: vx, y: yc + 58, class: 'ax', 'font-size': 30, 'text-anchor': v >= 0 ? 'start' : 'end' }, full(r.then));
        rise(tt, k.then + i * .25 + .5);
        /* keep the value clear of a longer outline */
        if (tv > v && v >= 0) { const shift = x(tv) - x(v) + 8; on((t) => { const u = go(t, k.then + i * .25, k.then + i * .25 + .8); vt.setAttribute('x', (vx + shift * u).toFixed(1)); tt.setAttribute('x', (vx + shift * u).toFixed(1)); }); }
      }
    });
  });

  /* ======================================================================================================================
     5  GUIDANCE VS ACTUAL  { prior?: {lo, hi}, now: {lo, hi}, actual?: key, implied?: {lo, hi}, last?: key,
                              steps: [['axis'],['prior'],['now'],['actual'],['implied'],['last']], secs }
        The year's guidance as a hatched band on a true dollar scale; when it moves, the band slides from the old range to the
        new, leaving the old edges dashed. Below, what is spent to date grows from zero, and what the guidance implies for the
        rest of the year is hatched from there to the band. Last year's actual is a dashed rule through both rows.
     ====================================================================================================================== */
  const guidance = board((S) => {
    /* ranges come as one key with lo and hi, or as {lo, hi} keys; prior, actual, implied and last are optional */
    const s = SVG, keysOf = (r) => typeof r === 'string' ? [r] : [r.lo, r.hi];
    const N = range(S.now), P = S.prior && has(keysOf(S.prior)) ? range(S.prior) : null;
    const ACT = S.actual && has(S.actual) ? S.actual : null, IMP = S.implied && ACT && has(keysOf(S.implied)) ? range(S.implied) : null;
    const LAST = S.last && has(S.last) ? S.last : null;
    const k = steps(S.steps || [['axis', 0.4], ['prior', 1.2], ['now', 3.6], ['actual', 6.0], ['implied', 8.4], ['last', 10.8]], S.secs || 14);
    const vals = [0, N.lo, N.hi, ...(P ? [P.lo, P.hi] : []), ...(ACT ? [V(ACT)] : []), ...(LAST ? [V(LAST)] : [])];
    const T = ticks(0, Math.max(...vals) * 1.02, 6), X0 = 220, X1 = 1700, x = lin(0, T.hi, X0, X1);
    const YG = 330, YA = 620, BH = 96, YX = 900;
    const gA = el(s, 'g');
    T.out.forEach(tv => {
      el(gA, 'line', { x1: x(tv), x2: x(tv), y1: YG - 130, y2: YX - 40, stroke: tv === 0 ? C.zero : C.grid, 'stroke-width': tv === 0 ? 3 : 2 });
      el(gA, 'text', { x: x(tv), y: YX + 6, class: 'ax', 'font-size': 32, 'text-anchor': 'middle' }, tickB(tv));
    });
    el(gA, 'text', { x: X0 + 14, y: YG - 92, class: 'nm', 'font-size': 38 }, name(N.key));
    if (ACT) el(gA, 'text', { x: X0 + 14, y: YA - 92, class: 'nm', 'font-size': 38 }, [name(ACT), label(ACT)].filter(Boolean).join(', '));
    half(gA, k.axis, .5, .35);
    /* the band: the prior range first (if any), then it slides to the new one; the edges it left stay dashed */
    const a0 = x(P ? P.lo : N.lo), b0 = x(P ? P.hi : N.hi), a1 = x(N.lo), b1 = x(N.hi);
    const band = el(s, 'rect', { x: a0, y: YG - BH / 2, width: b0 - a0, height: BH, fill: 'url(#pk-hatchGold)', stroke: C.gold, 'stroke-width': 3 });
    tip(band, tipText(N.key));
    const first = P ? k.prior : k.now;
    wipe(band, first, .8, 'x');
    /* a hairline from zero to the band, so the range reads as a reach along the same scale as the spend below it */
    const lead = el(s, 'line', { x1: X0, x2: a0, y1: YG, y2: YG, stroke: 'rgba(245,241,229,.3)', 'stroke-width': 2 });
    on((t) => lead.setAttribute('x2', (P ? mix(a0, a1, go(t, k.now, k.now + 1.2)) : a1).toFixed(1)));
    wipe(lead, first - .5, .6, 'x');
    if (P) {
      const ghost = el(s, 'rect', { x: a0, y: YG - BH / 2, width: b0 - a0, height: BH, fill: 'none', stroke: 'rgba(245,241,229,.55)', 'stroke-width': 2, 'stroke-dasharray': '9 8' });
      tip(ghost, tipText(P.key));
      show(ghost, k.now, .4);
      on((t) => { const u = go(t, k.now, k.now + 1.2); const a = mix(a0, a1, u), b = mix(b0, b1, u); band.setAttribute('x', a.toFixed(1)); band.setAttribute('width', (b - a).toFixed(1)); });
      const pt = el(s, 'text', { x: (a0 + b0) / 2, y: YG + BH / 2 + 50, class: 'fn', 'font-size': 34, 'text-anchor': 'middle', style: 'fill:rgba(245,241,229,.6)' }, P.text);
      const pl = el(s, 'text', { x: (a0 + b0) / 2, y: YG + BH / 2 + 92, class: 'nd', 'font-size': 30, 'text-anchor': 'middle' }, cap(label(P.key)));
      rise(pt, k.prior + .5); rise(pl, k.prior + .6);
    }
    const nt = el(s, 'text', { x: (a1 + b1) / 2, y: YG - BH / 2 - 22, class: 'fh', 'font-size': 46, 'text-anchor': 'middle', style: 'letter-spacing:-.015em' }, N.text);
    rise(nt, k.now + (P ? 1.1 : .5));
    if (isDate(label(N.key))) { const nl = el(s, 'text', { x: b1 + 26, y: YG + 12, class: 'nd', 'font-size': 30 }, label(N.key)); rise(nl, k.now + (P ? 1.3 : .7)); }
    if (ACT) {
      const va = V(ACT), bar = el(s, 'rect', { x: X0, y: YA - BH / 2, width: x(va) - X0, height: BH, fill: C.cream });
      tip(bar, tipText(ACT)); grow(bar, k.actual, 1.1, X0, 0, 'x');
      const at = el(s, 'text', { x: x(va) - 20, y: YA + 14, class: 'fn', 'font-size': 40, 'text-anchor': 'end', style: 'fill:var(--bg)' }, fullUSD(ACT));
      rise(at, k.actual + .9);
      if (IMP) {
        const r1 = el(s, 'rect', { x: x(va), y: YA - BH / 2, width: a1 - x(va), height: BH, fill: 'url(#pk-hatch)', stroke: C.cream, 'stroke-width': 2 });
        const r2 = el(s, 'rect', { x: a1, y: YA - BH / 2, width: b1 - a1, height: BH, fill: 'url(#pk-hatchDim)', stroke: 'rgba(245,241,229,.55)', 'stroke-width': 2, 'stroke-dasharray': '9 8' });
        tip(r1, tipText(IMP.key)); tip(r2, tipText(IMP.key));
        const gI = el(s, 'g'); gI.appendChild(r1); gI.appendChild(r2); wipe(gI, k.implied, 1.0, 'x');
        /* its dimension: from the spend to date to each end of the band */
        const yD = YA + BH / 2 + 46, gD = el(s, 'g');
        [x(va), b1].forEach(p => el(gD, 'line', { x1: p, x2: p, y1: yD - 14, y2: yD + 14, stroke: C.dim, 'stroke-width': 2 }));
        el(gD, 'line', { x1: x(va), x2: b1, y1: yD, y2: yD, stroke: C.dim, 'stroke-width': 2 });
        el(gD, 'text', { x: (x(va) + b1) / 2, y: yD + 50, class: 'fn', 'font-size': 36, 'text-anchor': 'middle', style: 'fill:rgba(245,241,229,.85)' }, IMP.text);
        const il = [name(IMP.key), label(IMP.key)].filter(Boolean).join(', ');
        if (il) el(gD, 'text', { x: (x(va) + b1) / 2, y: yD + 92, class: 'nd', 'font-size': 30, 'text-anchor': 'middle' }, il);
        rise(gD, k.implied + .8);
      }
    }
    if (LAST) {
      const xl = x(V(LAST)), gL = el(s, 'g');
      el(gL, 'line', { x1: xl, x2: xl, y1: YG - 150, y2: YA + BH / 2 + 10, stroke: 'rgba(245,241,229,.7)', 'stroke-width': 2, 'stroke-dasharray': '6 8' });
      const lt = el(gL, 'text', { x: xl - 14, y: YG - 120, class: 'fn', 'font-size': 34, 'text-anchor': 'end', style: 'fill:rgba(245,241,229,.85)' }, disp(LAST));
      el(gL, 'text', { x: xl + 14, y: YG - 120, class: 'nd', 'font-size': 32 }, label(LAST) || name(LAST));
      tip(lt, tipText(LAST)); wipe(gL, k.last, .8, 'y');
    }
  });

  /* ======================================================================================================================
     6  RECEIPT CARD  { img, size: [w, h] capture px, crop: [x, y, w, h], marks: [{box: [x0, y0, x1, y1], kind?: 'under'|'loop'}],
                        src: data.js source id (the credit), steps: [['card'],['m0'],…], secs }
        The one receipt style (rule 18): a flat card cropped to its column, tilted a little, settling centred; the gold pen
        marks only what the capture prints, on its word; the camera pushes slowly and evenly, never to fill the frame.
     ====================================================================================================================== */
  const receipt = board((S) => {
    const s = SVG, M = S.marks || [];
    const k = steps(S.steps || [['card', 0.3], ...M.map((_, i) => ['m' + i, 2.4 + i * 2.2])], S.secs || (2.4 + M.length * 2.2 + 3));
    const [IW, IH] = S.size, [cx0, cy0, cw, ch] = S.crop || [0, 0, IW, IH];
    const DW = Math.min(S.width || 1240, 1500), sc = DW / cw, DH = ch * sc;
    const fitH = Math.min(1, 820 / DH), sc2 = sc * fitH, w = cw * sc2, h = ch * sc2;
    const world = el(s, 'g'), card = el(world, 'g');
    const id = 'pkc' + (++_c), cp = el(SVG.querySelector('defs'), 'clipPath', { id }); el(cp, 'rect', { x: 0, y: 0, width: w, height: h });
    const inner = el(card, 'g', { 'clip-path': `url(#${id})` });
    el(inner, 'rect', { x: 0, y: 0, width: w, height: h, fill: 'white' });
    el(inner, 'image', { href: S.img, x: -cx0 * sc2, y: -cy0 * sc2, width: IW * sc2, height: IH * sc2, preserveAspectRatio: 'none' });
    el(card, 'rect', { x: -1, y: -1, width: w + 2, height: h + 2, fill: 'none', stroke: 'rgba(245,241,229,.3)', 'stroke-width': 2 });
    const pen = el(card, 'g');
    M.forEach((m, i) => {
      const [x0, y0, x1, y1] = m.box.map((v, j) => (v - (j % 2 ? cy0 : cx0)) * sc2), at = k['m' + i];
      const p = m.kind === 'loop'
        ? el(pen, 'ellipse', { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 22, ry: (y1 - y0) / 2 + 12, fill: 'none', stroke: C.gold, 'stroke-width': 3.5 })
        : el(pen, 'path', { d: `M${x0 - 4},${y1 + 5} L${x1 + 4},${y1 + 3}`, fill: 'none', stroke: C.gold, 'stroke-width': 5, 'stroke-linecap': 'round' });
      draw(p, at, .7);
    });
    /* the card arrives from below, settles centred and tilted, then the camera pushes slowly, evenly, to the end */
    const rot = S.rot ?? -1.2, push = S.push ?? 1.045;
    on((t) => {
      const u = go(t, k.card, k.card + 1.0, ease.out), z = mix(1, push, go(t, k.card + .6, END, ease.lin));
      const dy = 60 * (1 - u);
      card.setAttribute('transform', `translate(${(960 - w / 2).toFixed(1)},${(520 - h / 2 + dy).toFixed(1)}) rotate(${rot} ${w / 2} ${h / 2})`);
      card.setAttribute('opacity', u.toFixed(3));
      world.setAttribute('transform', `translate(960,520) scale(${z.toFixed(4)}) translate(-960,-520)`);
    });
    if (S.src) { const so = DATA().sources[S.src]; if (so) footer = 'Source: ' + so.name; else missing.push('source ' + S.src); }
  });

  /* ======================================================================================================================
     7  QUOTE CARD  { lines: ['…', '… {gold words} …'], who, role, ctx, tc?, src: data.js source id,
                      steps: [['l0'],['l1'],…], secs }
        A call clip's words, verbatim, set large and revealed line by line as they are spoken; {braces} mark the words the
        story turns on, in gold. The speaker's lower third sits under it; a hairline runs the length of the clip.
        The words are the speaker's (the transcript), never ours: list them in spec\words-allow.json for bw words.
     ====================================================================================================================== */
  const quote = board((S) => {
    const s = SVG, Lq = S.lines || [];
    const k = steps(S.steps || Lq.map((_, i) => ['l' + i, 0.6 + i * 2.4]), S.secs || (0.6 + Lq.length * 2.4 + 3));
    const X0 = 200, FS = S.size || 64, LH = FS * 1.28, Y0 = 520 - (Lq.length * LH) / 2 + FS * .4;
    /* a gold rule beside the quote grows down with it, a line at a time (a pull-quote's rule, not a quotation-mark glyph) */
    const rq = el(s, 'line', { x1: X0 - 48, x2: X0 - 48, y1: Y0 - FS * .9, y2: Y0 - FS * .9, stroke: C.gold, 'stroke-width': 5 });
    on((t) => { let n = 0; Lq.forEach((_, i) => { n += go(t, k[NAMES[i]], k[NAMES[i]] + .6, ease.out); });
      rq.setAttribute('y2', (Y0 - FS * .9 + n * LH).toFixed(1)); rq.style.display = n <= 0 ? 'none' : ''; });
    const plain = [];
    Lq.forEach((line, i) => {
      const t = el(s, 'text', { x: X0, y: Y0 + i * LH, class: 'qt', 'font-size': FS });
      line.split(/(\{[^}]*\})/).filter(Boolean).forEach(part => {
        const g = /^\{.*\}$/.test(part), ts = el(t, 'tspan', g ? { class: 'qg' } : {}, g ? part.slice(1, -1) : part);
        if (!g) plain.push(ts);
      });
      rise(t, k[NAMES[i]], .6, 26);
    });
    /* optional step 'focus' (layer 5.5): when the voice restates the gold words, the rest of the quote steps back to a third */
    if (k.focus != null) on((t) => { const o = (1 - .68 * go(t, k.focus, k.focus + .8)).toFixed(3); plain.forEach(ts => ts.setAttribute('fill-opacity', o)); });
    /* optional `uses` (layer 5.5): data.js keys the card stands for, so they are declared and credited (then leave `src` out) */
    (S.uses || []).forEach(F);
    /* the lower third */
    const YL = 900, gL = el(s, 'g');
    el(gL, 'line', { x1: X0, x2: X0 + 1520, y1: YL - 64, y2: YL - 64, stroke: 'rgba(245,241,229,.18)', 'stroke-width': 2 });
    el(gL, 'text', { x: X0, y: YL, class: 'nm', 'font-size': 40, style: 'font-weight:600' }, people(S.who));       // a data.js `names` id (susan_li) or the name itself
    /* the second line is optional: a role is words, so it shows only when the spec gives it (and bw words then wants it
       allowed); the credit line already names the call */
    const rl = el(gL, 'text', { x: X0, y: YL + 48, class: 'nd', 'font-size': 32 }, [S.role, S.ctx].filter(Boolean).join(', '));
    if (S.tc) el(gL, 'text', { x: X0 + 1520, y: YL, class: 'ax', 'font-size': 32, 'text-anchor': 'end' }, S.tc);
    half(gL, k[NAMES[0]] - .3, .4, .4);
    void rl;
    const run = el(s, 'line', { x1: X0, x2: X0 + 1520, y1: YL - 64, y2: YL - 64, stroke: C.gold, 'stroke-width': 3 });
    on((t) => { const u = go(t, k[NAMES[0]] - .3, END - .4, ease.lin); run.setAttribute('x2', (X0 + 1520 * u).toFixed(1)); run.style.display = u <= 0 ? 'none' : ''; });
    if (S.src) { const so = DATA().sources[S.src]; if (so) footer = 'Source: ' + so.name; else missing.push('source ' + S.src); }
  });

  /* ======================================================================================================================
     8  SCENARIO BOARD  { cases: [keys], share?: [keys], against?: {lo, hi} | {key}, per?: key, steps: [['cases'],['against'],['share']], secs }
        The cases (estimates, so hatched) on a scale that fits them; then the scale pulls back to take in what they are set
        against, at its true size, and the cases shrink to what they are. Every case's drivers live in data.js and the credit.
     ====================================================================================================================== */
  const scenario = board((S) => {
    const s = SVG, cs = list(S.cases), n = cs.length;
    if (!n) throw new Error('no cases: BW_DATA has no list or keys for "' + S.cases + '"');
    /* against: one key (with lo and hi, or a single value) or {lo, hi} keys; optional, like the shares */
    const aKeys = !S.against ? [] : typeof S.against === 'string' ? [S.against] : S.against.key ? [S.against.key] : [S.against.lo, S.against.hi];
    const AR = aKeys.length && has(aKeys) ? (typeof S.against === 'string' && F(S.against).lo == null ? { lo: V(S.against), hi: V(S.against), text: disp(S.against), key: S.against, one: true }
      : S.against.key ? { lo: V(S.against.key), hi: V(S.against.key), text: disp(S.against.key), key: S.against.key, one: true } : range(S.against)) : null;
    const A = AR, SH = S.share && has(list(S.share)) ? list(S.share) : null;
    const k = steps(S.steps || [['cases', 0.6], ['against', 5.4], ['share', 8.6]], S.secs || 13);
    const cv = cs.map(V), aLo = A ? A.lo : 0, aHi = A ? A.hi : 0;
    const T1 = ticks(0, Math.max(...cv) * 1.12, 5), T2 = A ? ticks(0, aHi * 1.04, 6) : T1;
    const X0 = 520, X1 = 1700, RH = 132, YA = 250, Y0 = A ? 470 : 340;
    const D1 = Math.max(...cv) * 1.12, D2 = A ? aHi * 1.05 : D1;          // each state's domain hugs what it shows
    let D = D1; const x = (v) => X0 + (v / D) * (X1 - X0);
    const id = 'pkp' + (++_c), cp = el(SVG.querySelector('defs'), 'clipPath', { id }); el(cp, 'rect', { x: X0 - 70, y: 0, width: X1 - X0 + 150, height: H });
    const plot = el(s, 'g', { 'clip-path': `url(#${id})` });
    const YT = Y0 + RH * n + 10;
    const tickSet = (T, cls) => { const g = el(plot, 'g'); const items = T.out.map(tv => ({ tv, l: el(g, 'line', { y1: (A ? YA - 80 : Y0 - 60), y2: YT - 30, stroke: tv === 0 ? C.zero : C.grid, 'stroke-width': tv === 0 ? 3 : 2 }), t: el(g, 'text', { y: YT + 14, class: 'ax', 'font-size': 32, 'text-anchor': 'middle' }, tickB(tv)) })); g.setAttribute('class', cls); return { g, items }; };
    const TS1 = tickSet(T1, 'pk-t1'), TS2 = A ? tickSet(T2, 'pk-t2') : null;
    half(TS1.g, k.cases - .3, .4, .35, A ? k.against : Infinity, .45);
    if (TS2) show(TS2.g, k.against + .6, 1.0);
    const bars = cs.map((key, i) => {
      const yc = Y0 + RH * (i + .5), r = el(plot, 'rect', { x: X0, y: yc - 30, height: 60, width: 0, fill: 'url(#pk-hatchGold)', stroke: C.gold, 'stroke-width': 3 });
      tip(r, tipText(key));
      const nt = el(s, 'text', { x: X0 - 40, y: yc + 13, class: 'nm', 'font-size': 40, 'text-anchor': 'end' }, cap(label(key)));
      half(nt, k.cases + i * .5 - .2, .4, .35);
      const vt = el(s, 'text', { y: yc + 14, class: 'fn', 'font-size': 40 }, disp(key)); show(vt, k.cases + i * .5 + .6, .4);
      const st = SH ? el(s, 'text', { y: yc + 14, class: 'ax', 'font-size': 34 }, (F(SH[i]).display || (F(SH[i]).v + '%'))) : null;
      if (st) { tip(st, tipText(SH[i])); show(st, k.share + i * .3, .4); }
      return { r, vt, st, at: k.cases + i * .5, v: cv[i] };
    });
    if (cs[0]) { const nm = el(s, 'text', { x: X0 - 40, y: Y0 - 34, class: 'nd', 'font-size': 36, 'text-anchor': 'end' }, name(cs[0])); half(nm, k.cases - .2, .4, .35); }
    let aBar = null, aT = null, aN = null;
    if (A) {
      aBar = el(plot, 'rect', { x: 0, y: YA - 44, height: 88, width: 0, fill: 'url(#pk-hatchDim)', stroke: 'rgba(245,241,229,.7)', 'stroke-width': 2 });
      tip(aBar, tipText(A.key));
      aT = el(s, 'text', { y: YA - 66, class: 'fn', 'font-size': 40, 'text-anchor': 'end' }, A.text);
      aN = el(s, 'text', { x: X0 - 40, y: YA + 13, class: 'nm', 'font-size': 40, 'text-anchor': 'end' }, name(A.key));
      show(aT, k.against + 1.6, .5); show(aN, k.against + .3, .5);
    }
    on((t) => {
      const u = A ? go(t, k.against, k.against + 2.2) : 0;
      D = mix(D1, D2, u);
      const place = (TS) => TS.items.forEach(({ tv, l, t: tx }) => { const p = x(tv), off = p > X1 + 12; l.setAttribute('x1', p); l.setAttribute('x2', p); tx.setAttribute('x', p); tx.style.display = off ? 'none' : ''; l.style.display = off ? 'none' : ''; });
      place(TS1); if (TS2) place(TS2);
      bars.forEach(b => { const g = go(t, b.at, b.at + .8); const w = (x(b.v) - X0) * g; b.r.setAttribute('width', Math.max(0, w).toFixed(2)); b.r.style.display = g <= 0 ? 'none' : '';
        b.vt.setAttribute('x', (X0 + Math.max(w, 0) + 24).toFixed(1));
        if (b.st) b.st.setAttribute('x', (X0 + Math.max(w, 0) + 24 + tw(b.vt) + 26).toFixed(1)); });
      /* what the cases are set against stands at its true value on the scale of the moment: it enters from beyond the
         frame's edge as the scale pulls back, and its end comes into view only when the scale can hold it */
      if (aBar) { const o = go(t, k.against - .1, k.against + .4, ease.out); aBar.setAttribute('x', X0); aBar.setAttribute('width', Math.max(0, x(aHi) - X0).toFixed(1)); aBar.setAttribute('opacity', o.toFixed(3)); aBar.style.display = o <= 0 ? 'none' : '';
        aT.setAttribute('x', x(aHi).toFixed(1)); }
    });
    /* per (5.6): the denominator of the shares, marked on the bar it is part of, landing with the shares (its value and its label) */
    if (A && S.per && has([S.per])) {
      const pv = V(S.per), pl = el(s, 'line', { y1: YA - 56, y2: YA + 56, stroke: C.gold, 'stroke-width': 3 });
      const pt = el(s, 'text', { y: YA + 96, class: 'fn', 'font-size': 34, 'text-anchor': 'middle' }, disp(S.per));
      const pn = el(s, 'text', { y: YA + 134, class: 'ax', 'font-size': 28, 'text-anchor': 'middle' }, label(S.per));
      tip(pl, tipText(S.per));
      on(() => { const p = x(pv); pl.setAttribute('x1', p); pl.setAttribute('x2', p); pt.setAttribute('x', p); pn.setAttribute('x', Math.min(p, X1 + 60 - tw(pn) / 2)); });
      [pl, pt, pn].forEach((n, i) => show(n, (k.share !== undefined ? k.share : k.against + 2) - .3 + i * .15, .4));
      /* 5.7: the shares' column says what they are a share of ("of the $140B midpoint"), over the first share, as they land */
      if (SH) { const ph = el(s, 'text', { y: Y0 - 34, class: 'nd', 'font-size': 32, style: 'fill:rgba(245,241,229,.62)' });
        el(ph, 'tspan', {}, 'of the '); el(ph, 'tspan', { class: 'fn' }, disp(S.per)); el(ph, 'tspan', {}, ' ' + label(S.per));
        on(() => { const b0 = bars[0]; if (b0 && b0.st) ph.setAttribute('x', b0.st.getAttribute('x') || X0); });
        show(ph, (k.share !== undefined ? k.share : k.against + 2) - .1, .4); }
    }
    if (A && !A.one && A.lo < A.hi) {  /* the band's own range inside the bar: its low end as a rule */
      const rl = el(plot, 'line', { y1: YA - 44, y2: YA + 44, stroke: 'rgba(245,241,229,.7)', 'stroke-width': 2, 'stroke-dasharray': '6 6' });
      on((t) => { rl.setAttribute('x1', x(aLo)); rl.setAttribute('x2', x(aLo)); }); show(rl, k.against + 1.8, .4);
    }
  });

  /* ======================================================================================================================
     CUSTOM (layer 5.5, 25 Oct 2026): a one-off board on the kit's clock and grammar. PRINT.custom((S, H) => { … })(spec):
     H.steps([[name, t], …], secs) registers the steps (?at= re-times them in order), and the helpers below draw on board time,
     so ?t= ?still ?final ?capture behave exactly as on the eight kit boards. Every figure still comes through H.F / H.disp.
     ====================================================================================================================== */
  const KIT = { el, show, half, rise, draw, wipe, grow, steps, on, go, ease, mix, clamp, tw, tip, C, W, H, lin, ticks,
    F, V, disp, name, label, parts, tipText, people, full, fullUSD, list, has, cap,
    svg: () => SVG, names: () => NAMES, end: () => END, foot: (s) => { footer = s; }, uses: (ks) => { extraUses.push(...ks); } };
  const custom = (build) => board((S) => build(S, KIT));

  return { number, trend, waterfall, segments, guidance, receipt, quote, scenario, custom, F, V, K, used };
})();
