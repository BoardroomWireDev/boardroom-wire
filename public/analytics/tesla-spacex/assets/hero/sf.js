/* tesla-spacex heroes: drawing helpers (Ive, 18 Oct 2026). Grown from Nebius's style-frames sf.js: SVG marks, linear scales,
   the company marks in their owners' dark-ground versions, a dimension line, and the figure readers.

   Figures. This video's ledger stores money in USD millions or billions and counts in millions, so a board never reads f.v raw:
   usd(k) returns dollars, num(k) the value in its own unit, pct(k) a percentage. Every key read goes into `used`, and HERO.run()
   renders the one credit line from it (BW.provenance). Nothing on screen is typed.

   The honesty grammar for this video (LOOK-tesla-spacex.md):
     our arithmetic (tier C)   the figure solid, a dashed underline under it (the writer's pick, Nebius N15 A, 16 Oct)
     planned, not yet real     drawn in a dashed line, the drafting convention for proposed work (no hatching: the writer
                               called the hatched figures rough on Nebius, note 15)
     "more than" / open-ended  the bar's far end fades to nothing; no edge is drawn where none is sourced
     a loss                    red, and only a loss */
const NS = 'http://www.w3.org/2000/svg';
function el(p, tag, a = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, a[k]);
  if (text != null) e.textContent = text;
  p.appendChild(e); return e;
}
const lin = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
const F = (k) => { if (!FIG[k]) throw new Error('no figure ' + k + ' in shared/data.js'); return FIG[k]; };
const used = new Set();
const U = (k) => { used.add(k); return F(k).v; };
let calc = false;

/* a figure still owed (Goldman's row not yet in data.js): its mark is held, the rest of the board renders, and the key is
   listed in window.BW_HELD and the console (the Nebius "hold the step" rule). Never a typed stand-in. */
const BW_HELD = [];
const has = (k) => { if (FIG[k]) return true; BW_HELD.push(k); console.warn('held: no figure ' + k + ' in shared/data.js'); return false; };
/* a number data.js reads from a text row's words (n, lo, hi, from, to, pct): held, like a missing key, if the field is not there */
const fld = (k, f) => { const x = FIG[k] && FIG[k][f]; if (typeof x === 'number') { used.add(k); return x; } BW_HELD.push(k + '.' + f);
  console.warn('held: no number ' + f + ' on ' + k + ' in shared/data.js'); return null; };
/* the ledger's units: USD, USD millions, USD billions; counts in millions. A text row's number is data.js's n */
const val = (k) => { const f = F(k); used.add(k); return typeof f.v === 'number' ? f.v : f.n; };
function usd(k) { const v = val(k), u = String(F(k).u || '').toLowerCase();
  const s = u.startsWith('usd billion') ? 1e9 : u.startsWith('usd million') ? 1e6 : 1; return v * s; }
function num(k) { const v = val(k), u = String(F(k).u || '').toLowerCase();
  return u.startsWith('millions') ? v * 1e6 : v; }
function pct(k) { const v = U(k), u = String(F(k).u || '').toLowerCase(); return u.startsWith('ratio') ? v * 100 : v; }      // 'ratio', 'ratio of total revenue'
const isCalc = (k) => F(k).t === 'C';

/* printing: one rounding rule per unit across both boards (house §6.2) */
const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const fmt = {
  usdB: (v, dp = 1) => (v < 0 ? '-' : '') + '$' + (Math.abs(v) / 1e9).toFixed(dp) + 'B',
  usdM: (v) => (v < 0 ? '-' : '') + '$' + Math.round(Math.abs(v) / 1e6).toLocaleString('en-US') + 'M',
  usdT: (v, dp = 2) => '$' + (v / 1e12).toFixed(dp) + 'T',
  usd: (v, dp = 2) => '$' + v.toFixed(dp),                       // a share price, to the cent
  int: (v) => Math.round(v).toLocaleString('en-US'),
  mil: (v, dp = 0) => (v / 1e6).toFixed(dp) + 'M',
  pct: (v, dp = 0) => v.toFixed(dp) + '%',
  mult: (v, dp = 1) => v.toFixed(dp) + '×',
  day: (iso) => +iso.slice(8, 10) + ' ' + MON[+iso.slice(5, 7) - 1] + ' ' + iso.slice(0, 4)
};
/* a figure's own display if data.js gives one, else ours */
const D = (k, f) => F(k).display || f;

/* a time scale: ISO date or 'YYYY-MM-DD' to x */
const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +(iso.slice(8, 10) || 1));
const tlin = (a, b, x0, x1) => { const s = lin(utc(a), utc(b), x0, x1); return (iso) => s(utc(iso)); };

/* the C mark: a dashed underline under a text node, measured once the type has loaded */
function ours(textNode, col = 'var(--gold)', gap = 12, w = 3) {
  const p = textNode.parentNode, g = el(p, 'g');
  const place = () => { const b = textNode.getBBox(); g.innerHTML = '';
    el(g, 'line', { x1: b.x, x2: b.x + b.width, y1: b.y + b.height + gap - 6, y2: b.y + b.height + gap - 6, stroke: col, 'stroke-width': w, 'stroke-dasharray': '10 7' }); };
  place(); if (document.fonts) document.fonts.ready.then(place);
  return g;
}

/* a company mark laid flat through its own alpha in one ink */
let _mk = 0;
/* invert: a file drawn dark on clear with a light cut-out (Grok's box and slash) is read through its inverted luminance, so the
   dark parts take the ink and the cut-out stays open */
function mark(svg, href, x, y, w, h, col = '#FFFFFF', invert = false) {
  const root = svg.ownerSVGElement || svg, d = root.querySelector('defs') || el(root, 'defs');
  const id = 'mk' + (++_mk);
  const m = el(d, 'mask', { id, maskUnits: 'userSpaceOnUse', x, y, width: w, height: h, style: invert ? 'mask-type:luminance' : 'mask-type:alpha' });
  if (invert && !d.querySelector('#invLum')) {
    const fl = el(d, 'filter', { id: 'invLum', 'color-interpolation-filters': 'sRGB' });
    el(fl, 'feColorMatrix', { type: 'matrix', values: '-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0' });
  }
  el(m, 'image', { href, x, y, width: w, height: h, preserveAspectRatio: 'xMinYMid meet', filter: invert ? 'url(#invLum)' : 'none' });
  return el(svg, 'rect', { x, y, width: w, height: h, fill: col, mask: `url(#${id})` });
}
/* BRAND (the writer, Nebius master v3 note 2; DECISIONS 2026-10-16): each mark in the version its owner sets on a dark ground.
   Tesla's dark-ground wordmark is white, and that is the one we use: its red would read as a loss on a house board, and red means
   loss only (decided 18 Oct for this video). SpaceX, Grok, X, Cursor and Anthropic are white on dark; Google keeps its four colours. */
const LOGO = {
  tesla: ['assets/logos/logo-tesla-wordmark.png', 2000 / 261],
  spacex: ['assets/logos/logo-spacex-wordmark.png', 2400 / 296],
  grok: ['assets/logos/logo-grok.png', 1600 / 547, true],
  x: ['assets/logos/logo-x.png', 2000 / 1807],
  cursor: ['assets/logos/logo-cursor.png', 1],
  anthropic: ['assets/logos/logo-anthropic.png', 1],
  amazon: ['assets/logos/logo-amazon_white.png', 6110 / 2047],              // the library's white file (09's rank step)
  nvidia: ['assets/logos/logo-nvidia.png', 1, false, '#76B900']               // the eye, laid in Nvidia's own green (as on Nebius)
};
/* drawn from the owner's own geometry: Microsoft's four panes (23-unit grid); Apple's mark (simple-icons, 24-unit box) */
const MS4 = ['#F25022', '#7FBA00', '#00A4EF', '#FFB900'];
const APPLE = 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';
const GOOGLE_G = [['#EA4335', 'M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'],
  ['#4285F4', 'M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z'],
  ['#FBBC05', 'M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'],
  ['#34A853', 'M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z']];
/* logo(parent, name, x, y, h): returns a group; the mark's width is h times its own ratio (logoW) */
const logoW = (name, h) => (name === 'google' || name === 'microsoft' || name === 'apple') ? h : h * LOGO[name][1];
function logo(p, name, x, y, h, col = '#FFFFFF') {
  const g = el(p, 'g');
  if (name === 'google') { const k = el(g, 'g', { transform: `translate(${x},${y}) scale(${h / 48})` });
    GOOGLE_G.forEach(([f, d]) => el(k, 'path', { d, fill: f })); return g; }
  if (name === 'microsoft') { const k = el(g, 'g', { transform: `translate(${x},${y}) scale(${h / 23})` });
    [[1, 1], [12, 1], [1, 12], [12, 12]].forEach(([a, b], i) => el(k, 'rect', { x: a, y: b, width: 10, height: 10, fill: MS4[i] })); return g; }
  if (name === 'apple') { el(el(g, 'g', { transform: `translate(${x},${y}) scale(${h / 24})` }), 'path', { d: APPLE, fill: col }); return g; }
  const [href, r, inv, own] = LOGO[name]; mark(g, href, x, y, h * r, h, own || col, !!inv); return g;
}

/* a dimension line (drafting grammar): extension ticks at both ends */
function dim(p, x1, y1, x2, y2, col = 'rgba(245,241,229,.55)', tick = 10) {
  const g = el(p, 'g', { stroke: col, 'stroke-width': 2, fill: 'none' });
  el(g, 'line', { x1, y1, x2, y2 });
  const a = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2, dx = Math.cos(a) * tick, dy = Math.sin(a) * tick;
  el(g, 'line', { x1: x1 - dx, y1: y1 - dy, x2: x1 + dx, y2: y1 + dy });
  el(g, 'line', { x1: x2 - dx, y1: y2 - dy, x2: x2 + dx, y2: y2 + dy });
  return g;
}

/* a horizontal gradient that fades a bar's far end: "more than", with no edge drawn where none is sourced */
let _fd = 0;
function fadeEnd(svg, x0, x1, col, dir = 1) {
  const d = svg.querySelector('defs') || el(svg, 'defs'), id = 'fd' + (++_fd);
  const g = el(d, 'linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: x0, x2: x1, y1: 0, y2: 0 });
  el(g, 'stop', { offset: 0, 'stop-color': col, 'stop-opacity': 1 });
  el(g, 'stop', { offset: 1, 'stop-color': col, 'stop-opacity': 0 });
  return `url(#${id})`;
}

/* drawing-sheet corner marks (the house's detail-sheet grammar, Nebius 04 and 10) */
function corners(p, x, y, w, h, c = 22, col = 'var(--cream)') {
  const g = el(p, 'g', { fill: 'none', stroke: col, 'stroke-width': 2 });
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) =>
    el(g, 'path', { d: `M${a + sx * c},${b} H${a} V${b + sy * c}` }));
  return g;
}
