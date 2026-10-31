/* ============================================================
   SPACEX Q3 · HERO SET helpers (Ive, 27 Oct 2026). Needs motion.js (BW), flagship.js (FX) and data.js.
   The six heroes (01-earnings … 06-receipt) share this file so they read as one set and stay web-ready.

     H.need(keys)            every key the board reads; a missing one stops the board and is written on the frame
                             (and in data-error, so bw audit fails it). Returns true when all are there.
     H.v(id) / H.full(id)    the value as filed / the figure at full precision ("$14,575M"; the voice rounds, the screen does not)
     H.svg()                 the board's one SVG layer, with the hatches (hG gold, hC cream, hR red) and the arrowhead
     H.s(tag, attrs, parent) an SVG node (BW.mk)
     H.t(x, y, html, cls, a) a label: an HTML line whose top sits at y, anchored l | c | r, rising through its own mask
     H.lin(d0, d1, r0, r1)   a linear scale
     H.at(defaults)          step times: [['axes', .4], ['bars', 1.2], …]; ?at=a,b,c re-times them in order (Davinci, from the VO)
     motion: H.grow (a mark grows from its baseline, never past its value), H.draw (a line draws), H.rise (type rises),
             H.fade (a hairline or a grid arrives). H.clear() undoes them all (rest, and before every replay).
   The step-by-step reveal follows the narration; ?final / ?still / F show the board at rest; ?t=<step> parks on a step.
   ============================================================ */
const H = (() => {
  const Q = new URLSearchParams(location.search);
  const stage = () => document.querySelector('.stage');
  const touched = new Set();
  let SVG = null;

  function need(keys) {
    const miss = keys.filter(k => !(BW_DATA.figures || {})[k]);
    if (!miss.length) return true;
    const m = BW.el('div', 'h-missing', stage());
    m.textContent = 'data.js is missing ' + miss.length + ' key' + (miss.length > 1 ? 's' : '') + ':\n' + miss.join('\n');
    document.documentElement.dataset.error = 'missing data.js keys: ' + miss.join(', ');
    return false;
  }
  const v = (id) => BW.fig(id).v;
  function full(id) {
    const f = BW.fig(id), u = String(f.unit || '');
    if (/USD millions/.test(u)) return (f.v < 0 ? '−' : '') + '$' + Math.abs(f.v).toLocaleString('en-US') + 'M';
    if (/^USD/.test(u)) return (f.v < 0 ? '−' : '') + '$' + Math.abs(f.v).toFixed(2);
    return BW.val(id);
  }
  const lin = (d0, d1, r0, r1) => (x) => r0 + (x - d0) / (d1 - d0) * (r1 - r0);

  function svg() {
    if (SVG) return SVG;
    SVG = BW.mk('svg', { class: 'h-svg', viewBox: '0 0 1920 1080' });
    stage().insertBefore(SVG, stage().firstChild);
    const d = BW.mk('defs', {}, SVG);
    const hatch = (id, ground, stripe, w = 3, gap = 14) => {
      const p = BW.mk('pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, d);
      BW.mk('rect', { width: gap, height: gap, style: 'fill: ' + ground }, p);
      BW.mk('rect', { width: w, height: gap, style: 'fill: ' + stripe }, p);
    };
    hatch('hG', 'rgba(var(--gold-rgb), .10)', 'rgba(var(--gold-rgb), .78)');
    hatch('hGs', 'rgba(var(--gold-rgb), .08)', 'rgba(var(--gold-rgb), .55)', 2, 10);
    hatch('hGl', 'rgba(var(--gold-rgb), .05)', 'rgba(var(--gold-rgb), .40)', 2, 13);
    hatch('hC', 'rgba(var(--cream-rgb), .04)', 'rgba(var(--cream-rgb), .34)', 2, 12);
    hatch('hR', 'rgba(var(--red-rgb), .10)', 'rgba(var(--red-rgb), .70)');
    const mk = BW.mk('marker', { id: 'hArr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, d);
    BW.mk('path', { d: 'M0,1 L9,5 L0,9', style: 'fill: none; stroke: var(--cream-dim); stroke-width: 1.6' }, mk);
    return SVG;
  }
  const s = (tag, attrs = {}, parent) => BW.mk(tag, attrs, parent || svg());

  function t(x, y, html, cls = 'h-lbl', a = 'l', parent) {
    const w = BW.el('div', 'h-t ' + (a === 'l' ? '' : a), parent || stage());
    w.style.left = x + 'px'; w.style.top = y + 'px';
    w.innerHTML = `<div class="bw-m"><span class="${cls}">${html}</span></div>`;
    const sp = w.querySelector('span'); sp.style.display = 'block';
    return sp;
  }

  function at(defs) {
    const given = (Q.get('at') || '').split(',').filter(x => x.trim() !== '').map(Number);
    const o = {}; defs.forEach(([k, d], i) => { o[k] = i < given.length && !isNaN(given[i]) ? given[i] : d; });
    return o;
  }

  const list = (n) => (n && n.length !== undefined && typeof n !== 'string') ? Array.from(n) : BW.$$(n);
  const reg = (n) => { list(n).forEach(x => touched.add(x)); return list(n); };
  function grow(tl, n, at, dur = 1.1, origin = '50% 100%', axis = 'scaleY') {
    reg(n).forEach((x, i) => tl.fromTo(x, { [axis]: 0, transformOrigin: origin }, { [axis]: 1, duration: dur, ease: 'power2.out', transformOrigin: origin }, at + i * .08));
  }
  function draw(tl, n, at, dur = 1.0) {
    reg(n).forEach((x, i) => {
      const L = x.getTotalLength ? Math.ceil(x.getTotalLength()) + 2 : 0; if (!L) return;
      tl.fromTo(x, { strokeDasharray: L + ' ' + L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: dur, ease: 'power2.inOut',
        onComplete: () => { x.style.strokeDasharray = ''; x.style.strokeDashoffset = ''; } }, at + i * .06);
    });
  }
  function rise(tl, n, at, dur = .6, gap = .06) {
    reg(n).forEach((x, i) => tl.fromTo(x, { yPercent: 110 }, { yPercent: 0, duration: dur, ease: 'power3.out' }, at + i * gap));
  }
  function fade(tl, n, at, dur = .5) {
    reg(n).forEach((x, i) => tl.fromTo(x, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'power1.out' }, at + i * .03));
  }
  function clear() {
    touched.forEach(x => { gsap.killTweensOf(x); gsap.set(x, { clearProps: 'transform,opacity,strokeDasharray,strokeDashoffset' }); x.style.strokeDasharray = ''; x.style.strokeDashoffset = ''; });
  }
  /* the frame at rest: header, credit, every mark */
  function rest() { clear(); FX.headRest(); gsap.set('.bw-source', { opacity: 1 }); }
  /* the opening every hero shares: header, then the credit line once the first fact is on */
  function open(tl, creditAt = 1.2) { clear(); FX.headIn(tl, 0); tl.to('.bw-source', { opacity: 1, duration: .6 }, creditAt); }

  return { need, v, full, lin, svg, s, t, at, grow, draw, rise, fade, clear, rest, open, Q };
})();
