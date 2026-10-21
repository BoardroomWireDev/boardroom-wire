/* Axonometric line drawing in true metres: flat ink faces, cream edges, painter's order (no shading, no light).
   A view is an orthographic camera at azimuth `az` (degrees, 0 to 90) and elevation `elv` (35.26 = isometric).
   Screen X = (x cos az - y sin az) k; depth D = x sin az + y cos az (bigger is nearer); screen Y = D sin(elv) k - z cos(elv) k.
   With az in (0, 90) the visible faces of an axis-aligned box are its top, its +x face and its +y face.
   Used by the data-centre model (dc-model.js): b030 draws it, b031 runs it, H3 cuts it open, H4 zooms into one hall. */
function view({ ox, oy, k, az = 45, elv = 30 }) {
  const a = az * Math.PI / 180, e = elv * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), se = Math.sin(e), ce = Math.cos(e);
  const P = (x, y, z = 0) => [ox + (x * ca - y * sa) * k, oy + (x * sa + y * ca) * se * k - z * ce * k];
  return { P, k, depth: (x, y, z = 0) => x * sa + y * ca + z * 1e-3, ca, sa };
}
const pts = (V, list) => list.map(p => V.P(...p).map(n => n.toFixed(1)).join(',')).join(' ');

/* a scene collects drawables with a depth key, then paints far to near */
function scene() {
  const items = [];
  return {
    add(depth, fn) { items.push([depth, fn]); },
    paint(g) { items.sort((a, b) => a[0] - b[0]).forEach(([, fn]) => fn(g)); }
  };
}
const INK = 'var(--bg)', LINE = 'rgba(245,241,229,.82)', THIN = 'rgba(245,241,229,.42)', GOLDC = 'var(--gold)';

/* a box: top, +x and +y faces. st: {fill, top, sx, sy, stroke, sw, detail(g, V) drawn after the faces} */
function box(S, V, x, y, z, w, d, h, st = {}) {
  S.add(V.depth(x + w, y + d, z) + (st.bias || 0), (g) => {
    const a = { stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.6, 'stroke-linejoin': 'round' };
    const fx = st.sx || st.fill || INK, fy = st.sy || st.fill || INK, ft = st.top || st.fill || INK;
    if (h > 0) {
      el(g, 'polygon', { points: pts(V, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]), fill: fx, ...a });
      el(g, 'polygon', { points: pts(V, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]), fill: fy, ...a });
    }
    el(g, 'polygon', { points: pts(V, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]), fill: ft, ...a });
    if (st.detail) st.detail(g, V);
  });
}
/* a flat polygon on a plane z (plots, slabs, pads) */
function plate(S, V, poly, z, st = {}) {
  S.add(st.depth !== undefined ? st.depth : -1e6, (g) => el(g, 'polygon', { points: pts(V, poly.map(([x, y]) => [x, y, z])),
    fill: st.fill || 'none', stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.6, ...(st.dash ? { 'stroke-dasharray': st.dash } : {}) }));
}
/* a 3D polyline */
function line3(g, V, list, st = {}) {
  return el(g, 'polyline', { points: pts(V, list), fill: 'none', stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.6,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...(st.dash ? { 'stroke-dasharray': st.dash } : {}) });
}
/* a circle on a horizontal plane (fans seen from above become ellipses) */
function ring(g, V, cx, cy, z, r, st = {}, n = 28) {
  const list = []; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI * 2; list.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z]); }
  return el(g, 'polygon', { points: pts(V, list), fill: st.fill || 'none', stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.4 });
}
/* lines across a box's +y face (rack doors) every `step` metres along x, and across its height at fractions */
function faceY(g, V, x, y, z, w, h, step, hs = [], st = {}) {
  const a = { stroke: st.stroke || THIN, 'stroke-width': st.sw || 1 };
  for (let u = x + step; u < x + w - 1e-6; u += step) { const [x1, y1] = V.P(u, y, z), [x2, y2] = V.P(u, y, z + h); el(g, 'line', { x1, y1, x2, y2, ...a }); }
  hs.forEach(f => { const [x1, y1] = V.P(x, y, z + h * f), [x2, y2] = V.P(x + w, y, z + h * f); el(g, 'line', { x1, y1, x2, y2, ...a }); });
}
function faceX(g, V, x, y, z, d, h, step, hs = [], st = {}) {
  const a = { stroke: st.stroke || THIN, 'stroke-width': st.sw || 1 };
  for (let u = y + step; u < y + d - 1e-6; u += step) { const [x1, y1] = V.P(x, u, z), [x2, y2] = V.P(x, u, z + h); el(g, 'line', { x1, y1, x2, y2, ...a }); }
  hs.forEach(f => { const [x1, y1] = V.P(x, y, z + h * f), [x2, y2] = V.P(x, y + d, z + h * f); el(g, 'line', { x1, y1, x2, y2, ...a }); });
}
/* fit a view so the world box [x0, y0, x1, y1, z1] fills the screen rect [L, T, R, B] */
function fitView({ az = 45, elv = 30, world, rect }) {
  const [x0, y0, x1, y1, z1, z0 = 0] = world, [L, T, R, B] = rect;      // z0: below ground (a site section), default 0
  const u = view({ ox: 0, oy: 0, k: 1, az, elv });
  const c = []; [x0, x1].forEach(x => [y0, y1].forEach(y => [z0, z1].forEach(z => c.push(u.P(x, y, z)))));
  const minX = Math.min(...c.map(p => p[0])), maxX = Math.max(...c.map(p => p[0])), minY = Math.min(...c.map(p => p[1])), maxY = Math.max(...c.map(p => p[1]));
  const k = Math.min((R - L) / (maxX - minX), (B - T) / (maxY - minY));
  return view({ ox: (L + R) / 2 - (minX + maxX) / 2 * k, oy: (T + B) / 2 - (minY + maxY) / 2 * k, k, az, elv });
}
