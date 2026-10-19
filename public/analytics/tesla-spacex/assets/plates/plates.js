/* tesla-spacex standard plates: the pieces every plate and the receipt page share (studio-builder-b, 18 Oct 2026).
   Load after hero.js (HERO, el, used, BW_HELD, corners). Nothing here is typed text: names and figures come from the page.

   PL.card      the one receipt style (EF 18): ONE flat white card, tilted a little, at most about 60% of the frame, the capture's
                own crops stacked as captured, the gold pen only on printed words. It rides in from the side, settles, then pushes
                slowly and evenly (never to fill the frame), and leaves the way it came. Used inside plates 36 and 39 and by the
                stand-alone page rc-receipt.html (one style, one code path). An owed capture (no file yet) is not drawn; the page
                lists it with HERO.owed(id) and ?noslot= (nothing) shows it, the LOOK convention.
   PL.tile      a company mark in its OWN colours on a flat cream tile (Amazon's dark wordmark and orange smile would vanish on the
                ink ground; Microsoft's four squares are drawn as the four flat colours).
   PL.mark      a mark file that may still be owed (a logo from Ko): held, never replaced by typed words.
   PL.camera    one camera over a world group: segments of (from, to, dip) with holds between; its state is a pure function of t, so
                labels that must keep a screen size can be anchored to world points (PL.anchor).
   PL.src       an image path, overridable with ?img.<id>= (the stand-in used while a capture is owed). */
const PL = (() => {
  const Q = new URLSearchParams(location.search);
  const H = HERO;
  const src = (id, def) => Q.get('img.' + id) || def;
  const sizeOf = (id, def) => { const s = Q.get('size.' + id); return s ? s.split(',').map(Number) : def; };

  /* ---------- the receipt card ---------- */
  let _cp = 0;
  function card(p, o) {
    const PAD = 14, GAP = 12, rows = o.rows, rot = o.rot ?? -1.2, cx = o.cx ?? 960, cy = o.cy ?? 540;
    const maxW = o.maxW ?? 1100, maxH = o.maxH ?? 620, at = o.at, out = o.out ?? Infinity;
    const maxCW = Math.max(...rows.map(r => r.crop[2])), sumH = rows.reduce((a, r) => a + r.crop[3], 0);
    const k = Math.min((maxW - 2 * PAD) / maxCW, (maxH - 2 * PAD - GAP * (rows.length - 1)) / sumH);
    const W = maxCW * k + 2 * PAD, Hh = sumH * k + GAP * (rows.length - 1) + 2 * PAD;
    const sc = o.scale ?? 1;
    H.card(o.id, at, out === Infinity ? H.END : out, { x: Math.round(cx - W * sc / 2), y: Math.round(cy - Hh * sc / 2), w: Math.round(W * sc), h: Math.round(Hh * sc) }, o.subject || '');
    const g = el(p, 'g');
    if (H.isOwed(o.id)) { g.style.display = 'none'; return { g, W, Hh, k, owed: true }; }
    const defs = document.querySelector('svg.hero defs') || el(document.querySelector('svg.hero'), 'defs');
    el(g, 'rect', { x: 0, y: 0, width: W, height: Hh, fill: '#fff', stroke: 'rgba(245,241,229,.3)', 'stroke-width': 2 });
    const href = src(o.id, o.img);
    let size = sizeOf(o.id, o.size), ry = PAD;
    const ims = rows.map((r) => {
      const id = 'rcc' + (++_cp), cp = el(defs, 'clipPath', { id });
      el(cp, 'rect', { x: PAD, y: ry, width: r.crop[2] * k, height: r.crop[3] * k });
      const gi = el(g, 'g', { 'clip-path': `url(#${id})` }), im = el(gi, 'image', { href, preserveAspectRatio: 'none' });
      const row = { r, ry, im }; ry += r.crop[3] * k + GAP; return row;
    });
    const place = () => { if (!size) return; ims.forEach(({ r, ry, im }) => {
      im.setAttribute('x', PAD - r.crop[0] * k); im.setAttribute('y', ry - r.crop[1] * k);
      im.setAttribute('width', size[0] * k); im.setAttribute('height', size[1] * k); }); };
    if (size) place(); else { const t = new Image(); t.onload = () => { size = [t.naturalWidth, t.naturalHeight]; place(); H.paint(lastT); }; t.src = href; }
    /* the gold pen, on printed words only: boxes in capture pixels, read off the capture (never guessed) */
    (o.marks || []).forEach((m, i) => {
      const r = rows[m.r], row = ims[m.r];
      const x0 = PAD + (m.box[0] - r.crop[0]) * k, x1 = PAD + (m.box[2] - r.crop[0]) * k, yy = row.ry + (m.box[3] - r.crop[1]) * k + 5;
      const n = Math.max(12, Math.round((x1 - x0) / 20)), pts = [];
      for (let j = 0; j <= n; j++) { const u = j / n; pts.push([x0 - 6 + (x1 - x0 + 12) * u, yy + 1.6 * Math.sin(u * 3.1 + i) - 2.4 * u]); }
      pts.push([x1 + 4, yy - 6]);
      const path = el(g, 'path', { d: 'M ' + pts.map(q => q.map(v => v.toFixed(1)).join(' ')).join(' L '), fill: 'none', stroke: 'var(--gold)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      H.draw(path, m.at, m.d ?? .5);
    });
    const fromDx = o.fromDx ?? 2300, fromDy = o.fromDy ?? 0;
    H.on((t) => {
      const u = H.go(t, at, at + .75, H.ease.out), v = H.go(t, out, out + .55, H.ease.io);
      const span = Math.max(.5, Math.min(out, H.END) - at), push = 1 + (o.push ?? .04) * H.clamp((t - at) / span);
      const dx = (1 - u) * fromDx + v * fromDx, dy = (1 - u) * fromDy + v * fromDy;
      g.setAttribute('transform', `translate(${(cx + dx).toFixed(2)},${(cy + dy).toFixed(2)}) rotate(${rot}) scale(${(sc * push).toFixed(4)}) translate(${-W / 2},${-Hh / 2})`);
      g.style.display = (u <= 0 || v >= 1) ? 'none' : '';
    });
    return { g, W, Hh, k };
  }
  let lastT = 0;
  H.on((t) => { lastT = t; });

  /* ---------- marks ---------- */
  const MS = [['#F25022', 0, 0], ['#7FBA00', 1, 0], ['#00A4EF', 0, 1], ['#FFB900', 1, 1]];
  function msq(p, x, y, size) {
    const q = size * .47, gap = size * .06, g = el(p, 'g');
    MS.forEach(([c, i, j]) => el(g, 'rect', { x: x + i * (q + gap), y: y + j * (q + gap), width: q, height: q, fill: c }));
    return g;
  }
  /* a flat cream tile holding one company mark in its own colours; (x, y) is the tile's top left, h its height */
  function tile(p, kind, x, y, h) {
    const g = el(p, 'g'), pad = h * .26;
    const inner = h - 2 * pad, w = kind === 'amazon' ? inner * (6110 / 2047) + 2 * pad : h;
    el(g, 'rect', { x, y, width: w, height: h, fill: '#F5F1E5' });
    if (kind === 'amazon') el(g, 'image', { href: 'assets/plates/logo-amazon.png', x: x + pad, y: y + pad, width: inner * (6110 / 2047), height: inner, preserveAspectRatio: 'xMidYMid meet' });
    else msq(g, x + pad, y + pad, inner);
    return { g, w };
  }
  /* a mark that may still be owed: hidden (and listed in BW_HELD) unless its file is delivered (?noslot= shows it) */
  function mark(p, id, href, x, y, h, ratio) {
    const g = el(p, 'g');
    if (H.isOwed(id)) { g.style.display = 'none'; BW_HELD.push('mark:' + id); return { g, w: h * ratio, owed: true }; }
    el(g, 'image', { href, x, y, width: h * ratio, height: h, preserveAspectRatio: 'xMinYMid meet' });
    return { g, w: h * ratio };
  }

  /* ---------- a camera over a world group ---------- */
  /* segs: [{a, b, from:{cx,cy,s}, to:{cx,cy,s}, dip?}] in time order; before the first it holds `from`, between segments it holds
     the last `to`. The zoom moves in log space (a dip pulls the zoom back by that factor at mid-flight); position follows the same
     eased fraction. */
  function camera(world, segs, onFrame, e = H.ease.io) {
    const state = (t) => {
      let cur = segs[0].from;
      for (const sg of segs) {
        if (t < sg.a) return cur;
        if (t >= sg.b) { cur = sg.to; continue; }
        const u = e((t - sg.a) / (sg.b - sg.a)), dip = sg.dip ? Math.log(sg.dip) * Math.sin(Math.PI * u) : 0;
        return { cx: H.mix(sg.from.cx, sg.to.cx, u), cy: H.mix(sg.from.cy, sg.to.cy, u), s: Math.exp(H.mix(Math.log(sg.from.s), Math.log(sg.to.s), u) - dip) };
      }
      return cur;
    };
    H.on((t) => { const c = state(t);
      world.setAttribute('transform', `translate(960,540) scale(${c.s.toFixed(5)}) translate(${(-c.cx).toFixed(3)},${(-c.cy).toFixed(3)})`);
      if (onFrame) onFrame(c, t); });
    const toScreen = (t, wx, wy) => { const c = state(t); return [960 + (wx - c.cx) * c.s, 540 + (wy - c.cy) * c.s]; };
    return { state, toScreen };
  }
  /* a group that sits on a world point at screen size: its transform follows the camera each frame */
  function anchor(p, cam, wx, wy) {
    const g = el(p, 'g');
    H.on((t) => { const [x, y] = cam.toScreen(t, wx, wy); g.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`); });
    return g;
  }
  return { Q, src, card, tile, msq, mark, camera, anchor };
})();
