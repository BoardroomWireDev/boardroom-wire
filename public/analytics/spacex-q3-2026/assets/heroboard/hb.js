/* ============================================================
   HERO DASHBOARDS — the shared builder (Ive, 28 Oct 2026). Pages: 69-quarter-dashboard, 83-cases-dashboard,
   89-coreweave-dashboard, 94-cash-dashboard. Load after gsap, shared/data.js and shared/motion.js.

   HB.frame({ co, coH, coY, line })   the house frame: the Boardroom Wire lockup (an image: the mark is a logo, not words on
                                      the board), the subject's own logo and the subject line (an array of short parts, each
                                      its own text, so every part is a name, a date or the script's words); returns the svg
   HB.s(tag, attrs, parent, text)     an SVG node
   HB.t(parent, x, y, parts, o)       a text line; parts = 'text' or [['text', 'cls'], ...]; o = { cls, size, anchor }
   HB.at(defaults)                    step times; ?at=a,b,c re-times them in order from the real take (Davinci)
   HB.run({ steps, end, build })      the page contract through BW.run: R, F, ?final, ?still, ?t=<secs|step>, ?capture, ?beats
   Moves (all tweens on the one timeline, from-states set at build so nothing flashes):
     HB.rise(tl, els, t, d)  HB.fade(tl, els, t, d, to)  HB.grow(tl, el, t, d)  HB.growX(tl, el, t, d)  HB.to(tl, els, vars, t, d)
   HB.C.gold / goldBright / cream / red / grey / ink: the brand tokens, read from :root. HB.C.bg: the ground (url(#hb-ground)).
   Hatches: url(#hb-h-gold) url(#hb-h-cream) url(#hb-h-red) url(#hb-h-grey) — a projection is hatched (EF 18).
   ============================================================ */
const HB = (() => {
  const NS = 'http://www.w3.org/2000/svg', Q = new URLSearchParams(location.search);
  let svg = null;
  /* a brand token from shared/brand.css :root, for SVG attributes and tweens (no hex literals on a board) */
  const tok = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  /* C.bg is the board's ground as an SVG paint (url(#hb-ground), the charcoal gradient hb.css gives .stage), for knock-outs,
     under-fills and gaps; use it in fill/stroke attributes only, never as a tween colour. C.ink is the flat brand ink. */
  const C = { get gold() { return tok('--gold'); }, get goldBright() { return tok('--gold-bright'); }, get cream() { return tok('--cream'); },
              get bg() { return 'url(#hb-ground)'; }, get ink() { return tok('--bg'); },
              get red() { return tok('--red'); }, get grey() { return tok('--grey'); }, get greyBright() { return tok('--grey-bright'); } };
  /* the ground as an SVG radial gradient, in the stage's own pixels: the same ellipse and stops as hb.css's .stage background */
  function ground(defs) {
    const st = getComputedStyle(document.querySelector('.stage')), g = (k) => st.getPropertyValue(k).trim() || tok('--bg');
    const rg = s('radialGradient', { id: 'hb-ground', gradientUnits: 'userSpaceOnUse', cx: 960, cy: 540, r: 1150,
      gradientTransform: `translate(960 540) scale(1 ${820 / 1150}) translate(-960 -540)` }, defs);
    [[0, '--ground-0'], [.45, '--ground-1'], [.75, '--ground-2'], [1, '--ground-3']].forEach(([o, k]) => s('stop', { offset: o, 'stop-color': g(k) }, rg));
  }

  function s(tag, attrs = {}, parent = null, text = null) {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v !== undefined && v !== null) n.setAttribute(k, v); });
    if (text != null) n.textContent = text;
    (parent || svg).appendChild(n);
    return n;
  }
  /* one line of text; parts become tspans, so each part is read (and judged) on its own */
  function t(parent, x, y, parts, o = {}) {
    const n = s('text', { x, y, 'text-anchor': o.anchor || 'start', class: o.cls || 'hb-fig', 'font-size': o.size || 40 }, parent);
    if (typeof parts === 'string') n.textContent = parts;
    else parts.forEach(([txt, cls, extra]) => { const sp = s('tspan', Object.assign({ class: cls || null }, extra || {}), n, txt); });
    return n;
  }
  function hatch(defs, id, color, op = 1, gap = 14, w = 3) {
    const p = s('pattern', { id, patternUnits: 'userSpaceOnUse', width: gap, height: gap, patternTransform: 'rotate(45)' }, defs);
    s('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: color, 'stroke-width': w, 'stroke-opacity': op }, p);
    return p;
  }

  function frame(o = {}) {
    const stage = document.querySelector('.stage');
    svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'hb-svg'); svg.setAttribute('viewBox', '0 0 1920 1080');
    stage.insertBefore(svg, stage.querySelector('.chrome'));
    const defs = s('defs');
    ground(defs);
    hatch(defs, 'hb-h-gold', C.gold, .9);
    hatch(defs, 'hb-h-cream', C.cream, .42);
    hatch(defs, 'hb-h-red', C.red, .8);
    hatch(defs, 'hb-h-grey', C.greyBright, .9);
    hatch(defs, 'hb-h-gold-faint', C.gold, .13, 14, 2);
    const brand = document.createElement('img');
    brand.className = 'hb-brand'; brand.src = 'assets/heroboard/bw-lockup.png'; brand.alt = '';
    stage.appendChild(brand);
    const N = { brand, svg, defs };
    const Y = o.coY || 150;
    if (o.co) {
      const im = document.createElement('img'); im.className = 'hb-co'; im.src = o.co; im.alt = '';
      im.style.top = Y + 'px'; im.style.height = (o.coH || 34) + 'px'; stage.appendChild(im); N.co = im;
    }
    if (o.line) N.line = t(svg, o.lineX || 120, o.lineY || (Y + 31), o.line, { cls: 'hb-unit', size: o.lineSize || 34 });
    return N;
  }

  function at(defs) {
    const given = (Q.get('at') || '').split(',').filter(x => x.trim() !== '').map(Number);
    const o = {}; defs.forEach(([k, d], i) => { o[k] = i < given.length && !isNaN(given[i]) ? given[i] : d; });
    return o;
  }

  const arr = (x) => (Array.isArray(x) ? x : [x]).flat(Infinity).filter(Boolean);
  function rise(tl, els, at, d = .5, dy = 16) {
    arr(els).forEach(e => tl.fromTo(e, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: d, ease: 'power2.out' }, at)); return tl;
  }
  function fade(tl, els, at, d = .5, to = 1) {
    arr(els).forEach(e => tl.fromTo(e, { opacity: 0 }, { opacity: to, duration: d, ease: 'power1.out' }, at)); return tl;
  }
  /* a bar rises out of its baseline (or falls below it: origin '50% 0%') */
  function grow(tl, el, at, d = .9, origin = '50% 100%') {
    arr(el).forEach(e => tl.fromTo(e, { scaleY: 0, transformOrigin: origin }, { scaleY: 1, duration: d, ease: 'power3.out' }, at)); return tl;
  }
  function growX(tl, el, at, d = .8, origin = '0% 50%') {
    arr(el).forEach(e => tl.fromTo(e, { scaleX: 0, transformOrigin: origin }, { scaleX: 1, duration: d, ease: 'power2.inOut' }, at)); return tl;
  }
  /* a part of a line (a tspan) inks in: tspans take fill-opacity, not opacity */
  function ink(tl, els, at, d = .45) {
    arr(els).forEach(e => tl.fromTo(e, { fillOpacity: 0 }, { fillOpacity: 1, duration: d, ease: 'power1.out' }, at)); return tl;
  }
  function to(tl, els, vars, at, d = .5) {
    arr(els).forEach(e => tl.to(e, Object.assign({ duration: d, ease: 'power1.inOut' }, vars), at)); return tl;
  }
  /* the spoken figure leads its beat at hero size (k × its rest size), then settles to rest when the next beat comes
     (settle null: it stays). origin is where it grows from: '50% 100%' above a bar, '0% 100%' for a left-set figure */
  function lead(tl, el, at, k, settle = null, origin = '50% 100%') {
    tl.fromTo(el, { opacity: 0, scale: k * .94, transformOrigin: origin }, { opacity: 1, scale: k, duration: .5, ease: 'power2.out' }, at);
    if (settle != null) tl.to(el, { scale: 1, duration: .7, ease: 'power2.inOut' }, settle);
    return tl;
  }
  /* a label of more than one line, as one HTML element so it is read (and judged) as one label;
     y is the first line's baseline; o = { cls, size, anchor: 'start' | 'middle' } */
  function h(x, y, html, o = {}) {
    const d = document.createElement('div'), size = o.size || 40;
    d.className = 'hb-h ' + (o.cls || '');
    Object.assign(d.style, { left: x + 'px', top: (y - size * .93) + 'px', fontSize: size + 'px', lineHeight: (size * 1.2) + 'px',
      transform: o.anchor === 'middle' ? 'translateX(-50%)' : '', textAlign: o.anchor === 'middle' ? 'center' : 'left' });
    d.innerHTML = html;
    document.querySelector('.stage').insertBefore(d, document.querySelector('.chrome'));
    return d;
  }

  function run(o) {
    const play = () => {
      const tl = gsap.timeline();
      Object.entries(o.steps).forEach(([k, v]) => BW.mark(tl, k, v));
      o.build(tl, o.steps);
      tl.to({}, { duration: .01 }, o.end);
      return tl;
    };
    /* rest = the reveal's last frame: build it and run it to the end */
    const rest = () => { const tl = play(); tl.progress(1); tl.pause(); };
    BW.run({ play, rest });
  }

  /* a data.js date as the board writes it: 30 Sep 2026 */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = (k) => { const [y, m, d] = String(BW.fig(k).asOf).split('-').map(Number); return d + ' ' + MON[m - 1] + ' ' + y; };

  return { C, frame, s, t, h, at, run, day, rise, fade, ink, grow, growX, to, lead, get svg() { return svg; } };
})();
