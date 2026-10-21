/* tesla-spacex v2 · helpers for the cake's own layer scenes (Ive's studio, 20 Oct 2026). Load after sf.js.
   globeView(cx, cy, R, lon0, lat0)   an orthographic view of the Earth (a drafting projection: the limb, the coast, the graticule;
                                      no shading, no light, no glow). P(lon, lat, r) -> [x, y, depth]; depth < 0 is the far side.
   drawGlobe(g, G, geo, opt)          the limb, a 15° graticule and the coast (Natural Earth, assets/geo/world.js), near side only.
   starlinkShells(n)                  n satellites placed on Starlink's four shells (53°, 43°, 70°, 97.6° inclination; 530-570 km),
                                      planes evenly spaced, satellites evenly phased. The total is the count; the split between shells
                                      is a drawing convention (no keyed split), so a frame never labels a shell. */
function globeView(cx, cy, R, lon0, lat0) {
  const d2r = Math.PI / 180, l0 = lon0 * d2r, p0 = lat0 * d2r, s0 = Math.sin(p0), c0 = Math.cos(p0);
  const P = (lon, lat, r = 1) => { const l = lon * d2r, p = lat * d2r, cp = Math.cos(p), sp = Math.sin(p), dl = l - l0;
    const x = cp * Math.sin(dl), y = c0 * sp - s0 * cp * Math.cos(dl), z = s0 * sp + c0 * cp * Math.cos(dl);
    return [cx + R * r * x, cy - R * r * y, z * r]; };
  /* a point given in Earth-centred Cartesian (x toward lon 0, z to the north pole), any radius */
  const PV = (X, Y, Z) => { const r = Math.hypot(X, Y, Z), lat = Math.asin(Z / r) / d2r, lon = Math.atan2(Y, X) / d2r; return P(lon, lat, r); };
  return { P, PV, cx, cy, R };
}
function drawGlobe(g, G, geo, opt = {}) {
  el(g, 'circle', { cx: G.cx, cy: G.cy, r: G.R, fill: 'var(--bg)', stroke: opt.limb || 'rgba(245,241,229,.85)', 'stroke-width': 2.2 });
  const seg = (list) => { let d = '', pen = false; list.forEach(([lo, la]) => { const [x, y, z] = G.P(lo, la); if (z > 0) { d += (pen ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); pen = true; } else pen = false; }); return d; };
  let gr = '';
  for (let lo = -180; lo < 180; lo += 15) { const l = []; for (let la = -90; la <= 90; la += 3) l.push([lo, la]); gr += seg(l); }
  for (let la = -75; la <= 75; la += 15) { const l = []; for (let lo = -180; lo <= 180; lo += 3) l.push([lo, la]); gr += seg(l); }
  el(g, 'path', { d: gr, fill: 'none', stroke: 'rgba(245,241,229,.12)', 'stroke-width': 1 });
  if (geo) el(g, 'path', { d: geo.layers.coast.map(seg).join(''), fill: 'none', stroke: opt.coast || 'rgba(245,241,229,.6)', 'stroke-width': 1.3 });
}
function starlinkShells(n) {
  const shells = [[53, 1 + 550 / 6371, 72, .48], [43, 1 + 530 / 6371, 28, .26], [70, 1 + 570 / 6371, 36, .15], [97.6, 1 + 560 / 6371, 10, .11]];
  const out = []; let left = n;
  shells.forEach(([inc, r, planes, f], si) => {
    const m = si === shells.length - 1 ? left : Math.round(n * f); left -= m;
    const per = Math.ceil(m / planes), i = inc * Math.PI / 180;
    for (let k = 0; k < m; k++) {
      const p = k % planes, j = Math.floor(k / planes), O = p / planes * Math.PI * 2, u = (j / per + p * .37 / planes) * Math.PI * 2;
      out.push([r * (Math.cos(O) * Math.cos(u) - Math.sin(O) * Math.sin(u) * Math.cos(i)), r * (Math.sin(O) * Math.cos(u) + Math.cos(O) * Math.sin(u) * Math.cos(i)), r * Math.sin(u) * Math.sin(i), si, p]);
    }
  });
  return out;
}
