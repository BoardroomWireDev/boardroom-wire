/* BOARDROOM WIRE — FLAGSHIP helpers (anthropic-ipo 20–23, 2 Oct 2026). Needs motion.js (BW) and data.js.
     FX.head(kick, title)        the header (writer's words) + the hairline
     FX.meta(qTop, figId, qBot, {inputs})  the header's hero figure + its provenance chip
     FX.sig()                    the wordmark (?brand=0 hides it)
     FX.headIn(tl, at)           the header's reveal
     FX.hover(node, key, html)   tooltip + dim-the-rest on hover (web only)
     FX.tipFor(id, extra)        standard tooltip HTML for one data.js figure
     FX.qual(id)                 the figure with its data.js qualifier ("up to $84.5B")
     FX.logo(key, name, {bare})  a company's mark + name (assets/logos/logo-<key>.png); falls back to the name alone
     FX.chip(id)                 the hero figure's source in plain words, rendered from data.js (used by FX.meta)
     FX.VIDEO                    ?video=1: the board as it goes in the video (rule 16): no wordmark, no web controls,
                                 no hover, and every node marked .fx-web (a label that is not a figure, a name, a date
                                 or the writer's verbatim line) is dropped
     FX.tour(panels, {at, secs})  opt-in recap camera (?tour=1), see the block above `function tour`; a board that does not
                                 call it, or is opened without ?tour=1, is untouched
   Interactivity never runs under ?capture, ?t=, ?still or ?video=1, so captured frames are identical to the reveal.
   Logos (2 Oct 2026): one single-colour treatment. Each file is the mark alone, filled cream with its alpha kept;
   the page draws it into a canvas in its element's own text colour, so the same file is cream on the ground and
   ground on a gold/amber tile (a canvas, not a CSS mask: a mask image is fetched late and a seeked or captured
   frame could paint without it). A missing file leaves the name as text: drop assets/logos/logo-amazon.png (or broadcom, amd)
   in and it appears with no code change. A file that already contains the company's name sets `word: true`. */
const FX = (() => {
  const Q = new URLSearchParams(location.search);
  const VIDEO = Q.get('video') === '1';
  if (Q.get('brand') === '0' || VIDEO) document.documentElement.dataset.nobrand = '';
  if (VIDEO) document.documentElement.dataset.video = '';
  const stage = () => document.querySelector('.stage');
  const TOUR = Q.get('tour') === '1';
  if (TOUR) document.documentElement.dataset.tour = '';
  const LIVE = !BW.CAPTURE && BW.SEEK === undefined && !BW.STILL && !VIDEO && !TOUR;
  if (!LIVE) document.documentElement.dataset.fxstatic = '';   /* seeks and captures: no CSS transitions racing the timeline */

  /* ---- logos ---- */
  const LOGO_DIR = 'assets/logos/';
  /* s: optical size against the name's cap height; dy: a nudge down (em) for a mark whose letters sit high in
     its file (Amazon's smile hangs below the word); word: the file already carries the name */
  /* the wordmarks (Amazon, Broadcom, AMD, Meta) carry the name, so it is not set beside them;
     Amazon, Broadcom and AMD came in DELIVERY-010 (3 Oct); Morningstar stays text on 22 (its
     thin logotype does not read at label size) */
  const LOGO = { anthropic: { s: .82 }, google: { s: 1.0 }, xai: { s: 1.0 }, microsoft: { s: .86 },
                 amazon: { s: 1.42, dy: .14, word: true }, broadcom: { s: 1.12, word: true }, amd: { s: .92, word: true },
                 meta: { s: 1.08, word: true } };
  const LOADED = {};
  const LOGOS_READY = Promise.all(Object.keys(LOGO).map(k => new Promise(res => {
    const im = new Image();
    im.onload = () => { if (im.naturalWidth) LOADED[k] = im; res(); };
    im.onerror = () => res();
    im.src = LOGO_DIR + 'logo-' + k + '.png';
  })));
  function logo(key, name, opts = {}) {
    return `<span class="fx-lg" data-logo="${key}"${opts.bare ? ' data-bare' : ''}><canvas class="fx-mk"></canvas><span class="fx-nm">${name}</span></span>`;
  }
  function applyLogos() {
    document.querySelectorAll('[data-logo]').forEach(n => {
      const k = n.dataset.logo, im = LOADED[k], L = LOGO[k] || {};
      if (!im) return;                           /* no file: the name stays as text */
      const mk = n.querySelector('.fx-mk'), ar = im.naturalWidth / im.naturalHeight;
      mk.style.setProperty('--ar', ar); mk.style.setProperty('--s', L.s || 1); if (L.dy) mk.style.setProperty('--dy', L.dy + 'em');
      n.classList.add('has');                    /* lay it out first, then draw at 3x its CSS size (4K renders at 2x) */
      const H = Math.max(24, Math.round((mk.getBoundingClientRect().height || 24) * 3)); mk.height = H; mk.width = Math.round(H * ar);
      const c = mk.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(im, 0, 0, mk.width, H);
      c.globalCompositeOperation = 'source-in';  /* keep the mark's alpha, take the element's colour */
      c.fillStyle = getComputedStyle(mk).color; c.fillRect(0, 0, mk.width, H);
      n.classList.add('has');
      if (L.word || n.hasAttribute('data-bare')) n.classList.add('bare');
    });
  }

  /* ---- the hero figure's provenance chip: the source in plain words, from data.js ---- */
  /* a calculated figure (tier C) names where its inputs came from when the board passes them: "Boardroom Wire
     calculation from Anthropic announcements and CNBC" */
  function chip(id, inputs) {
    const f = BW.fig(id);
    let t;
    if (f.mandatory) { t = f.mandatory.replace(/^Anthropic's\s+/, ''); t = t[0].toUpperCase() + t.slice(1); }
    else t = credit(id).replace(/\.$/, '');
    if (f.tier === 'C' && inputs && inputs.length) {
      const names = [...new Set(inputs.map(i => BW.src(BW.fig(i).src).name))];
      t += ' from ' + (names.length < 3 ? names.join(' and ') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);
    }
    return `<span class="fx-chip">${t}</span>`;
  }

  /* the board starts once the logos have answered (a missing file answers at once; 2.5 s cap), so a captured
     frame never shows a name that becomes a mark a moment later. The chips join .bw-prov here, after the board's
     BW.provenance() has claimed the real credit block: they are the credit, and `bw words` reads them as such. */
  const _run = BW.run;
  BW.run = (api) => Promise.race([LOGOS_READY, new Promise(r => setTimeout(r, 2500))]).then(() => {
    applyLogos();
    document.querySelectorAll('.fx-chip').forEach(c => c.classList.add('bw-prov'));
    return _run(api);
  });

  function head(kick, title, opts = {}) {
    const h = BW.el('div', 'fx-head', stage());
    const k = opts.logo ? logo(opts.logo, kick) : kick;
    h.innerHTML = `<div class="bw-m"><span class="fx-kick" id="fxKick">${k}</span></div>` +
                  `<div class="bw-m"><span class="fx-title" id="fxTitle">${title}</span></div>`;
    BW.el('div', 'fx-hair', stage()).id = 'fxHair';
    return h;
  }
  function meta(qTop, id, qBot, opts = {}) {
    const m = BW.el('div', 'fx-meta', stage());
    m.innerHTML = (qTop ? `<div class="bw-m"><span class="q" id="fxMq1">${qTop}</span></div>` : '') +
                  `<div class="bw-m"><span class="vr" id="fxMv">${chip(id, opts.inputs)}<span class="v">${BW.val(id)}</span></span></div>` +
                  (qBot ? `<div class="bw-m"><span class="q" id="fxMq2">${qBot}</span></div>` : '');
    return m;
  }
  function sig() { const s = BW.el('div', 'fx-sig', stage()); s.innerHTML = 'BOARDROOM<b>WIRE</b>'; s.id = 'fxSig'; return s; }

  function headIn(tl, at = 0, k = 1) {   /* k < 1 plays it faster (the recap's pull-back); k = 1 is the board's own */
    gsap.set(['#fxKick', '#fxTitle', '#fxMq1', '#fxMv', '#fxMq2'].filter(s => document.querySelector(s)), { yPercent: 105 });
    gsap.set('#fxHair', { scaleX: 0 }); gsap.set('#fxSig', { opacity: 0 }); gsap.set('.bw-source', { opacity: 0 });
    BW.maskIn(tl, '#fxKick', at, .55 * k);
    BW.maskIn(tl, '#fxTitle', at + .12 * k, .7 * k);
    tl.to('#fxHair', { scaleX: 1, duration: 1.0 * k, ease: 'power3.inOut' }, at + .2 * k);
    ['#fxMq1', '#fxMv', '#fxMq2'].forEach((s, i) => { if (document.querySelector(s)) BW.maskIn(tl, s, at + (.35 + i * .12) * k, .6 * k); });
    tl.to('#fxSig', { opacity: 1, duration: .6 * k }, at + .6 * k);
  }
  function headRest() {
    gsap.set(['#fxKick', '#fxTitle', '#fxMq1', '#fxMv', '#fxMq2'].filter(s => document.querySelector(s)), { yPercent: 0 });
    gsap.set('#fxHair', { scaleX: 1 }); gsap.set('#fxSig', { opacity: 1 }); gsap.set('.bw-source', { opacity: 1 });
  }


  /* ---- the recap camera: ?tour=1&at=t1,t2,…&secs=S  (boards 20–23 as chapter recaps, with ?video=1) ----
       FX.tour(panels, { at:[…], secs:S, fill:.8, max:2.6, sy:505, glide:1.15, pull:1.4, lead:.2 }) is called once, after
       the board's DOM (and its BW.provenance) exists. panels: [{ name, x, y, w, h, fill?, max?, clip?, nodes? }] in stage px,
       in the order the camera visits them; x/y/w/h is what the camera frames.
       Tour off (no ?tour=1): returns an identity helper; nothing is wrapped, no class, no timing changes.
       Tour on (3 Oct refinement):
         layers      every board node is put in its panel's layer (auto: the panel whose rect holds the node's centre;
                     panel.nodes overrides), so a panel shows or hides as one piece and no edge ever cuts a glyph.
                     Only the panels in play are visible: the one on camera, and on a glide the one it leaves (fading
                     out between 55% and 95% of the glide) and the one it reaches (fading in over the first quarter, as it builds).
         the window  a clip: the panel's rect unioned with its content's measured box (+14 px), so a panel's own glyphs
                     are never clipped. On a glide it morphs with the camera: the edges that grow move in the first 30%,
                     the edges that shrink in the last 7% (after the panel left has gone), so it always holds both panels in play.
         the camera  a power2.inOut glide in log scale with a small lift (a pull-out in proportion to the distance), so
                     the move reads as one camera travelling, not two crops swapping. Frame 0 sits on panel 1.
         ?visit=k    visit panels 1..k only; the rest build during the pull-back (absent: every panel).
       pull-back   at secs-1.8 a 1.4 s glide to the whole board; the window opens, every panel fades back in, and the
                     header is built across it. ?back=S sets the pull-back's start from the end.
         ?panel=N&hold=1   the camera sits on panel N for the whole clip (the close's callbacks); only panel N is
                     visible and revealed; no header.
       The board's reveal is cut into one section per panel. A section asks the helper for its clock:
         const u = T.sec(i, o0, K, o1);  if (u) { …tl.to(x, {…}, u(t)) … }
       u maps the section's own default times (o0 its first, o1 when its last move ends; K squeezes its spacing) to when
       panel i is on camera: it starts once the glide has brought 85% of the panel into frame (`lead` at the
       soonest) and, when o1 is given, is squeezed further if needed
       so it is complete at least 0.6 s before the camera leaves (T.done(i)). With the tour off u(t) is t, so default
       timelines are bit-identical. u is null for a section a held tour does not show. T.head(tl) measures the panels and
       builds the header (at 0 normally, across the pull-back on a tour, never when held); T.end(tl) pads to secs;
       T.rest() / T.restHead() are the ?final / rest() counterparts. Labels: tour2…tourN (glide starts) and tourback. */
  function tour(panels, o = {}) {
    const n = panels.length;
    const T = { on: TOUR, n, panels };
    if (!TOUR) {
      T.hold = false; T.secs = 0; T.back = 0;
      T.sec = () => (t) => t;
      T.head = (tl) => headIn(tl, 0);
      T.run = T.end = T.rest = () => {}; T.restHead = () => headRest();
      T.cam = null; T.frame = () => null; T.at = []; T.done = () => Infinity;
      return T;
    }
    const num = (k) => (Q.get(k) || '').split(',').filter(x => x.trim() !== '').map(Number);
    const given = num('at'), dflt = o.at || [];
    T.at = [0]; for (let i = 1; i < n; i++) T.at.push(i - 1 < given.length ? given[i - 1] : (dflt[i - 1] !== undefined ? dflt[i - 1] : T.at[i - 1] + 4));
    /* ?visit=k (edit session, 3 Oct): the tour visits only panels 1..k, then pulls back; the panels it skips build during the
       pull-back (the board still arrives whole). Absent, k = n and every line below behaves exactly as before. */
    const NV = Math.max(1, Math.min(n, +(Q.get('visit') || n))); T.nv = NV;
    for (let i = NV; i < n; i++) T.at[i] = 1e9;
    T.hold = Q.get('hold') === '1';
    T.pn = T.hold ? Math.max(0, Math.min(n - 1, (+(Q.get('panel') || 1)) - 1)) : -1;
    T.secs = +(Q.get('secs') || 0) || o.secs || (T.at[NV - 1] + 6);
    const BACK = +(Q.get('back') || 0) || 1.8;
    T.back = Math.max(T.at[NV - 1] + 1.6, T.secs - BACK);
    T.glide = o.glide || 1.15; T.pull = o.pull || 1.4; T.lead = o.lead !== undefined ? o.lead : .2;

    /* the wrapper: everything but the credit layer rides the camera */
    const st = stage(), wrap = BW.el('div', 'fx-cam', null);
    [...st.children].forEach(c => { if (!c.classList.contains('chrome')) wrap.appendChild(c); });
    st.insertBefore(wrap, st.firstChild);

    /* ---- layers: each board node joins its panel's layer ---- */
    const HEAD = ['fx-head', 'fx-hair', 'fx-meta', 'fx-sig', 'fx-tip'];
    const cand = [];
    [...wrap.children].forEach(c => {
      if (HEAD.some(h => c.classList.contains(h))) return;
      if (c.id === 'world') [...c.children].forEach(g => cand.push(g)); else cand.push(c);
    });
    const SVGNS = 'http://www.w3.org/2000/svg';
    const box = (el) => {   /* the node's box in stage px; an svg or an empty container is the union of what it draws */
      const sr = st.getBoundingClientRect(), k = sr.width / 1920 || 1;
      const r0 = el.getBoundingClientRect();
      const list = (el.namespaceURI === SVGNS || r0.width * r0.height === 0)
        ? [...el.querySelectorAll('*')].filter(e => !e.closest('defs, marker, clipPath')) : [el];
      let b = null;
      list.forEach(e => {
        const r = e.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const x0 = (r.left - sr.left) / k, y0 = (r.top - sr.top) / k, x1 = (r.right - sr.left) / k, y1 = (r.bottom - sr.top) / k;
        b = b ? [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)] : [x0, y0, x1, y1];
      });
      return b;
    };
    const R = panels.map(p => [p.x, p.y, p.x + p.w, p.y + p.h]);
    const member = new Map();
    panels.forEach((p, i) => { if (p.nodes) [].concat(typeof p.nodes === 'function' ? p.nodes() : p.nodes).forEach(nd => nd && member.set(nd, i)); });
    cand.forEach(c => {
      if (member.has(c)) return;
      const b = box(c); if (!b) return;
      const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      let best = -1, bd = Infinity;
      R.forEach((r, i) => {
        const d = Math.hypot(Math.max(r[0] - cx, 0, cx - r[2]), Math.max(r[1] - cy, 0, cy - r[3]));
        if (d < bd) { bd = d; best = i; }
      });
      member.set(c, best);
    });
    const LAY = panels.map(() => []);
    const layerIn = new Map();   /* parent → its layer per panel */
    cand.forEach(c => {
      if (!member.has(c)) return;
      const i = member.get(c), par = c.parentNode;
      if (!layerIn.has(par)) layerIn.set(par, []);
      const ls = layerIn.get(par);
      if (!ls[i]) { ls[i] = BW.el('div', 'fx-layer', par); ls[i].dataset.panel = i + 1; LAY[i].push(ls[i]); }
      ls[i].appendChild(c);
    });
    T.layers = LAY;
    T.members = (i) => [...member].filter(([, j]) => j === i).map(([nd]) => nd);

    T.frame = (p) => {
      const fill = p.fill || o.fill || .8, cap = p.max || o.max || 2.6, sy = o.sy || 505;
      const s = Math.min(1920 * fill / p.w, 1080 * fill / p.h, cap);
      return { s, cx: p.x + p.w / 2, cy: p.y + p.h / 2 + (540 - sy) / s };
    };
    const F = panels.map((p) => {
      const c = p.clip || [p.x - 16, p.y - 16, p.x + p.w + 16, p.y + p.h + 16];
      return Object.assign(T.frame(p), { x0: c[0], y0: c[1], x1: c[2], y1: c[3] });
    });
    T.F = F;
    const WHOLE = { s: 1, cx: 960, cy: 540, x0: -1e4, y0: -1e4, x1: 1e4, y1: 1e4 };
    /* the window follows the content: measured once the fonts and marks are in (T.head runs first in play()) */
    let measured = false;
    function measure() {
      if (measured) return; measured = true;
      const keep = { t: wrap.style.transform, c: wrap.style.clipPath };
      wrap.style.transform = 'none'; wrap.style.clipPath = 'none';
      F.forEach((f, i) => T.members(i).forEach(nd => {
        const b = box(nd); if (!b) return;
        f.x0 = Math.min(f.x0, b[0] - 14); f.y0 = Math.min(f.y0, b[1] - 14); f.x1 = Math.max(f.x1, b[2] + 14); f.y1 = Math.max(f.y1, b[3] + 14);
      }));
      wrap.style.transform = keep.t; wrap.style.clipPath = keep.c;
    }

    T.cam = BW.camera(wrap, T.hold ? F[T.pn] : F[0]);
    const v = T.cam.v;
    const clamp = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
    const io2 = (q) => q < .5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q);      /* power2.inOut */
    const sm = (q) => { q = clamp(q); return q * q * (3 - 2 * q); };           /* smoothstep */
    const lerp = (a, b, e) => a + (b - a) * e;
    function camMix(A, B, e, lift) {
      const s = Math.exp(lerp(Math.log(A.s), Math.log(B.s), e)) / (1 + lift * Math.sin(Math.PI * e));
      return { s, cx: lerp(A.cx, B.cx, e), cy: lerp(A.cy, B.cy, e) };
    }
    const liftOf = (A, B) => Math.min(.2, Math.hypot(B.cx - A.cx, B.cy - A.cy) * Math.sqrt(A.s * B.s) / 1920 * .22);
    /* the window on a glide: growing edges early, shrinking edges late, so it always holds both panels in play */
    function winMix(A, B, q) {
      const g = sm(q / .3), h = sm((q - .93) / .07);
      const e = (a, b, grows) => lerp(a, b, grows ? g : h);
      return { x0: e(A.x0, B.x0, B.x0 < A.x0), y0: e(A.y0, B.y0, B.y0 < A.y0), x1: e(A.x1, B.x1, B.x1 > A.x1), y1: e(A.y1, B.y1, B.y1 > A.y1) };
    }
    /* the whole state at time t: camera, window, each panel's opacity */
    function pose(t) {
      const op = panels.map(() => 0);
      if (T.hold) { op[T.pn] = 1; return { c: F[T.pn], w: F[T.pn], op }; }
      if (t >= T.back) {
        const q = clamp((t - T.back) / T.pull);
        panels.forEach((_, i) => { op[i] = i === T.nv - 1 ? 1 : sm((q - .25) / .6); });   /* the board assembles as the camera settles */
        return { c: camMix(F[T.nv - 1], WHOLE, io2(q), 0), w: WHOLE, op };   /* from the last panel visited (?visit; else the last) */
      }
      let i = 0; for (let k = 1; k < n; k++) if (t >= T.at[k]) i = k;
      const q = i ? (t - T.at[i]) / T.glide : 1;
      if (q >= 1) { op[i] = 1; return { c: F[i], w: F[i], op }; }
      const A = F[i - 1], B = F[i];
      op[i - 1] = 1 - sm((q - .55) / .4); op[i] = sm(q / .25);   /* the panel left is gone before the window's shrinking edges move */
      return { c: camMix(A, B, io2(q), liftOf(A, B)), w: winMix(A, B, q), op };
    }
    let lastOp = null;
    function render(t) {
      const p = pose(t);
      v.s = p.c.s; v.cx = p.c.cx; v.cy = p.c.cy;
      T.cam.apply();
      const w = p.w, open = w.x0 <= 0 && w.y0 <= 0 && w.x1 >= 1920 && w.y1 >= 1080;
      wrap.style.clipPath = open ? 'none' : `inset(${Math.max(0, w.y0)}px ${Math.max(0, 1920 - w.x1)}px ${Math.max(0, 1080 - w.y1)}px ${Math.max(0, w.x0)}px)`;
      p.op.forEach((a, i) => {
        if (lastOp && lastOp[i] === a) return;
        LAY[i].forEach(l => { l.style.opacity = a >= .999 ? '' : a.toFixed(3); l.style.visibility = a <= .001 ? 'hidden' : ''; });
      });
      lastOp = p.op;
    }
    T.render = render;
    render(0);

    T.leave = (i) => T.hold ? T.secs : (i < NV - 1 ? T.at[i + 1] : T.back);
    /* a panel starts to build once the glide has brought 85% of it into frame (never sooner than `lead`), so nothing
       draws itself half off the edge of the picture */
    const inFrame = (i) => {
      const p = panels[i], A = F[i - 1], B = F[i], L = liftOf(A, B);
      for (let q = 0; q <= 1.0001; q += .02) {
        const c = camMix(A, B, io2(q), L), hw = 960 / c.s, hh = 540 / c.s;
        const ix = Math.max(0, Math.min(p.x + p.w, c.cx + hw) - Math.max(p.x, c.cx - hw));
        const iy = Math.max(0, Math.min(p.y + p.h, c.cy + hh) - Math.max(p.y, c.cy - hh));
        if (ix * iy >= .85 * p.w * p.h) return q;
      }
      return 1;
    };
    T.start = (i) => T.hold ? .05 : (i === 0 ? .05 : i >= NV ? T.back + .1 : T.at[i] + Math.max(T.lead, inFrame(i) * T.glide - .05));
    T.done = (i) => i >= NV ? T.back + T.pull * .8 : T.leave(i) - .6;
    T.sec = (i, o0 = 0, K = 1, o1) => {
      if (T.hold && i !== T.pn) return null;
      const start = T.start(i);
      if (o1 !== undefined && !T.hold && o1 > o0) K = Math.max(i >= NV ? .05 : .45, Math.min(K, (T.done(i) - start) / (o1 - o0)));
      return (t) => Math.max(0, start + (t - o0) * K);
    };
    T.head = (tl) => {
      measure();
      if (T.hold) { headHide(); return; }
      headIn(tl, T.back + T.pull * .4, .8);   /* the header rises once the camera is nearly whole, never cut by the frame; at rest before the last frame */
    };
    T.run = (tl) => {
      lastOp = null; render(0);
      if (!T.hold) {
        for (let i = 1; i < NV; i++) BW.mark(tl, 'tour' + (i + 1), T.at[i]);
        BW.mark(tl, 'tourback', T.back);
      }
      const drv = { t: 0 };
      tl.fromTo(drv, { t: 0 }, { t: T.secs, duration: T.secs, ease: 'none', immediateRender: false, onUpdate: () => render(drv.t) }, 0);
    };
    T.end = (tl) => { tl.to({}, { duration: .01 }, T.secs - .01); };
    T.rest = () => { measure(); lastOp = null; render(T.hold ? 0 : T.secs + 10); };
    T.restHead = () => { if (T.hold) headHide(); else headRest(); };
    return T;
  }

  /* the header and credit start hidden (what headIn sets) and are left hidden: a held tour never shows them */
  function headHide() {
    gsap.set(['#fxKick', '#fxTitle', '#fxMq1', '#fxMv', '#fxMq2'].filter(s => document.querySelector(s)), { yPercent: 105 });
    gsap.set('#fxHair', { scaleX: 0 }); gsap.set('#fxSig', { opacity: 0 });
  }

  /* the tooltip */
  let tip = null;
  function tipEl() { if (!tip) { tip = BW.el('div', 'fx-tip', stage()); } return tip; }
  function xy(e) {
    const r = stage().getBoundingClientRect(), k = r.width / 1920;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  }
  function place(e) {
    const t = tipEl(), p = xy(e), w = t.offsetWidth, h = t.offsetHeight;
    let x = p.x + 22, y = p.y + 22;
    if (x + w > 1880) x = p.x - w - 22;
    if (y + h > 1040) y = p.y - h - 22;
    t.style.left = Math.max(20, x) + 'px'; t.style.top = Math.max(20, y) + 'px';
  }
  /* ?hover=<key> (preview/poster hook): after the board settles, rest the pointer on the first node with that key */
  const REG = [];
  if (Q.get('hover')) setTimeout(() => {
    const r = REG.find(x => x.key === Q.get('hover')); if (!r) return;
    const b = r.node.getBoundingClientRect();
    r.node.dispatchEvent(new MouseEvent('mouseenter', { clientX: b.left + b.width * .5, clientY: b.top + b.height * .5 }));
  }, +(Q.get('hoverAt') || 1500));
  function hover(node, key, html) {
    if (!LIVE || !node) return;
    REG.push({ node, key });
    node.classList.add('fx-hit');
    node.addEventListener('mouseenter', (e) => {
      const st = stage(); st.classList.add('fx-focus');
      st.querySelectorAll('[data-k]').forEach(n => n.classList.toggle('fx-on', (n.dataset.k || '').split(' ').includes(key)));
      if (html) { const t = tipEl(); t.innerHTML = typeof html === 'function' ? html() : html; t.classList.add('on'); place(e); }
    });
    node.addEventListener('mousemove', (e) => { if (html) place(e); });
    node.addEventListener('mouseleave', () => {
      const st = stage(); st.classList.remove('fx-focus'); st.querySelectorAll('.fx-on').forEach(n => n.classList.remove('fx-on'));
      if (tip) tip.classList.remove('on');
    });
  }

  /* one figure's qualifier, from data.js notes that are a plain qualifier */
  const QUAL = ['up to', 'more than', 'at least', 'as much as', 'over', 'about', 'nearly'];
  function qualOf(id) {
    const n = (BW.fig(id).note || '').split(';')[0].trim();
    return QUAL.includes(n) ? n : '';
  }
  function qual(id) { const q = qualOf(id); return (q ? q + ' ' : '') + BW.val(id); }
  function credit(id) {
    const f = BW.fig(id), s = BW.src(f.src);
    if (f.mandatory) return f.mandatory + '.';
    return ({ P: 'Source: ', R: 'Reported by ', E: 'Estimate: ', C: '' }[f.tier] || '') + (f.tier === 'C' ? 'Boardroom Wire calculation.' : s.name + '.');
  }
  function tipFor(id, opts = {}) {
    const f = BW.fig(id), q = qualOf(id);
    return `<div class="n">${opts.name || f.label || ''}</div>` +
           `<div class="v">${q ? `<small>${q}</small>` : ''}${BW.val(id)}</div>` +
           (opts.meta ? `<div class="m">${opts.meta}</div>` : '') +
           `<div class="s">${opts.credit || credit(id)}</div>`;
  }

  /* CSS custom property → rgb() string, for SVG fills set from JS */
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();

  return { LIVE, VIDEO, TOUR, tour, headHide, head, meta, sig, headIn, headRest, hover, tipFor, qual, qualOf, credit, css, xy, logo, chip };
})();
