/* ============================================================
   BOARDROOM WIRE — THE STEPPED ARR RAMP  (dashboard 06)
   A stepped line whose axes RESCALE rather than a camera that zooms:
   every frame, every element is re-placed from the current vmax / mmax.
   That keeps text upright, dashes honest and strokes constant, and it
   gives the "axis retreating as the numbers grow" move for free.

   const ramp = BW_RAMP.create(svg, { area, points, monthOf, ticksZoom,
                                      ticksFull, xticks, vmax, mmax });
   ramp.st.vmax / ramp.st.mmax  — the current axis maxima (tween these)
   ramp.st.seg[i]               — 0..1 progress of segment i (tween these)
   ramp.render()                — re-place everything (call from onUpdate)
   ramp.marks / labels / estTags / intervals / ticksZoom / ticksFull / xticks
   ============================================================ */
const BW_RAMP = (() => {
  function create(svg, opts) {
    const o = Object.assign({
      area: { x0: 260, x1: 1660, y0: 400, y1: 780 },
      points: [], monthOf: (t) => 0, vmax: 4.2, mmax: 30,
      ticksZoom: [], ticksFull: [], fmtZoom: v => v, fmtFull: v => v, xticks: [],
      hideLabel: []
    }, opts);
    const A = o.area;
    const P = o.points.map(p => Object.assign({}, p, { m: o.monthOf(p.t) }));
    const st = { vmax: o.vmax, mmax: o.mmax, seg: {} };
    P.slice(1).forEach((p, i) => { st.seg[i] = 0; });

    const xOf = m => A.x0 + (m / st.mmax) * (A.x1 - A.x0);
    const yOf = v => A.y1 - (v / st.vmax) * (A.y1 - A.y0);

    const gWorld = BW.mk('g', { class: 'ramp-world' }, svg);
    const gHud   = BW.mk('g', { class: 'ramp-hud' }, svg);

    const base = BW.mk('line', { x1: A.x0, y1: A.y1, x2: A.x1, y2: A.y1, class: 'ramp-base', 'data-reveal': 'scalex' }, gWorld);
    const segs = P.slice(1).map(p => BW.mk('path', { d: '', class: 'ramp-seg' + (p.solid ? '' : ' est') }, gWorld));

    const marks = P.map(p => BW.mk('circle', { r: p.milestone ? 8 : 6, class: 'ramp-mark' + (p.solid ? '' : ' hollow'), 'data-reveal': 'scale' }, gHud));
    const last = P.length - 1;
    const labels = P.map((p, i) => o.hideLabel.includes(p.id) ? null
      : BW.mk('text', { class: 'svg-val ramp-val' + (p.solid ? '' : ' est'), 'text-anchor': i === last ? 'start' : 'middle', 'data-reveal': '' }, gHud, p.label));
    const estTags = P.map((p, i) => p.solid ? null
      : BW.mk('text', { class: 'svg-eyebrow ramp-est', 'text-anchor': i === last ? 'start' : 'middle', 'data-reveal': '' }, gHud, 'SACRA ESTIMATE'));
    const intervals = P.slice(1).map(p => p.interval
      ? BW.mk('text', { class: 'ramp-int', 'data-reveal': '' }, gHud, p.interval.toUpperCase()) : null);

    const mkTicks = (vals, fmt, cls) => vals.map(v => {
      const g = BW.mk('g', { class: 'ramp-tick ' + cls }, gHud);
      BW.mk('line', { class: 'ramp-tickline' }, g);
      BW.mk('text', { class: 'ramp-y', 'text-anchor': 'end' }, g, fmt(v));
      return { v, g };
    });
    const ticksZoom = mkTicks(o.ticksZoom, o.fmtZoom, 'zoom');
    const ticksFull = mkTicks(o.ticksFull, o.fmtFull, 'full');
    const xticks = o.xticks.map(([m, label]) => {
      const g = BW.mk('g', { class: 'ramp-xtick', 'data-reveal': '' }, gHud);
      BW.mk('line', { class: 'ramp-tickline' }, g);
      BW.mk('text', { class: 'ramp-x', 'text-anchor': 'middle' }, g, label);
      return { m, g };
    });

    /* the first p of an L-shaped step: hold right, then rise */
    function segD(i, p) {
      const a = P[i], b = P[i + 1];
      const x0 = xOf(a.m), y0 = yOf(a.v), x1 = xOf(b.m), y1 = yOf(b.v);
      const dx = x1 - x0, dy = Math.abs(y1 - y0), L = dx + dy, l = Math.max(0, Math.min(1, p)) * L;
      if (l <= 0) return `M${x0},${y0}`;
      if (l <= dx) return `M${x0},${y0} H${x0 + l}`;
      return `M${x0},${y0} H${x1} V${y0 - (l - dx) * Math.sign(y0 - y1)}`;
    }

    const setXY = (el, x, y) => { el.setAttribute('x', x); el.setAttribute('y', y); };
    function render() {
      P.forEach((p, i) => {
        const x = xOf(p.m), y = yOf(p.v);
        marks[i].setAttribute('cx', x); marks[i].setAttribute('cy', y);
        if (labels[i]) setXY(labels[i], i === last ? x + 18 : x, i === last ? y + 7 : y - 18);
        if (estTags[i]) setXY(estTags[i], i === last ? x + 18 : x, i === last ? y + 30 : y - 40);
      });
      segs.forEach((s, i) => s.setAttribute('d', segD(i, st.seg[i])));
      intervals.forEach((t, i) => {
        if (!t) return;
        const a = P[i], b = P[i + 1];
        const ya = yOf(a.v), yb = yOf(b.v);
        if (Math.abs(ya - yb) >= 30) {
          /* beside the riser's midpoint */
          t.setAttribute('text-anchor', 'start');
          setXY(t, xOf(b.m) + 14, (ya + yb) / 2 + 5);
        } else {
          /* a riser too short to hold a label: stack it above the point's own labels */
          t.setAttribute('text-anchor', 'middle');
          setXY(t, xOf(b.m), yb - (b.solid ? 42 : 64));
        }
      });
      const tick = (t) => {
        const y = yOf(t.v);
        const [line, text] = t.g.children;
        line.setAttribute('x1', A.x0 - 8); line.setAttribute('x2', A.x0); line.setAttribute('y1', y); line.setAttribute('y2', y);
        setXY(text, A.x0 - 16, y + 5);
        t.g.style.visibility = (y < A.y0 - 4 || y > A.y1 + 4) ? 'hidden' : 'visible';
      };
      ticksZoom.forEach(tick); ticksFull.forEach(tick);
      xticks.forEach(t => {
        const x = xOf(t.m);
        const [line, text] = t.g.children;
        line.setAttribute('x1', x); line.setAttribute('x2', x); line.setAttribute('y1', A.y1); line.setAttribute('y2', A.y1 + 8);
        setXY(text, x, A.y1 + 30);
        t.g.style.visibility = (x > A.x1 + 4) ? 'hidden' : 'visible';
      });
    }
    render();

    return { st, P, xOf, yOf, render, base, segs, marks, labels, estTags, intervals, ticksZoom, ticksFull, xticks, gWorld, gHud };
  }
  return { create };
})();
