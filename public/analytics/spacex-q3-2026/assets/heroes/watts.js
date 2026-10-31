/* ============================================================
   SPACEX Q3 · THE WATT PLANE (Ive, 27 Oct 2026). Heroes 03 (the formula) and 04 (the three cases) draw ONE chart:
   gigawatts across, price per watt a year up, so a year's revenue is the area of a rectangle anchored at zero
   (a gigawatt at $30 a watt is $30B a year; the writer's basis, HANDOFF 27 Oct). Same scales, same marks, two states:
   03 sits on 0–14 GW; 04 opens the axis to 0–22 GW so the trillion fits. Needs hero.js (H).

     WP.plane({ gmax, pmax })      axes, grid, ticks and their units; returns { X, Y, N } (N: the nodes, for the reveal)
     WP.box(g, p, style)           the rectangle g GW × $p: revenue as area
     WP.iso(R, style)              the curve where gigawatts × price = R ($B a year): every point on it earns the same
     WP.vrule(g, style)            a vertical rule at g GW (today's capacity, a forecast floor)
     WP.range(id)                  [lo, hi] of a range figure (lo/hi, else the two numbers in its display)
     WP.gw(id)                     a figure's gigawatts (unit GW)
   ============================================================ */
const WP = (() => {
  const L = 230, R = 1250, B = 900, T = 300;
  let X = null, Y = null;
  function plane({ gmax = 14, pmax = 60 } = {}) {
    X = H.lin(0, gmax, L, R); Y = H.lin(0, pmax, B, T);
    const N = { grid: [], tk: [], tl: [], unit: [] };
    for (let g = 0; g <= gmax; g++) {
      const maj = g % 5 === 0;
      if (g && maj) N.grid.push(H.s('line', { class: 'h-grid', x1: X(g), x2: X(g), y1: B, y2: T }));
      N.tk.push(H.s('line', { class: 'h-tk' + (maj ? '' : ' min'), x1: X(g), x2: X(g), y1: B, y2: B + (maj ? 14 : 8) }));
      if (maj) N.tl.push(H.t(X(g), B + 22, g + ' GW', 'h-tick', 'c'));
    }
    for (let p = 0; p <= pmax; p += 5) {
      const maj = p % 10 === 0;
      if (p && maj) N.grid.push(H.s('line', { class: 'h-grid', x1: L, x2: R, y1: Y(p), y2: Y(p) }));
      N.tk.push(H.s('line', { class: 'h-tk' + (maj ? '' : ' min'), x1: L - (maj ? 14 : 8), x2: L, y1: Y(p), y2: Y(p) }));
      if (maj) N.tl.push(H.t(L - 24, Y(p) - 12, '$' + p, 'h-tick', 'r'));
    }
    N.ax = H.s('path', { class: 'h-axis', d: `M${L},${T - 10} V${B} H${R + 10}` });
    const yu = H.t(L - 128, (T + B) / 2, 'price per watt', 'h-sub');   /* the axis title, set along its axis */
    yu.parentElement.parentElement.style.transform = 'translate(-50%, -50%) rotate(-90deg)';
    N.unit.push(yu);
    N.unit.push(H.t(R + 10, B + 58, 'gigawatts', 'h-sub', 'r'));
    return { X, Y, N, L, R, B, T };
  }
  const box = (g, p, style, k) => H.s('rect', { x: X(0), y: Y(p), width: X(g) - X(0), height: Y(0) - Y(p), style, 'data-k': k });
  function iso(Rb, style, gmax) {
    const pts = [];
    for (let g = Rb / 60; g <= gmax + 1e-9; g += .05) pts.push([X(g), Y(Math.min(60, Rb / g))]);
    return H.s('path', { d: 'M' + pts.map(p => p.join(',')).join(' L'), style: 'fill: none; ' + style });
  }
  const vrule = (g, style) => H.s('line', { x1: X(g), x2: X(g), y1: B, y2: T - 10, style });
  function range(id) {
    const f = BW.fig(id);
    if (f.lo !== undefined && f.hi !== undefined) return [f.lo, f.hi];
    const m = String(f.display || f.v).match(/[\d.]+/g) || [];
    return [+m[0], +m[1]];
  }
  const gw = (id) => BW.fig(id).v;
  return { plane, box, iso, vrule, range, gw, get X() { return X; }, get Y() { return Y; } };
})();
