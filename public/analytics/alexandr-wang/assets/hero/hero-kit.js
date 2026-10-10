/* Hero kit (alexandr-wang, Ive, 9 Oct 2026). The step grammar of 11-the-bill.html, shared by the other hero boards so every
   board reveals the same way: calm, one idea per step, each figure lands and holds, nothing overshoots, nothing glows.
   A page draws its final state once, inside named steps; the kit hides everything and plays each step in at its time.

     K.steps([['open', 0.2], ['capex', 5.2], …], 31.2)   the steps in order with their default seconds and the picture length;
                                                          ?at=a,b,c overrides them in order, ?secs= the length (re-timing to the VO)
     K.step('capex')                                      what is drawn next belongs to that step
     K.still()                                            what is drawn next is on screen from frame 0
     K.svg(tag, attrs, style, {as})                       an SVG mark (as: 'line' grow, 'w' width from the left, 'wr' from the
                                                          right, 'h' rise from the base, 'fade', 'none': drawn but animated by the page)
     K.text(x, base, runs, size, {a, cls})                a label: runs is a string or [[text, cls, gap, size], …]; a: '' start, 'm', 'e'
     K.img(href, x, y, w, h, {crop:[sx,sy,sw,sh], iw, ih, r})  a raster (real material), cropped in its own viewport; fades in
     K.play()                                             the timeline: BW.mark per step, every item in at its step's time
     K.rest()                                             the final frame
     K.col('--gold'), K.col('--cream-rgb', .78)            a token as a colour GSAP can tween
   Items of one step enter in drawing order, `gap` seconds apart (default .12); `K.at(name, dt)` delays what follows inside a
   step. Capture contract: the page calls BW.run({ play: K.play, rest: K.rest }). */
const K = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const Q = new URLSearchParams(location.search);
  const plot = document.getElementById('plot'), LABS = document.getElementById('labs');
  const ITEMS = [], STEP = {}, ORDER = [];
  let cur = null, off = 0, END = 0, extra = [];

  function steps(list, secs) {
    const given = (Q.get('at') || '').split(',').filter(s => s.trim() !== '').map(Number);
    list.forEach(([n, t], i) => { STEP[n] = i < given.length ? given[i] : t; ORDER.push(n); });
    END = +(Q.get('secs') || 0) || secs;
    return STEP;
  }
  function step(n) { if (!(n in STEP)) throw new Error('hero-kit: no step ' + n); cur = n; off = 0; }
  function still() { cur = null; }                      /* what follows is drawn from frame 0 (no dead head, gates.json#deadHead) */
  function at(n, dt) { step(n); off = dt; }
  const reg = (node, as, dur) => { ITEMS.push({ node, as, step: cur, off, dur }); off += .12; return node; };

  function svg(tag, a = {}, st = '', o = {}) {
    const n = document.createElementNS(NS, tag);
    for (const k in a) n.setAttribute(k, a[k]);
    if (st) n.setAttribute('style', st);
    (o.parent || plot).appendChild(n);
    const as = o.as || (tag === 'line' ? 'line' : tag === 'rect' ? 'w' : 'fade');
    if (as !== 'none' && cur && !o.parent) reg(n, as, o.dur);
    if (as !== 'none' && o.parent && o.reg) reg(n, as, o.dur);
    n.F = Object.assign({}, a);
    return n;
  }
  function text(x, base, runs, size, o = {}) {
    const d = document.createElement('div');
    d.className = 'hk ' + (o.a || '');
    d.style.left = x + 'px'; d.style.top = (base - .92 * size) + 'px'; d.style.fontSize = size + 'px';
    const m = document.createElement('div'); m.className = 'bw-m'; d.appendChild(m);
    const s = document.createElement('span'); m.appendChild(s);
    (typeof runs === 'string' ? [[runs, o.cls || 'w']] : runs).forEach(([t, c, gap, sz]) => {
      const r = document.createElement('span'); r.className = c; r.textContent = t;
      if (gap) r.style.marginLeft = gap + 'px';
      if (sz) r.style.fontSize = sz + 'px';
      s.appendChild(r);
    });
    LABS.appendChild(d);
    if (cur) reg(s, 'rise', o.dur);
    return s;
  }
  function img(href, x, y, w, h, o = {}) {
    const box = svg('svg', { x, y, width: w, height: h, viewBox: (o.crop || [0, 0, o.iw, o.ih]).join(' '), preserveAspectRatio: 'xMidYMid slice' }, '', { as: 'fade' });
    const i = document.createElementNS(NS, 'image');
    i.setAttribute('href', href); i.setAttribute('width', o.iw); i.setAttribute('height', o.ih);
    box.appendChild(i);
    return box;
  }

  /* hidden and final states per kind */
  const hide = (it) => {
    const n = it.node, F = n.F || {};
    if (it.as === 'rise') gsap.set(n, { yPercent: 130 });
    else if (it.as === 'line') gsap.set(n, { opacity: 0, attr: { x2: F.x1, y2: F.y1 } });    /* hidden too: a round cap draws a dot at length 0 */
    else if (it.as === 'w') gsap.set(n, { attr: { width: 0 } });
    else if (it.as === 'wr') gsap.set(n, { attr: { x: +F.x + +F.width, width: 0 } });
    else if (it.as === 'h') gsap.set(n, { attr: { y: +F.y + +F.height, height: 0 } });
    else gsap.set(n, { opacity: 0 });
  };
  const show = (it) => {
    const n = it.node, F = n.F || {};
    if (it.as === 'rise') gsap.set(n, { yPercent: 0 });
    else if (it.as === 'line') gsap.set(n, { opacity: 1, attr: { x2: F.x2, y2: F.y2 } });
    else if (it.as === 'w' || it.as === 'wr') gsap.set(n, { attr: { x: F.x, width: F.width } });
    else if (it.as === 'h') gsap.set(n, { attr: { y: F.y, height: F.height } });
    else gsap.set(n, { opacity: 1 });
  };
  const DUR = { rise: .75, line: 1.1, w: 1.3, wr: 1.3, h: 1.3, fade: .7 };
  function tween(tl, it, t) {
    const n = it.node, F = n.F || {}, d = it.dur || DUR[it.as];
    if (it.as === 'rise') tl.fromTo(n, { yPercent: 130 }, { yPercent: 0, duration: d, ease: 'power3.out' }, t);
    else if (it.as === 'line') { tl.set(n, { opacity: 1 }, t); tl.fromTo(n, { attr: { x2: F.x1, y2: F.y1 } }, { attr: { x2: F.x2, y2: F.y2 }, duration: d, ease: 'power2.inOut' }, t); }
    else if (it.as === 'w') tl.fromTo(n, { attr: { width: 0 } }, { attr: { width: F.width }, duration: d, ease: 'power2.out' }, t);
    else if (it.as === 'wr') tl.fromTo(n, { attr: { x: +F.x + +F.width, width: 0 } }, { attr: { x: F.x, width: F.width }, duration: d, ease: 'power2.out' }, t);
    else if (it.as === 'h') tl.fromTo(n, { attr: { y: +F.y + +F.height, height: 0 } }, { attr: { y: F.y, height: F.height }, duration: d, ease: 'power2.out' }, t);
    else tl.fromTo(n, { opacity: 0 }, { opacity: 1, duration: d, ease: 'power1.out' }, t);
  }
  /* a page's own moves (a bar that climbs, a colour that turns): fn(tl, t) for play, set() for rest, hidden() for the start */
  function move(name, dt, fn, finalSet, hiddenSet) { extra.push({ name, dt, fn, finalSet, hiddenSet }); }

  function play() {
    const tl = gsap.timeline();
    ITEMS.forEach(hide);
    extra.forEach(e => e.hiddenSet && e.hiddenSet());
    gsap.set('.bw-source', { opacity: 0 });
    ORDER.forEach(n => BW.mark(tl, n, STEP[n]));
    ITEMS.forEach(it => tween(tl, it, STEP[it.step] + it.off));
    extra.forEach(e => e.fn(tl, STEP[e.name] + e.dt));
    tl.to('.bw-source', { opacity: 1, duration: .8 }, STEP[ORDER[0]] + .6);
    tl.to({}, { duration: .01 }, END - .01);
    return tl;
  }
  function rest() {
    ITEMS.forEach(show);
    extra.forEach(e => e.finalSet && e.finalSet());
    gsap.set('.bw-source', { opacity: 1 });
  }
  /* a token resolved to a colour GSAP can tween (it cannot interpolate var()): col('--gold'), col('--cream-rgb', .78) */
  const css = getComputedStyle(document.documentElement);
  const col = (v, a) => { const x = css.getPropertyValue(v).trim(); return a == null ? x : `rgba(${x}, ${a})`; };
  return { steps, step, still, at, svg, text, img, move, play, rest, col, get END() { return END; }, STEP, NS };
})();
