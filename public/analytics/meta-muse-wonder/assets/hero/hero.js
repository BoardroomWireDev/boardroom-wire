/* THE HERO LAYER (Ive, 25 Oct 2026). Shared by the Meta Q3 hero boards (hero-scorecard, hero-revenue, hero-cash).
   Requires GSAP, shared/data.js and shared/motion.js (BW.run gives ?final ?still ?t= ?capture ?beats).

   HERO.fig(key)      a data.js figure (or null; the key is listed as pending and the board shows the key, never a number)
   HERO.say(key)      Meta's own words for a line: data.js `display` first; until the row exists, the verbatim line in the
                      page's WORDS table (each with its call timestamp). ?strict shows the key instead, so a render can
                      prove what still has no row.
   HERO.mark(...)     a real mark, pre-tinted to a brand token (assets/hero/marks/); a missing mark is a dashed slot with
                      its asset name, never a drawn stand-in.
   HERO.camera(g)     a 2D camera on an SVG world group: to(tl, {tx,ty,sx,sy,s}) brings world point (tx,ty) to screen
                      (sx,sy) at scale s, with the scale interpolated on a log curve (a zoom of 100x reads as one move).
                      Moves are planned in build order, so every frame is a pure function of the timeline (seek-safe).
   HERO.brand(tl,end) the channel's marks (see hero.css): ?brand=dim (default), ?brand=end, ?brand=0.
   HERO.credit()      one plain source line from every key the board read (BW.provenance).
   HERO.steps(def)    step times; ?at=t1,t2,... re-times them in order on the VO. */
const HERO = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const qp = new URLSearchParams(location.search);
  const STRICT = qp.has('strict');
  const BRAND = qp.get('brand') || 'dim';
  const F = BW_DATA.figures;
  const used = new Set(), pending = new Set(), wordsPending = new Set();
  let WORDS = {};

  function fig(key) { const f = F[key]; if (f) used.add(key); else pending.add(key); return f || null; }
  function disp(key) { const f = fig(key); return f ? f.display : key; }
  function words(map) { WORDS = map || {}; }
  function say(key) {
    const f = F[key];
    if (f) { used.add(key); return f.display; }
    wordsPending.add(key);
    if (STRICT || !WORDS[key]) return key;
    return WORDS[key].text;
  }
  const isPending = (key) => !F[key];

  function mk(tag, attrs = {}, parent = null, text = null) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  /* marks on disk (assets/hero/marks/<name>-<tone>.png) and their width/height */
  const EXT = { threads: 'svg' };
  const MARKS = { threads: 0.8604, facebook: 1.0, instagram: 1.0, messenger: 1.0, whatsapp: 0.996, muse: 1.471, x: 1.103,
                  'meta-wordmark': 4.965, 'meta-infinity': 1.506 };
  function mark(parent, name, x, y, h, tone = 'cream', attrs = {}) {
    const ratio = MARKS[name];
    if (!ratio) {                                   /* no real file: a slot named for the asset it waits on */
      pending.add('mark:' + name);
      const g = mk('g', Object.assign({ class: 'mark-slot' }, attrs), parent);
      mk('rect', { x, y, width: h, height: h, rx: h * .18, class: 'pend-box' }, g);
      mk('text', { x: x + h / 2, y: y + h / 2 - 2, 'text-anchor': 'middle', class: 'pend', 'font-size': h * .2 }, g, 'logo-');
      mk('text', { x: x + h / 2, y: y + h / 2 + h * .22, 'text-anchor': 'middle', class: 'pend', 'font-size': h * .2 }, g, name);
      return g;
    }
    return mk('image', Object.assign({ href: `assets/hero/marks/${name}-${tone}.${EXT[name] || 'png'}`, x, y, height: h, width: h * ratio,
                                        preserveAspectRatio: 'xMinYMid meet' }, attrs), parent);
  }
  const markW = (name, h) => (MARKS[name] || 1) * h;

  /* text that wraps to a width (approximate: Inter at ~0.5em a character) */
  function wrap(parent, str, x, y, size, maxW, cls, attrs = {}, lh = 1.22) {
    const t = mk('text', Object.assign({ x, y, class: cls, 'font-size': size }, attrs), parent);
    const per = Math.max(8, Math.floor(maxW / (size * .5)));
    const lines = []; let line = '';
    String(str).split(' ').forEach(w => { if ((line + ' ' + w).trim().length > per && line) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) lines.push(line);
    lines.forEach((l, i) => mk('tspan', { x, dy: i ? size * lh : 0 }, t, l));
    return t;
  }

  /* camera */
  function camera(g) {
    const svg = g.ownerSVGElement;
    let plan = { cx: 960, cy: 540, s: 1 };
    const live = { cx: 960, cy: 540, s: 1 };
    const subs = [];
    function apply(v) {
      live.cx = v.cx; live.cy = v.cy; live.s = v.s;
      g.setAttribute('transform', `translate(960,540) scale(${v.s}) translate(${-v.cx},${-v.cy})`);
      svg.style.setProperty('--s', v.s);
      subs.forEach(f => f(live));
    }
    apply(plan);
    return {
      live, apply,
      onUpdate(f) { subs.push(f); f(live); return this; },
      set(v) { plan = Object.assign({}, plan, v); apply(plan); return this; },
      to(tl, { tx, ty, sx = 960, sy = 540, s }, { at = 0, duration = 1.6, ease = 'power2.inOut' } = {}) {
        const a = Object.assign({}, plan);
        const sb = s === undefined ? a.s : s;
        const p0x = 960 + (tx - a.cx) * a.s, p0y = 540 + (ty - a.cy) * a.s;
        plan = { s: sb, cx: tx - (sx - 960) / sb, cy: ty - (sy - 540) / sb };
        const e = gsap.parseEase(ease);
        const pr = { u: 0 };
        tl.fromTo(pr, { u: 0 }, { u: 1, duration, ease: 'none', immediateRender: false, onUpdate() {
          const k = e(pr.u);
          const sc = a.s * Math.pow(sb / a.s, k);
          const px = p0x + (sx - p0x) * k, py = p0y + (sy - p0y) * k;
          apply({ s: sc, cx: tx - (px - 960) / sc, cy: ty - (py - 540) / sc });
        } }, at);
        return tl;
      }
    };
  }

  /* the channel's marks */
  function brand(tl, endAt) {
    if (BRAND === '0' || BRAND === 'off') return;
    const chrome = document.querySelector('.chrome') || document.querySelector('.stage');
    chrome.querySelectorAll('.hero-brand, .hero-handle').forEach(n => n.remove());
    const b = document.createElement('div'); b.className = 'hero-brand';
    b.innerHTML = '<img src="assets/hero/bw-bust.png" alt=""><span>BOARDROOM<b>WIRE</b></span>';
    const h = document.createElement('div'); h.className = 'hero-handle'; h.textContent = '@BoardroomWire';
    chrome.appendChild(b); chrome.appendChild(h);
    if (BRAND === 'end') { tl.fromTo([b, h], { opacity: 0 }, { opacity: 1, duration: .8, ease: 'power2.out', immediateRender: true }, endAt); return; }
    tl.fromTo([b, h], { opacity: 0 }, { opacity: .32, duration: .6, ease: 'power2.out', immediateRender: true }, .2);
    tl.to([b, h], { opacity: 1, duration: .8, ease: 'power2.out' }, endAt);
  }

  function credit(tl, at = .3) {
    BW.provenance({ uses: Array.from(used) });
    const s = document.querySelector('.bw-source');
    if (s) tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: .7, immediateRender: true }, at);
    const stage = document.querySelector('.stage');
    stage.dataset.pending = Array.from(pending).concat(Array.from(wordsPending).map(k => 'words:' + k)).join(' ');
    if (pending.size || wordsPending.size) console.warn('HERO: no data.js row yet for', stage.dataset.pending);
  }

  function steps(def) {
    const at = qp.get('at');
    const out = Object.assign({}, def);
    if (at) at.split(',').map(Number).forEach((t, i) => { const k = Object.keys(def)[i]; if (k && !isNaN(t)) out[k] = t; });
    return out;
  }

  /* a line of type rising out of its own baseline (the v5 entrance), for SVG text */
  function rise(tl, nodes, at, { dy = 28, dur = .7, stagger = .07 } = {}) {
    const list = Array.isArray(nodes) ? nodes : [nodes];
    list.forEach((n, i) => tl.fromTo(n, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: dur, ease: 'power3.out', immediateRender: true }, at + i * stagger));
    return tl;
  }
  function fade(tl, nodes, at, dur = .6, to = 1) {
    tl.fromTo(nodes, { opacity: 0 }, { opacity: to, duration: dur, ease: 'power2.out', immediateRender: true }, at);
    return tl;
  }
  /* draw a path or line by its length (dash offset) */
  function draw(tl, node, at, dur = 1, ease = 'power2.inOut') {
    const L = node.getTotalLength ? node.getTotalLength() : 1000;
    tl.fromTo(node, { strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDashoffset: 0, duration: dur, ease, immediateRender: true }, at);
    return tl;
  }

  return { NS, qp, STRICT, F, fig, disp, say, words, isPending, mk, mark, markW, wrap, camera, brand, credit, steps, rise, fade, draw,
           used, pending, wordsPending };
})();
