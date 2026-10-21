/* tesla-spacex v2 · the parts of the flywheel machine (Ive, 20 Oct 2026), drawn with iso.js in metres-like units on a bedplate.
   Each part is the named thing at a model scale (not a true scale between parts): a Megapack, a factory with a sawtooth roof,
   Optimus in front elevation, a Cybercab, a data hall (dc-model.js at small scale), a rack row carrying Grok, a Starlink
   satellite, Starship on its mount. A part stands at (x, y) with its drive pulley on its inner side. Load after iso.js, sf2.js,
   dc-model.js. */

/* a solid from a profile in the x-z plane, extruded along +y from y0 by d; only the faces toward the viewer are drawn */
function extrude(S, V, prof, y0, d, st = {}) {
  const e = 30 * Math.PI / 180, v = [V.sa * Math.cos(e), V.ca * Math.cos(e), Math.sin(e)];
  const n = prof.length, cx = prof.reduce((a, p) => a + p[0], 0) / n, cz = prof.reduce((a, p) => a + p[1], 0) / n;
  S.add(V.depth(Math.max(...prof.map(p => p[0])), y0 + d, 0) + (st.bias || 0), (g) => {
    const a = { stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.6, 'stroke-linejoin': 'round' };
    for (let i = 0; i < n; i++) {
      const p = prof[i], q = prof[(i + 1) % n], nx = q[1] - p[1], nz = -(q[0] - p[0]);
      const mx = (p[0] + q[0]) / 2 - cx, mz = (p[1] + q[1]) / 2 - cz, sgn = (nx * mx + nz * mz) >= 0 ? 1 : -1;
      if ((nx * v[0] + nz * v[2]) * sgn <= 0) continue;
      el(g, 'polygon', { points: pts(V, [[p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y0 + d, q[1]], [p[0], y0 + d, p[1]]]), fill: st.fill || INK, ...a });
    }
    el(g, 'polygon', { points: pts(V, prof.map(([x, z]) => [x, y0 + d, z])), fill: st.front || st.fill || INK, ...a });
    if (st.detail) st.detail(g, V);
  });
}
/* a circle standing in the x-z plane at y (a wheel seen from the side) */
function ringY(g, V, cx, y, cz, r, st = {}) {
  const l = []; for (let i = 0; i <= 36; i++) { const a = i / 36 * Math.PI * 2; l.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]); }
  return el(g, 'polygon', { points: pts(V, l), fill: st.fill || INK, stroke: st.stroke || LINE, 'stroke-width': st.sw || 1.6 });
}

const PART = {
  /* Megapack: a cabinet about 8.8 x 1.65 x 2.8 m, drawn at 1.8x; door divisions along its face */
  megapack(S, V, x, y, c) { box(S, V, x, y, 0, 16, 4.2, 5.2, { stroke: c, detail: (g, V) => { faceY(g, V, x, y + 4.2, 0, 16, 5.2, 2, [.12], { stroke: c === LINE ? THIN : c }); } });
    box(S, V, x, y + 6, 0, 16, 4.2, 5.2, { stroke: c, detail: (g, V) => { faceY(g, V, x, y + 10.2, 0, 16, 5.2, 2, [.12], { stroke: c === LINE ? THIN : c }); } }); },
  /* a factory: a long shed with a sawtooth roof (north lights) */
  factory(S, V, x, y, c) { const L = 20, D = 12, Hh = 5, n = 5, w = L / n;
    box(S, V, x, y, 0, L, D, Hh, { stroke: c, detail: (g, V) => {
      /* the teeth, back to front: each a sloped roof plane and its end triangle, in ink, so the roof reads as solid */
      for (let i = 0; i < n; i++) { const x0 = x + i * w, a = { stroke: c, 'stroke-width': 1.4, 'stroke-linejoin': 'round', fill: INK };
        el(g, 'polygon', { points: pts(V, [[x0, y, Hh + 3], [x0, y + D, Hh + 3], [x0 + w, y + D, Hh], [x0 + w, y, Hh]]), ...a });
        el(g, 'polygon', { points: pts(V, [[x0, y + D, Hh], [x0, y + D, Hh + 3], [x0 + w, y + D, Hh]]), ...a });
        for (let k = 1; k < 4; k++) line3(g, V, [[x0 + w * k / 4, y, Hh + 3 - 3 * k / 4], [x0 + w * k / 4, y + D, Hh + 3 - 3 * k / 4]], { stroke: c === LINE ? THIN : c, sw: .8 }); }
      faceY(g, V, x, y + D, 0, L, 2.2, 1, [], { stroke: c === LINE ? THIN : c });
    } }); },
  /* Optimus: a humanoid in front elevation, 1.73 m drawn at 9x, standing in the x-z plane on a plinth */
  optimus(S, V, x, y, c, g0, dashed) { box(S, V, x, y, 0, 12, 8, 1, { stroke: c });
    S.add(V.depth(x + 12, y + 8, 0) + 1, (g) => {
      const k = 15.5 / 173, cxp = x + 6, z0 = 1, P = (u, w) => [cxp + u * k, y + 4, z0 + w * k];
      /* half outline (cm, from the centre line out), mirrored: head, neck, shoulder, arm, hand, hip, leg, foot */
      const half = [[0, 173], [9, 171], [11, 160], [9, 150], [6, 147], [7, 143], [21, 140], [25, 132], [27, 108], [26, 86], [24, 80], [21, 84], [20, 108], [18, 122], [17, 100], [15, 92], [14, 50], [15, 6], [16, 0], [4, 0], [5, 50], [3, 84], [0, 86]];
      const pl = [...half, ...half.slice(1, -1).reverse().map(([u, w]) => [-u, w])].map(([u, w]) => P(u, w));
      el(g, 'polygon', { points: pts(V, pl), fill: INK, stroke: c, 'stroke-width': 1.6, 'stroke-dasharray': dashed ? '6 5' : 'none' });
      line3(g, V, [P(-10, 140), P(10, 140)], { stroke: c === LINE ? THIN : c, sw: 1 });
      line3(g, V, [P(-6, 159), P(6, 159)], { stroke: c === LINE ? THIN : c, sw: 1.2 });
    }); },
  /* Cybercab: a two-seat coupe, about 4.3 m long, drawn at 4x; the profile extruded across its width; two wheels on the near side */
  cybercab(S, V, x, y, c) { const k = 4.2;
    const prof = [[0, .35], [.1, .75], [1.1, .95], [2.0, 1.45], [2.95, 1.35], [4.3, .95], [4.3, .4], [4.1, .3], [.2, .3]].map(([u, w]) => [x + u * k, w * k]);
    extrude(S, V, prof, y, 8, { stroke: c, detail: (g, V) => {
      [.95, 3.35].forEach(u => { ringY(g, V, x + u * k, y + 8, .36 * k, .36 * k, { stroke: c }); ringY(g, V, x + u * k, y + 8, .36 * k, .16 * k, { stroke: c === LINE ? THIN : c, fill: 'none' }); });
      line3(g, V, [[x + 1.15 * k, y + 8, .98 * k], [x + 2.0 * k, y + 8, 1.4 * k], [x + 2.9 * k, y + 8, 1.32 * k], [x + 3.0 * k, y + 8, 1.0 * k], [x + 1.15 * k, y + 8, .98 * k]], { stroke: c === LINE ? THIN : c, sw: 1.2 });
    } }); },
  /* a data hall: the house model at small scale, racks lit when live */
  hall(S, V, x, y, c, g0) { const Vd = sub(V, x, y, 0, .3); dcModel(g0, Vd, { show: ['shell', 'gallery', 'racks', 'cooling'], gold: c === LINE ? [] : ['racks'] }); },
  /* AI: a row of racks carrying the model, Grok's mark laid on its roof */
  grok(S, V, x, y, c) { box(S, V, x, y, 0, 16, 5, 7.5, { stroke: c, detail: (g, V) => {
      faceY(g, V, x, y + 5, 0, 16, 7.5, 1.6, [.2, .4, .6, .8], { stroke: c === LINE ? THIN : c });
      const h = 2.6, w = logoW('grok', h), M = onZ(V, x + (16 - w) / 2, y + (5 - h) / 2, 7.5); logo(el(g, 'g', { transform: M }), 'grok', 0, 0, h);
    } }); },
  /* a Starlink satellite: a flat bus and two long solar wings, held in orbit over its ground mark */
  starlink(S, V, x, y, c) { const z = 13;
    S.add(V.depth(x + 8, y + 8, 0) - 50, (g) => { line3(g, V, [[x + 8, y + 4, 0], [x + 8, y + 4, z - .2]], { stroke: 'rgba(245,241,229,.3)', sw: 1.2, dash: '3 5' });
      ring(g, V, x + 8, y + 4, 0, 3, { stroke: 'rgba(245,241,229,.3)', sw: 1.2 }); });
    box(S, V, x - 6, y + 2.5, z + .4, 8, 3, .25, { stroke: c, sw: 1.3, bias: 2, detail: (g, V) => { for (let u = x - 4; u < x + 2; u += 2) line3(g, V, [[u, y + 2.5, z + .65], [u, y + 5.5, z + .65]], { stroke: c === LINE ? THIN : c, sw: 1 }); } });
    box(S, V, x + 4, y + 2, z, 8, 4, 1.2, { stroke: c, bias: 3 });
    box(S, V, x + 14, y + 2.5, z + .4, 8, 3, .25, { stroke: c, sw: 1.3, bias: 4, detail: (g, V) => { for (let u = x + 16; u < x + 22; u += 2) line3(g, V, [[u, y + 2.5, z + .65], [u, y + 5.5, z + .65]], { stroke: c === LINE ? THIN : c, sw: 1 }); } }); },
  /* Starship on its mount (the cake's layer-1 model at a smaller scale) */
  starship(S, V, x, y, c) { cakeLaunch(S, sub(V, x - 4, y - 2, 0, .16), { gold: c !== LINE }); }
};
