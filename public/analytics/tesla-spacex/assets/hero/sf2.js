/* tesla-spacex v2 (Ive, 20 Oct 2026): the drafting-table helpers the overhaul's scenes share. Load after sf.js, hero.js and
   iso.js (Nebius's axonometric engine, copied unchanged into assets/hero/ with dc-model.js). Everything is true geometry in
   world units, projected by an iso.js view; nothing is shaded, lit or blurred (rule 12). LOOK-tesla-spacex-v2.md is the brief.

   sub(V, x0, y0, z0, s)   a view of a part placed at (x0, y0, z0) and scaled by s (a model on a slab, at its own true scale)
   onZ / onY / onX         an SVG matrix that lays 2D content flat on a plane (a mark on the ground, a number on a slab's face)
   cyl                     a cylinder or a frustum (tanks, rocket stages), its silhouette found from the view, not faked
   wire                    a box in edges only: dashed, it is planned, not yet real (the house convention)
   slab                    one layer of the cake: a box with its name and number set on its front face
   leader                  a label's line, square to the frame */
function defs2(svg) {
  const d = svg.querySelector('defs') || el(svg, 'defs');
  const mk = (id, col, w, gap, rot = 45) => { if (d.querySelector('#' + id)) return;
    const p = el(d, 'pattern', { id, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${rot})` });
    el(p, 'rect', { width: w, height: gap, fill: col }); };
  mk('hatch', 'rgba(245,241,229,.34)', 2, 12);
  mk('hatchDim', 'rgba(245,241,229,.16)', 2, 12);
  mk('hatchGold', '#D4AF37', 2, 10);
  return d;
}
function sub(V, x0, y0, z0, s = 1) {
  const P = (x, y, z = 0) => V.P(x0 + s * x, y0 + s * y, z0 + s * z);
  return { P, k: V.k * s, depth: (x, y, z = 0) => V.depth(x0 + s * x, y0 + s * y, z0 + s * z), ca: V.ca, sa: V.sa, base: V };
}
/* the projection is affine on any plane, so 2D content is laid on it with one matrix (no distortion beyond the true view) */
function _ax(V) { const o = V.P(0, 0, 0), ex = V.P(1, 0, 0), ey = V.P(0, 1, 0), ez = V.P(0, 0, 1);
  return { o, x: [ex[0] - o[0], ex[1] - o[1]], y: [ey[0] - o[0], ey[1] - o[1]], z: [ez[0] - o[0], ez[1] - o[1]] }; }
const _m = (a, b, o) => `matrix(${a[0].toFixed(5)},${a[1].toFixed(5)},${b[0].toFixed(5)},${b[1].toFixed(5)},${o[0].toFixed(2)},${o[1].toFixed(2)})`;
/* flat on z: local u along +x, local v along +y (a map, a mark lying on the ground) */
function onZ(V, x0, y0, z) { const A = _ax(V), o = V.P(x0, y0, z); return _m(A.x, A.y, o); }
/* on the +y face (y fixed): u along +x, v downward (-z): reads left to right on the front face */
function onY(V, x0, y, z0) { const A = _ax(V), o = V.P(x0, y, z0); return _m(A.x, [-A.z[0], -A.z[1]], o); }
/* on the +x face (x fixed): u along -y, v downward: reads left to right on the right face */
function onX(V, x, y0, z0) { const A = _ax(V), o = V.P(x, y0, z0); return _m([-A.y[0], -A.y[1]], [-A.z[0], -A.z[1]], o); }

/* a cylinder (r2 = r: a tank) or a frustum (r2 < r: a nose); the side is the visible half found from the view direction */
function cyl(S, V, cx, cy, z, r, h, st = {}) {
  const r2 = st.r2 ?? r, n = 72, vis = [], top = [], bot = [];
  for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    top.push([cx + r2 * c, cy + r2 * s, z + h]); bot.push([cx + r * c, cy + r * s, z]);
    vis.push(c * V.sa + s * V.ca >= -1e-9); }
  /* the visible arc: the run of true flags (the circle is closed, so rotate to start just after a false) */
  let s0 = vis.findIndex((v, i) => !v && vis[(i + 1) % (n + 1)]); if (s0 < 0) s0 = 0;
  const arcB = [], arcT = []; for (let j = 1; j <= n; j++) { const i = (s0 + j) % n; if (vis[i]) { arcB.push(bot[i]); arcT.push(top[i]); } }
  S.add(V.depth(cx, cy, z) + (st.bias || 0) + Math.max(r, r2), (g) => {
    const a = { stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.6, 'stroke-linejoin': 'round' };
    el(g, 'polygon', { points: pts(V, [...arcB, ...arcT.slice().reverse()]), fill: st.fill || INK, ...a });
    if (r2 > .01) el(g, 'polygon', { points: pts(V, top), fill: st.top || st.fill || INK, ...a });
    (st.bands || []).forEach(f => { const rr = r + (r2 - r) * f; line3(g, V, arcB.map(([x, y]) => [cx + (x - cx) * rr / r, cy + (y - cy) * rr / r, z + h * f]), { stroke: st.band || THIN, sw: 1 }); });
    if (st.detail) st.detail(g, V);
  });
}
/* a box in edges only; dashed = planned. Hidden edges are left out, so it reads as a solid drawn in outline */
function wire(g, V, x, y, z, w, d, h, st = {}) {
  const c = [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]].map(p => p), C = c.map(([a, b, cz]) => [a, b, cz + h]);
  const E = [[C[0], C[1]], [C[1], C[2]], [C[2], C[3]], [C[3], C[0]], [c[1], C[1]], [c[2], C[2]], [c[3], C[3]], [c[1], c[2]], [c[2], c[3]]];
  const o = { stroke: st.stroke || LINE, sw: st.sw || 1.6, dash: st.dash };
  E.forEach(([a, b]) => line3(g, V, [a, b], o));
  return g;
}
/* a label's leader: a short square line from the mark to the type, with a dot at the mark */
function leader(g, x1, y1, x2, y2, col = 'rgba(245,241,229,.55)') {
  el(g, 'path', { d: `M${x1},${y1} L${x2},${y1} L${x2},${y2}`, fill: 'none', stroke: col, 'stroke-width': 2 });
  el(g, 'circle', { cx: x1, cy: y1, r: 4, fill: col });
}
/* text laid on a plane through one of the matrices above; size is in screen px at the plane's own scale */
/* (the size goes in style, not the attribute: HERO.run's 32 px floor reads the attribute and would lift the local size; the
   caller keeps px at 32 or more on screen) */
function planeText(g, M, u, v, str, px, V, cls = 'nm', anchor = 'start', extra = {}) {
  const A = _ax(V), sx = Math.hypot(...A.x);
  return el(el(g, 'g', { transform: M }), 'text', { x: u, y: v, class: cls, style: `font-size:${(px / sx).toFixed(3)}px`, 'text-anchor': anchor, ...extra }, str);
}
/* a sentence-case label rule (the writer, 20 Oct): the first letter capital, the rest as the script has it */
const SC = (s) => s.charAt(0).toUpperCase() + s.slice(1);
