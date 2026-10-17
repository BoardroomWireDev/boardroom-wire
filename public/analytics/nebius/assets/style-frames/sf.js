/* Style-frame helpers, nebius: SVG marks, linear scales, hatch, footage slots, company marks, the dot/node field,
   and the one credit line rendered from the keys a frame uses. Grown from the Alexandr Wang frames' sf.js. */
const NS = 'http://www.w3.org/2000/svg';
function el(p, tag, a = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, a[k]);
  if (text != null) e.textContent = text;
  p.appendChild(e); return e;
}
const lin = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
const F = (k) => { if (!FIG[k]) throw new Error('no figure ' + k); return FIG[k]; };
const used = new Set();                     // every key a frame reads goes to its credit line
const U = (k) => { used.add(k); return F(k).v; };

/* printing: the ledger carries raw values; scale and precision are set here, per use (one rounding rule per unit) */
const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const fmt = {
  usdB: (v, dp = 1) => (v < 0 ? '-' : '') + '$' + (Math.abs(v) / 1e9).toFixed(dp) + 'B',
  usdM: (v, dp = 0) => (v < 0 ? '-' : '') + '$' + (Math.abs(v) / 1e6).toFixed(dp) + 'M',
  usd: (v, dp = 2) => '$' + v.toFixed(dp),
  int: (v) => Math.round(v).toLocaleString('en-US'),
  pct: (v, dp = 0, sign = false) => (sign && v > 0 ? '+' : '') + v.toFixed(dp) + '%',
  day: (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4),
  mon: (iso) => MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4)
};
const t = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +(iso.slice(8, 10) || 1));

/* hatch patterns: projected, not yet booked, or ours (house §3.4) */
function defs(svg) {
  const d = el(svg, 'defs');
  const mk = (id, col, w, gap, rot = 45) => {
    const p = el(d, 'pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${rot})` });
    el(p, 'rect', { width: w, height: gap, fill: col });
  };
  mk('hatch', 'rgba(245,241,229,.34)', 2, 12);
  mk('hatchGold', '#D4AF37', 3, 11);
  mk('hatchGoldFine', '#D4AF37', 1.6, 5);
  mk('hatchDim', 'rgba(245,241,229,.16)', 2, 12);
  mk('hatchRed', '#FF5247', 2.4, 10);
  return d;
}

/* a company mark, laid flat in one ink colour through its own alpha (brand colours stay off the board) */
let _mk = 0;
function mark(svg, href, x, y, w, h, col = 'var(--cream)') {
  if (typeof BRAND !== 'undefined' && BRAND) for (const k in BRAND_FILL) if (href.includes('logo-' + k)) col = BRAND_FILL[k];
  const d = svg.querySelector('defs') || el(svg, 'defs'), id = 'mk' + (++_mk);
  const m = el(d, 'mask', { id, maskUnits: 'userSpaceOnUse', x, y, width: w, height: h, style: 'mask-type:alpha' });
  el(m, 'image', { href, x, y, width: w, height: h, preserveAspectRatio: 'xMinYMid meet' });
  return el(svg, 'rect', { x, y, width: w, height: h, fill: col, mask: `url(#${id})` });
}
const LOGO = {
  yandex: ['../../../logos/yandex-wordmark-color.svg', 130 / 51.254],
  nebiusWord: ['../../../logos/nebius-wordmark-white.svg', 1134 / 312],
  meta: ['../logos/logo-meta.png', 1600 / 322],                 // the video's own copies (dashboards/assets/logos, Davinci, 13 Oct)
  microsoft: ['../logos/logo-microsoft.png', 1],
  amazon: ['../logos/logo-amazon.png', 6110 / 2047],
  google: ['../logos/logo-google.png', 1],
  nvidia: ['../logos/logo-nvidia.png', 1],
  /* CoreWeave's own header SVG (REQ-008, coreweave.com), its wordmark set white for a dark ground, its blue symbol kept; the
     viewBox is cropped to the glyphs (Ive, 16 Oct, back-half P03 and P11) */
  coreweave: ['../logos/logo-coreweave_dark.svg', 618 / 88],
  openai: ['../logos/logo-openai_white.png', 1600 / 434],
  anthropic: ['../logos/logo-anthropic.png', 1],
  iren: ['../logos/logo-iren.svg', 153 / 80]                    // iren.com's own header SVG (16 Oct): a green parallelogram, navy letters, on its own ground
};
const FULL_COLOUR = new Set(['coreweave', 'iren']);                   // files already in their owner's dark-ground colours: laid as they are
/* BRAND COLOURS (Ive, 15 Oct 2026, the writer's note 2 on master v3; approved 16 Oct, DECISIONS 2026-10-16): company marks in
   their own colours, each in the version its owner sets on a dark ground (a dark wordmark goes white, the symbol keeps its
   colour). Brand colour is identity, never meaning: data stays gold, cream, grey and red as before. Nebius lime only on its
   mark and its product moments. On by default for every Nebius board since 16 Oct; ?brand=0 shows the old one-ink marks. */
const BRAND = !/[?&]brand=0(?:&|$)/.test(location.search);
const BRAND_FILL = { nvidia: '#76B900' };                       // one-colour marks whose own colour is one fill
/* owners' colours a board may use as an ACCENT where it is about that company (16 Oct; boards carry no hex literals, bw audit):
   Meta's blue on Meta's own moments (note 11); Nebius's lime and navy on its mark and product moments only */
const BRAND_COL = { meta: '#0082FB', lime: '#DAFF33', navy: '#052B42', limeRGB: '218,255,51', navyRGB: '5,43,66', metaRGB: '0,130,251',
  coreweave: '#2741E7', coreweaveRGB: '39,65,231', iren: '#71DA80', irenRGB: '113,218,128' };   // CoreWeave's blue and IREN's green, each from its own header SVG (back-half P03 and P11, 16 Oct)
const MS4 = ['#F25022', '#7FBA00', '#00A4EF', '#FFB900'];       // Microsoft's four panes, in reading order
/* Google's four-colour G, from Google's own sign-in mark (48-unit box) */
const GOOGLE_G = [['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'],
  ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'],
  ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'],
  ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z']];
let _bc = 0;
function brandLogo(svg, name, x, y, h) {
  const g = el(svg, 'g');
  if (name === 'microsoft') { const k = el(g, 'g', { transform: `translate(${x},${y}) scale(${h / 23})` });
    [[1, 1], [12, 1], [1, 12], [12, 12]].forEach(([a, b], i) => el(k, 'rect', { x: a, y: b, width: 10, height: 10, fill: MS4[i] })); return g; }
  if (name === 'google') { const k = el(g, 'g', { transform: `translate(${x},${y}) scale(${h / 48})` });
    GOOGLE_G.forEach(([f, d]) => el(k, 'path', { d, fill: f })); return g; }
  const [href, r] = LOGO[name], w = h * r;
  if (FULL_COLOUR.has(name)) { el(g, 'image', { href, x, y, width: w, height: h, preserveAspectRatio: 'xMinYMid meet' }); return g; }
  /* Nebius's own dark-ground wordmark is its white file; the lime is the symbol's (the colour wordmark's lime pill beside the
     lime tile doubled the block) */
  if (name === 'nebiusWord') { mark(g, href, x, y, w, h, '#FFFFFF'); return g; }
  if (BRAND_FILL[name]) { mark(g, href, x, y, w, h, BRAND_FILL[name]); return g; }
  /* a two-part mark: the wordmark white, the coloured part laid over it from the owner's own file */
  const part = { amazon: ['y', .535], meta: ['x', .31] }[name];
  mark(g, href, x, y, w, h, '#FFFFFF');
  if (part) { const d = svg.querySelector('defs') || el(svg, 'defs'), id = 'bc' + (++_bc), cp = el(d, 'clipPath', { id });
    if (part[0] === 'y') el(cp, 'rect', { x, y: y + h * part[1], width: w, height: h * (1 - part[1]) });
    else el(cp, 'rect', { x, y, width: w * part[1], height: h });
    el(g, 'image', { href, x, y, width: w, height: h, preserveAspectRatio: 'xMinYMid meet', 'clip-path': `url(#${id})` }); }
  return g;
}
function logo(svg, name, x, y, h, col) {
  if (BRAND && name !== 'yandex') return brandLogo(svg, name, x, y, h);
  /* Microsoft's mark is drawn from its own geometry (four equal panes on a 23-unit grid): the local PNG copy has no alpha, so it
     cannot be laid flat through a mask (13 Oct; flagged to Davinci) */
  if (name === 'microsoft') { const g = el(svg, 'g', { transform: `translate(${x},${y}) scale(${h / 23})` });
    [[1, 1], [12, 1], [1, 12], [12, 12]].forEach(([a, b]) => el(g, 'rect', { x: a, y: b, width: 10, height: 10, fill: col || 'var(--cream)' })); return g; }
  const [href, r] = LOGO[name]; return mark(svg, href, x, y, h * r, h, col); }
/* the Nebius symbol drawn from its own path: a square tile with the glyph cut in ink */
const NEB_GLYPH = 'm46.3331 27.4668 12.243 33.8335c4.0549 9.1563 9.2098 6.3939 9.2098 6.3939 0 4.0685-3.2659 7.8683-8.0338 7.8683-4.7678 0-7.4679-2.9684-9.5229-7.5796l-12.2487-33.8336c-4.0536-8.8496-9.7663-6.0873-9.8787-6.032.0607-.0018.0929-.0018.0929-.0018l.0083 44.5261h-10.0072l-.0083-34.6309c0-9.3288 8.8962-9.8628 9.9143-9.8934.0004-4.068 3.2587-7.8673 8.0321-7.8673 4.7737 0 8.1385 2.5999 10.1992 7.2168zm21.464-4.2986.0082 44.526s10.0072 0 10.0072-9.8951l-.0082-34.6309z';
function nebius(svg, x, y, size, tile = 'var(--gold)', glyph = 'var(--bg)') {
  if (BRAND && tile === 'var(--gold)') { tile = '#DAFF33'; glyph = '#052B42'; }     // Nebius's own symbol colours (nebius-symbol-color.svg)
  const g = el(svg, 'g', { transform: `translate(${x},${y}) scale(${size / 96})` });
  el(g, 'rect', { width: 96, height: 96, fill: tile });
  el(g, 'path', { d: NEB_GLYPH, fill: glyph, 'fill-rule': 'evenodd' });
  return g;
}

/* a footage window: the slot a real clip rides in (rule 18), marked by its corners only */
function slot(p, x, y, w, h, col = 'rgba(245,241,229,.55)', c = 26) {
  const g = el(p, 'g', { fill: 'none', stroke: col, 'stroke-width': 2 });
  el(g, 'rect', { x, y, width: w, height: h, fill: 'rgba(245,241,229,.035)', stroke: 'none' });
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) =>
    el(g, 'path', { d: `M${a + sx * c},${b} H${a} V${b + sy * c}` }));
  return g;
}

/* a dimension line (technical-drawing grammar): extension ticks at both ends, the value set at its middle */
function dim(p, x1, y1, x2, y2, col = 'rgba(245,241,229,.55)', tick = 10) {
  const g = el(p, 'g', { stroke: col, 'stroke-width': 2, fill: 'none' });
  el(g, 'line', { x1, y1, x2, y2 });
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, dx = Math.cos(a) * tick, dy = Math.sin(a) * tick;
  el(g, 'line', { x1: x1 - dx, y1: y1 - dy, x2: x1 + dx, y2: y1 + dy });
  el(g, 'line', { x1: x2 - dx, y1: y2 - dy, x2: x2 + dx, y2: y2 + dy });
  return g;
}

/* a counted field: n cells in blocks of 100 (10 x 10), so any count reads at a glance; returns each cell's centre */
function field(n, { x, y, pitch, gap, across }) {
  const out = [], BK = 10 * pitch;
  for (let i = 0; i < n; i++) {
    const b = Math.floor(i / 100), j = i % 100;
    const bx = x + (b % across) * (BK + gap), by = y + Math.floor(b / across) * (BK + gap);
    out.push([bx + (j % 10) * pitch + pitch / 2, by + Math.floor(j / 10) * pitch + pitch / 2, i]);
  }
  return out;
}

/* the credit: one plain line, built from the tiers of the keys on screen */
function credit(lead, extra = []) {
  const keys = [...used, ...extra];
  const by = { P: [], R: [], E: [], C: [] };
  keys.forEach(k => { const f = F(k); if (f.t === 'C') by.C.push(k); else if (f.cr && by[f.t] && !by[f.t].includes(f.cr)) by[f.t].push(f.cr); });
  const parts = [];
  if (lead) parts.push(lead);
  if (by.P.length) parts.push('Source: ' + by.P.join('; ') + '.');
  if (by.R.length) parts.push('Reported by ' + by.R.join(' and ') + '.');
  if (by.C.length || calc) parts.push('Boardroom Wire calculation.');
  document.getElementById('credit').textContent = parts.join(' ');
}
let calc = false;          // a frame sets calc = true when it prints its own arithmetic
