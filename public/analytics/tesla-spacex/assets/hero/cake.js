/* tesla-spacex v2 · the five-layer cake as one model (Ive, 20 Oct 2026). Shaun Maguire's five layers of SpaceX, each drawn as
   the real thing it is, on a slab, in true proportion within the layer:
     1 launch        Starship on the orbital launch mount, beside its tower (the stack about 123 m on a mount about 20 m;
                     the tower about 146 m; Starship's 9 m diameter)
     2 connectivity  the world, equirectangular (Natural Earth, assets/geo/world.js), with Starlink's ground tracks at the
                     53° shell and the satellites on them
     3 compute       the house AI data centre (dc-model.js, Nebius), racks lit gold: a generic hall, never claimed as a named site
     4 models, apps  the three marks (Grok, X, Cursor) laid flat on their own pads
     5 other bets    planned, so dashed: the slab and a fab drawn as an outline (Terafab is a framework, not yet a factory)
   One model serves the overview, every layer's own scene and the re-assembled cake (build once). No figure lives here: the
   frame that uses a figure reads it from data.js. Load after iso.js, sf2.js and dc-model.js (and assets/geo/world.js for 2). */
const CAKE = { W: 110, D: 64, T: 7, P: 62, names: ['launch', 'connectivity', 'compute', 'models and the apps', 'other bets'] };

/* layer 1: the launch site, in metres, origin at the pad's corner; drawn into a scene through a sub() view */
function cakeLaunch(S, V, opt = {}) {
  const C = opt.gold ? GOLDC : LINE;
  /* the pad: a concrete deck with its flame trench */
  box(S, V, 0, 0, 0, 90, 70, 1.2, { stroke: LINE, sw: 1.4, bias: -1e6, detail: (g, V) => line3(g, V, [[30, 35, 1.2], [70, 35, 1.2]], { stroke: THIN, sw: 1 }) });
  /* the orbital launch mount: a table on six legs, a ring at the top */
  const mx = 30, my = 35, mz = 1.2;
  [[-9, -9], [9, -9], [-9, 9], [9, 9], [-12, 0], [12, 0]].forEach(([dx, dy]) => box(S, V, mx + dx - 1.2, my + dy - 1.2, mz, 2.4, 2.4, 18, { stroke: C, sw: 1.4 }));
  box(S, V, mx - 14, my - 14, mz + 18, 28, 28, 4, { stroke: C, sw: 1.6, top: INK, detail: (g, V) => ring(g, V, mx, my, mz + 22, 6.5, { stroke: C, sw: 1.4 }) });
  /* Starship: Super Heavy (71 m) and Ship (52 m, its nose the last 18 m), 9 m across */
  const z0 = mz + 22;
  cyl(S, V, mx, my, z0, 4.5, 71, { stroke: C, sw: 1.6, bands: [.08, .5, .92], bias: 4 });
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => box(S, V, mx + a * 5 - 1, my + b * 5 - 1, z0 + 66, 2, 2, 4, { stroke: C, sw: 1.2, bias: 6 })); // grid fins
  cyl(S, V, mx, my, z0 + 71, 4.5, 34, { stroke: C, sw: 1.6, bands: [.5], bias: 4 });
  cyl(S, V, mx, my, z0 + 105, 4.5, 18, { r2: .6, stroke: C, sw: 1.6, bias: 4 });
  /* the tower: a square lattice 146 m tall, its arms at 100 m reaching to the stack */
  const tx = 52, ty = 28, th = 146;
  box(S, V, tx, ty, mz, 12, 12, th, { stroke: LINE, sw: 1.4, detail: (g, V) => {
    for (let z = 8; z < th; z += 8) { line3(g, V, [[tx + 12, ty, mz + z], [tx + 12, ty + 12, mz + z]], { stroke: THIN, sw: 1 }); line3(g, V, [[tx, ty + 12, mz + z], [tx + 12, ty + 12, mz + z]], { stroke: THIN, sw: 1 }); }
    for (let z = 0; z < th - 8; z += 8) { line3(g, V, [[tx + 12, ty, mz + z], [tx + 12, ty + 12, mz + z + 8]], { stroke: THIN, sw: .9 }); line3(g, V, [[tx, ty + 12, mz + z], [tx + 12, ty + 12, mz + z + 8]], { stroke: THIN, sw: .9 }); }
  } });
  [ty + 2, ty + 9].forEach(y => box(S, V, mx + 5, y, mz + 100, tx - mx - 5, 1.2, 2.4, { stroke: LINE, sw: 1.3, bias: 8 }));    // the arms
  /* the tank farm: four horizontal tanks along the pad's far edge */
  [8, 20].forEach(x => cyl(S, V, x, 8, 1.2, 4, 10, { stroke: THIN, sw: 1.2 }));
}

/* layer 2: the world on the slab's top, equirectangular, lon -180..180 by lat -58..82, filling w by d; Starlink's 53° shell as
   ground tracks (one revolution is 95.6 min, so each pass shifts west by 24°) and n satellites spaced along them */
function cakeWorld(g, V, z, w, d, opt = {}) {
  const geo = (window.BW_GEO || {}).world; if (!geo) return;
  const X = (lon) => (lon + 180) / 360 * w, Y = (lat) => (82 - lat) / 140 * d;
  const P = (lon, lat) => V.P(X(lon), Y(lat), z);
  const pth = (list) => list.map((p, i) => { const [a, b] = P(p[0], p[1]); return (i ? 'L' : 'M') + a.toFixed(1) + ',' + b.toFixed(1); }).join('');
  el(g, 'path', { d: geo.layers.coast.map(pth).join(''), fill: 'none', stroke: opt.coast || 'rgba(245,241,229,.5)', 'stroke-width': opt.coastW || 1.1 });
  /* the graticule every 30° */
  const gr = []; for (let lon = -150; lon <= 150; lon += 30) gr.push([[lon, -58], [lon, 82]]); for (let lat = -30; lat <= 60; lat += 30) gr.push([[-180, lat], [180, lat]]);
  el(g, 'path', { d: gr.map(pth).join(''), fill: 'none', stroke: 'rgba(245,241,229,.12)', 'stroke-width': 1 });
  const inc = opt.inc || 53, passes = opt.passes || 15, tracks = el(g, 'g'), dots = el(g, 'g');
  const lat = (u) => inc * Math.sin(u);                                         // u: argument of latitude
  for (let p = 0; p < passes; p++) {
    const seg = []; for (let i = 0; i <= 240; i++) { const u = i / 240 * Math.PI * 2, lon = -180 + p * (360 / passes) + (u / (2 * Math.PI)) * 336;
      seg.push([((lon + 180) % 360 + 360) % 360 - 180, lat(u)]); }
    /* break at the dateline */
    let cur = []; const parts = []; seg.forEach((q, i) => { if (i && Math.abs(q[0] - seg[i - 1][0]) > 180) { parts.push(cur); cur = []; } cur.push(q); }); parts.push(cur);
    el(tracks, 'path', { d: parts.map(pth).join(''), fill: 'none', stroke: opt.track || 'rgba(212,175,55,.42)', 'stroke-width': opt.trackW || 1 });
  }
  const n = opt.sats || 0;
  for (let i = 0; i < n; i++) {
    const p = i % passes, u = ((i * 0.618034) % 1) * Math.PI * 2, lon0 = -180 + p * (360 / passes) + (u / (2 * Math.PI)) * 336;
    const [a, b] = P(((lon0 + 180) % 360 + 360) % 360 - 180, lat(u));
    el(dots, 'circle', { cx: a.toFixed(1), cy: b.toFixed(1), r: opt.satR || 1.8, fill: opt.sat || 'var(--gold)' });
  }
}

/* layer 4: three pads, each with its mark laid flat on it */
function cakeApps(S, V, names, opt = {}) {
  const w = 26, gap = 9, x0 = 0;
  names.forEach((n, i) => {
    const x = x0 + i * (w + gap);
    box(S, V, x, 0, 0, w, w, 2, { stroke: opt.gold ? GOLDC : LINE, sw: 1.6, detail: (g, V) => {
      const h = n === 'grok' ? 7 : 12, lw = logoW(n, h), M = onZ(V, x + (w - lw) / 2, (w - h) / 2, 2);
      logo(el(g, 'g', { transform: M }), n, 0, 0, h);
    } });
  });
}

/* layer 5: planned, so dashed: a fab drawn as an outline on its plot */
function cakeBets(g, V, opt = {}) {
  const D = { stroke: opt.col || 'rgba(245,241,229,.7)', sw: 1.6, dash: '8 6' };
  wire(g, V, 0, 0, 0, 46, 26, 9, D);
  wire(g, V, 46, 4, 0, 10, 18, 5, D);
  [6, 16, 26, 36].forEach(x => wire(g, V, x, 4, 9, 6, 18, 2.2, D));                    // the roof plant
}
