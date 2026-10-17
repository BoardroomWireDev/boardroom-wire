/* Nebius heroes: the runtime every hero board shares (Ive, 13 Oct 2026). Load after GSAP, shared/data.js (Davinci's, derived
   from the ledger), shared/motion.js and ../style-frames/sf.js (plus iso.js, dc-model.js, chips.js where a board draws).

   One clock. A board builds its whole drawing once, registers how each part enters and leaves as a pure function of board
   time t, and HERO.run() hands BW.run a GSAP timeline that tweens t from 0 to END and labels every step. So ?t=label, ?capture,
   ?still, ?final and ?beats all draw exactly the same frame for the same t, and a re-render is identical (the Alexandr Wang
   board 42 pattern).

   Steps land on the voice's words: HERO.steps([[name, seconds], …], secs) with the defaults from the script at 150 words a
   minute (until the VO is recorded); ?at=a,b,c re-times them in order and ?secs= sets the length (Davinci, from vo-words.json).

   Figures come from shared/data.js through sf.js's F() and U() (FIG below reads BW_DATA); every key a board reads with U() goes
   into its credit line, rendered by BW.provenance (one plain line, the house style). Nothing is typed.

   Motion vocabulary (EDITING-FRAMEWORK 12-15): a mark lands, a line draws, type rises; nothing glows, floats or bounces past
   its value. Quantitative marks grow from their own baseline and never overshoot. The camera moves only to follow a fact.

   Footage windows (rule 18): HERO.slot() draws a window's 2 px cream frame just outside the footage rect and its dark ground;
   it wipes open as a line from the centre, then to full height (38-compute's grammar). ?slots=0 is the edit's copy: the frame
   and an empty dark ground the footage covers. Without it the page shows the same thing today (38-compute shows preview stills
   there; these windows have none yet), so the flag only matters once a preview is added. The rects
   and times are published as #bw-slots JSON (stage px at 1920x1080; double for 4K) for Davinci's overlays; receipt cards that
   ride over the board (bw overlay) are listed there too, with the clear area the board keeps for them. */
const FIG = new Proxy({}, { get(_, k) {
  const f = (typeof BW_DATA !== 'undefined') && BW_DATA.figures[k];
  if (!f) return undefined;
  const s = BW_DATA.sources[Array.isArray(f.src) ? f.src[0] : f.src] || {};
  return { v: f.v, u: f.unit, t: f.tier, asOf: f.asOf, on: f.on, lo: f.lo, hi: f.hi, cr: s.name, series: f.series,
    display: f.display, label: f.label };      // the on-screen form and its words, as data.js writes them (facts, 15 Oct)
} });
const NBIS = (FIG.nebius_share_price_daily_from_relisting || {}).series || [];
/* sf.js writes its logo paths for the style-frames folder; a board sits two folders up */
if (typeof LOGO !== 'undefined') for (const k in LOGO) LOGO[k][0] = LOGO[k][0].startsWith('../../../') ? LOGO[k][0].slice(6)
  : LOGO[k][0].replace(/^\.\.\/logos\//, 'assets/logos/');

const HERO = (() => {
  const Q = new URLSearchParams(location.search);
  const SHOW_SLOTS = Q.get('slots') !== '0';
  const K = {}; let NAMES = [], END = 0;

  function steps(list, secs) {
    const AT = (Q.get('at') || '').split(',').filter(s => s.trim() !== '').map(Number);
    list.forEach(([n, t], i) => { K[n] = i < AT.length ? AT[i] : t; });
    NAMES = list.map(x => x[0]);
    END = +(Q.get('secs') || 0) || secs;
    return K;
  }
  const clamp = (u) => u < 0 ? 0 : u > 1 ? 1 : u;
  const ease = {
    io: (u) => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    out: (u) => 1 - Math.pow(1 - u, 3),
    s: (u) => u * u * (3 - 2 * u),
    lin: (u) => u
  };
  const go = (t, a, b, e = ease.io) => a === Infinity ? 0 : t >= b ? e(1) : t <= a ? e(0) : e(clamp((t - a) / (b - a)));
  const mix = (a, b, u) => a + (b - a) * u;

  const R = [];
  const on = (fn) => { R.push(fn); return fn; };
  /* wrap a node in its own group, so a reveal's transform never fights the node's own */
  function wrap(n) {
    if (n.__hw) return n.__hw;
    const g = document.createElementNS(NS, 'g');
    n.parentNode.insertBefore(g, n); g.appendChild(n); n.__hw = g; return g;
  }
  /* visible between a (fade in over d) and b (fade out over d2); b omitted: stays */
  function show(n, a, d = .45, b = Infinity, d2 = .35, to = 1) {
    on((t) => { const u = go(t, a, a + d, ease.out) * (1 - go(t, b, b + d2, ease.io)) * to; n.setAttribute('opacity', u.toFixed(3)); n.style.display = u < .002 ? 'none' : ''; });
    return n;
  }
  const fade = (n, a, d = .45, to = 1) => show(n, a, d, Infinity, .35, to);
  /* type and marks rise into place (no blur, no bounce) */
  function rise(n, a, d = .55, dy = 18, b = Infinity, d2 = .35) {
    const g = wrap(n);
    on((t) => { const u = go(t, a, a + d, ease.out), o = u * (1 - go(t, b, b + d2, ease.io));
      g.setAttribute('transform', `translate(0,${(dy * (1 - u)).toFixed(2)})`); g.setAttribute('opacity', o.toFixed(3)); g.style.display = o < .002 ? 'none' : ''; });
    return n;
  }
  /* a stroke draws along its length; a filled shape's fill comes in once the outline is nearly closed */
  function draw(n, a, d = .8, e = ease.io) {
    const nodes = n.tagName === 'g' ? [...n.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse')] : [n];
    nodes.forEach(x => {
      const dash = x.getAttribute('stroke-dasharray'), fill = x.getAttribute('fill');
      if (dash && dash !== 'none') { on((t) => x.setAttribute('opacity', go(t, a, a + d, e).toFixed(3))); return; }   // a dashed line fades (wipe it to draw it)
      x.setAttribute('pathLength', 1);
      on((t) => { const u = go(t, a, a + d, e);
        x.setAttribute('stroke-dasharray', u >= 1 ? 'none' : `${u.toFixed(4)} 1`);
        x.style.display = u <= 0 ? 'none' : '';
        if (fill && fill !== 'none') x.setAttribute('fill-opacity', go(t, a + d * .7, a + d, ease.out).toFixed(3)); });
    });
    return n;
  }
  /* a clipping wipe across a node's own box: dir 'x' (left to right), '-x', 'y' (top down), '-y' (bottom up) */
  let _clip = 0;
  function wipe(n, a, d = .7, dir = 'x', e = ease.io) {
    const g = wrap(n), bb = n.getBBox(), pad = 40, id = 'hw' + (++_clip);
    const cp = el(document.querySelector('svg.hero defs') || el(document.querySelector('svg.hero'), 'defs'), 'clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
    const r = el(cp, 'rect', { x: bb.x - pad, y: bb.y - pad, width: bb.width + 2 * pad, height: bb.height + 2 * pad });
    g.setAttribute('clip-path', `url(#${id})`);
    on((t) => { const u = go(t, a, a + d, e), W = bb.width + 2 * pad, H = bb.height + 2 * pad;
      if (dir === 'x') r.setAttribute('width', W * u);
      else if (dir === '-x') { r.setAttribute('x', bb.x - pad + W * (1 - u)); r.setAttribute('width', W * u); }
      else if (dir === 'y') r.setAttribute('height', H * u);
      else { r.setAttribute('y', bb.y - pad + H * (1 - u)); r.setAttribute('height', H * u); }
      g.style.display = u <= 0 ? 'none' : ''; });
    return n;
  }
  /* a quantitative mark grows from its own baseline (ox, oy) to its true size, never past it */
  function grow(n, a, d = .7, ox = 0, oy = 0, axis = 'y', e = ease.io) {
    const g = wrap(n);
    on((t) => { const u = go(t, a, a + d, e), sx = axis === 'y' ? 1 : u, sy = axis === 'x' ? 1 : u;
      g.setAttribute('transform', `translate(${ox},${oy}) scale(${Math.max(sx, 1e-4)},${Math.max(sy, 1e-4)}) translate(${-ox},${-oy})`);
      g.style.display = u <= 0 ? 'none' : ''; });
    return n;
  }
  /* a move between two offsets; keys [[t, dx, dy, opacity?], …] in time order, eased between */
  function path(n, keys, e = ease.io) {
    const g = wrap(n);
    on((t) => {
      let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
      const A = keys[i], B = keys[Math.min(i + 1, keys.length - 1)], u = B === A ? 1 : go(t, A[0], B[0], e);
      const k = t <= keys[0][0] ? keys[0] : null;
      const dx = k ? k[1] : mix(A[1], B[1], u), dy = k ? k[2] : mix(A[2], B[2], u);
      const o = k ? (k[3] ?? 1) : mix(A[3] ?? 1, B[3] ?? 1, u);
      g.setAttribute('transform', `translate(${dx.toFixed(2)},${dy.toFixed(2)})`); g.setAttribute('opacity', o.toFixed(3)); g.style.display = o < .002 ? 'none' : '';
    });
    return n;
  }
  /* a camera over a world group: keys [[t, cx, cy, s], …]; holds between keys unless the next key is a move */
  function camera(g, keys, e = ease.io) {
    on((t) => {
      let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
      const A = keys[i], B = keys[Math.min(i + 1, keys.length - 1)], u = B === A || t <= A[0] ? 0 : go(t, A[0], B[0], e);
      const cx = mix(A[1], B[1], u), cy = mix(A[2], B[2], u), s = mix(A[3], B[3], u);
      g.setAttribute('transform', `translate(960,540) scale(${s.toFixed(4)}) translate(${(-cx).toFixed(2)},${(-cy).toFixed(2)})`);
    });
  }
  /* a number that steps to its value: only for a figure the voice counts up to; prints with the board's own formatter */
  function count(n, a, d, v0, v1, f, e = ease.out) {
    on((t) => { n.textContent = f(mix(v0, v1, go(t, a, a + d, e))); });
    return n;
  }

  /* footage windows and the clear areas receipt cards ride into */
  const SLOTS = [];
  /* an owed window (no footage yet) is not drawn at all: no frame, no dark ground; the board reads as if it had none (15 Oct,
     the full-VO renders). The page lists its owed windows with H.owed('b048', …); ?noslot=a,b replaces that list (?noslot= with
     nothing shows every window). The window still goes into #bw-slots, marked hidden, so the layout knows it is not on screen. */
  let OWED = new Set();
  const owed = (...ids) => { if (!Q.has('noslot')) ids.forEach(i => OWED.add(i)); };
  if (Q.has('noslot')) OWED = new Set(Q.get('noslot').split(',').map(s => s.trim()).filter(Boolean));
  function slot(p, id, x, y, w, h, open, close, subject = '') {
    if (OWED.has(id)) {
      SLOTS.push({ id, kind: 'footage', subject, hidden: true, rect: { x, y, w, h }, opening: { in: open }, closing: { out: close } });
      return el(p, 'g', { style: 'display:none' });
    }
    const g = el(p, 'g'), ground = el(g, 'rect', { x, y, width: w, height: h, fill: 'rgb(5,5,7)' });
    const frame = el(g, 'rect', { x: x - 2, y: y - 2, width: w + 4, height: h + 4, fill: 'none', stroke: 'rgba(245,241,229,.82)', 'stroke-width': 2 });
    /* the window's ground and frame open and shut on exactly the compositor's curve (pipeline\py\overlay.py window_rect: open
       0.28 s, width then height; shut 0.22 s, height then width; a 2 px line between), so the footage always covers the ground.
       They used to shrink both ways at once over 0.2 s, which left the empty black ground showing for about six frames at
       every shut (58's b107 at 21:09 in the 15 Oct master; facts, 15 Oct). */
    const W = .28, C = .22, LN = 2 / h;
    on((t) => {
      const a = go(t, open, open + W / 2, ease.io), b = go(t, open + W / 2, open + W, ease.io);
      const ch = 1 - go(t, close - C, close - C / 2, ease.io), cw = 1 - go(t, close - C / 2, close, ease.io);
      const sx = a * cw, sy = LN + (1 - LN) * b * ch;
      const vis = t >= open && t <= close && sx > 0;
      g.style.display = vis ? '' : 'none';
      const cx = x + w / 2, cy = y + h / 2;
      g.setAttribute('transform', `translate(${cx},${cy}) scale(${Math.max(sx, 1e-4)},${sy}) translate(${-cx},${-cy})`);
    });
    SLOTS.push({ id, kind: 'footage', subject, rect: { x, y, w, h }, rect_4k: { x: 2 * x, y: 2 * y, w: 2 * w, h: 2 * h }, frame_outset_px: 2,
      opening: { in: open, out: +(open + W).toFixed(3) }, visible_open: { in: +(open + W).toFixed(3), out: +(close - C).toFixed(3) },
      closing: { in: +(close - C).toFixed(3), out: close } });
    return g;
  }
  function card(id, at, until, rect, subject = '') {
    SLOTS.push({ id, kind: 'receipt', subject, at, until, clear: rect });
  }
  /* a footage window dims with the tile it sits in (13 Oct, H1 "a huge step down"): keys [[board s, level 0..1], …], eased
     (in-out) between keys, level 1 outside them. Published on the slot as `dim` so the compositor (pipeline\py\overlay.py)
     multiplies the footage, its hairline and its credit by the same curve the page applies to the tile. */
  function dimSlot(id, keys) {
    const sl = SLOTS.find(x => x.id === id); if (sl) sl.dim = keys.map(([t, l]) => [+t.toFixed(3), l]);
  }

  function paint(t) { for (const f of R) f(t); }
  function run(opts = {}) {
    BW.provenance({ uses: [...used, ...(opts.uses || [])] });
    const s = document.createElement('script'); s.id = 'bw-slots'; s.type = 'application/json';
    s.textContent = JSON.stringify({ page: location.pathname.split('/').pop(), fps: 30, steps: K, secs: END, slots: SLOTS });
    document.body.appendChild(s);
    function play() {
      BW.chromeShow();
      const tl = gsap.timeline(), p = { t: 0 };
      NAMES.forEach(n => BW.mark(tl, n, K[n]));
      tl.to(p, { t: END, duration: END, ease: 'none', onUpdate: () => paint(p.t) }, 0);
      paint(0);
      return tl;
    }
    function rest() { BW.chromeShow(); paint(END); }
    BW.run({ play, rest });
  }
  return { K, steps, go, mix, clamp, ease, on, wrap, show, fade, rise, draw, wipe, grow, path, camera, count, slot, owed, isOwed: (id) => OWED.has(id), card, dimSlot, run, paint,
    get END() { return END; }, SLOTS, SHOW_SLOTS };
})();
