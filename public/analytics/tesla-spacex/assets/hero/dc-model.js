/* The house data-centre model, one AI data centre in true metres, drawn with iso.js. Built once:
   b030 draws it as CAD, b031 runs it as a token factory, H3 explodes it into its stack, H4 zooms into one hall.
   Geometry (metres; x along the rows, y across them, z up):
   - the building: 60 x 40 m, 12 m walls; roof off and the near walls cut at 1.2 m (the section, hatched as cut);
     an electrical gallery along the back wall (switchboards); five pods of liquid-cooled racks, each pod two rows back to
     back around a contained hot aisle (rack 0.6 x 1.2 x 2.3 m, 80 to a row, the size of an NVL72 rack); a coolant
     distribution unit at each pod's end; busway over every row; the network tray over the pods.
   - outside: the substation (three transformers with radiators, the line gantry, the control room) fed by a transmission
     line; dry coolers in the yard on the far side (fans on top); generators in a row along the front; the plot, dashed.
   opts.show: which parts to draw. opts.gold: which parts carry the accent ('power', 'racks', 'cooling', 'network').
   opts.z: a z offset per part, for the exploded stack (H3). No labels here: a frame adds only the words its spec allows. */
const DC = { W: 60, D: 40, H: 12, rack: { w: .6, d: 1.2, h: 2.3 }, rowX: [4, 52], pods: [7, 12.4, 17.8, 23.2, 28.6] };

function dcModel(svg, V, opts = {}) {
  const show = new Set(opts.show || ['grid', 'plot', 'substation', 'line', 'shell', 'gallery', 'racks', 'cooling', 'generators', 'network', 'power']);
  const gold = new Set(opts.gold || []);
  const Z = Object.assign({ plot: 0, substation: 0, shell: 0, racks: 0, cooling: 0, generators: 0 }, opts.z || {});
  const S = scene(), g = el(svg, 'g', { 'stroke-linejoin': 'round' });
  const C = (part, c = LINE) => gold.has(part) ? GOLDC : c;
  const FILLG = 'rgba(212,175,55,1)';

  /* ---- the ground: the blueprint grid and the plot ---- */
  const [px0, py0, px1, py1] = opts.plot || [-30, -4, 82, 52];
  if (show.has('grid')) S.add(-1e7, (gg) => {
    for (let x = px0; x <= px1; x += 4) line3(gg, V, [[x, py0, Z.plot], [x, py1, Z.plot]], { stroke: 'rgba(245,241,229,.07)', sw: 1 });
    for (let y = py0; y <= py1; y += 4) line3(gg, V, [[px0, y, Z.plot], [px1, y, Z.plot]], { stroke: 'rgba(245,241,229,.07)', sw: 1 });
  });
  if (show.has('plot')) plate(S, V, [[px0, py0], [px1, py0], [px1, py1], [px0, py1]], Z.plot, { stroke: C('land', 'rgba(245,241,229,.6)'), dash: '10 8', sw: 2, depth: -9e6 });

  /* ---- power: the line in, the substation, the feeders ---- */
  if (show.has('line')) S.add(-8e6, (gg) => {
    const pc = C('power', 'rgba(245,241,229,.7)');
    [10, 14, 18].forEach(y => line3(gg, V, [[-70, y - 30, 16 + Z.substation], [-24, y, 11.5 + Z.substation]], { stroke: pc, sw: 1.8 }));
  });
  if (show.has('substation')) {
    const z = Z.substation;
    plate(S, V, [[-28, 4], [-6, 4], [-6, 34], [-28, 34]], z, { stroke: 'rgba(245,241,229,.55)', sw: 1.6, depth: -8.5e6 });
    // the gantry: two H-frames that catch the line
    [[-24, 8], [-24, 20]].forEach(([x, y]) => {
      box(S, V, x, y, z, .5, .5, 12, { stroke: C('power') });
      box(S, V, x, y + 3.5, z, .5, .5, 12, { stroke: C('power') });
      box(S, V, x, y, z + 11.5, .5, 4, .5, { stroke: C('power') });
    });
    // three transformers with radiator fins and bushings
    [8, 16, 24].forEach(y => box(S, V, -16, y, z, 4, 5, 3.6, { stroke: C('power'), detail: (gg, V) => {
      faceY(gg, V, -16, y + 5, z, 4, 3.0, .45, [], { stroke: C('power', THIN) });
      faceX(gg, V, -12, y, z, 5, 3.0, .45, [], { stroke: C('power', THIN) });
      [1, 2, 3].forEach(i => line3(gg, V, [[-14, y + i * 1.25, z + 3.6], [-14, y + i * 1.25, z + 5.2]], { stroke: C('power'), sw: 1.6 }));
    } }));
    box(S, V, -27, 26, z, 6, 7, 4, { detail: (gg, V) => faceY(gg, V, -27, 33, z, 6, 4, 1.5, [.5]) });       // control room
    // feeders: transformers to the building's electrical gallery in a buried duct bank, so drawn as hidden lines (dashed)
    if (opts.feeders !== false) S.add(9e4, (gg) => [10.5, 13, 15.5].forEach((y, i) => line3(gg, V, [[-12, y + i * 5.5, z], [-4 - i, y + i * 5.5, z], [-4 - i, 1.7 + i * .3, z], [3 + i * 9, 1.7 + i * .3, Z.racks]],
      { stroke: C('power', 'rgba(245,241,229,.6)'), sw: 2, dash: '7 6' })));
  }

  /* ---- the building: slab, back walls full height, near walls cut at 1.2 m with the cut hatched ---- */
  if (show.has('shell')) {
    const z = Z.shell, W = DC.W, D = DC.D, H = DC.H, t = .5, cut = 1.2, sc = C('building');
    plate(S, V, [[0, 0], [W, 0], [W, D], [0, D]], z, { stroke: sc, sw: 2, depth: -6e6 });
    box(S, V, 0, 0, z, W, t, H, { stroke: sc, sw: 2, bias: -1e5, detail: (gg, V) => {          // back wall, its pilasters every 7.5 m
      for (let x = 7.5; x < W; x += 7.5) line3(gg, V, [[x, t, z], [x, t, z + H]], { stroke: THIN, sw: 1 });
    } });
    box(S, V, 0, 0, z, t, D, H, { stroke: sc, sw: 2, bias: -1e5, detail: (gg, V) => {
      for (let y = 8; y < D; y += 8) line3(gg, V, [[t, y, z], [t, y, z + H]], { stroke: THIN, sw: 1 });
    } });
    box(S, V, 0, D - t, z, W, t, cut, { stroke: sc, sw: 2, top: 'url(#hatch)', bias: 1e5 });
    box(S, V, W - t, 0, z, t, D, cut, { stroke: sc, sw: 2, top: 'url(#hatch)', bias: 1e5 });
  }
  /* the electrical gallery along the back wall: switchboard line-ups */
  if (show.has('gallery')) {
    const z = Z.racks;
    for (let x = 3; x < 57; x += 9) box(S, V, x, 1.2, z, 7.4, 1.0, 2.2, { stroke: C('power'), detail: (gg, V) => faceY(gg, V, x, 2.2, z, 7.4, 2.2, .8, [.15]) });
  }

  /* ---- the halls: pods of racks around contained hot aisles ---- */
  if (show.has('racks')) {
    const z = Z.racks, [x0, x1] = DC.rowX, r = DC.rack, L = x1 - x0, rc = gold.has('racks');
    DC.pods.forEach(y0 => {
      const st = { stroke: rc ? GOLDC : LINE, sw: 1.6 };
      box(S, V, x0, y0, z, L, r.d, r.h, st);                                                    // row A (faces back)
      box(S, V, x0, y0 + r.d, z, L, 1.2, r.h + .4, { ...st, top: 'url(#hatchDim)' });           // the contained hot aisle
      box(S, V, x0, y0 + r.d + 1.2, z, L, r.d, r.h, { ...st, sy: rc ? FILLG : INK, detail: (gg, V) =>
        faceY(gg, V, x0, y0 + 2 * r.d + 1.2, z, L, r.h, r.w, [], { stroke: rc ? 'var(--bg)' : THIN, sw: rc ? 1.1 : 1 }) });
      box(S, V, x1 + .8, y0 + .4, z, 1.0, 2.8, 2.2, { stroke: C('cooling') });                   // the CDU at the pod's end
    });
    if (show.has('power')) S.add(5e4, (gg) => DC.pods.forEach(y0 => [y0 + .6, y0 + 3.0].forEach(y =>
      line3(gg, V, [[x0, y, z + 3.4], [x1, y, z + 3.4]], { stroke: C('power', 'rgba(245,241,229,.55)'), sw: 1.6 }))));
    if (show.has('network')) S.add(6e4, (gg) => {
      const nc = C('network', 'rgba(245,241,229,.5)');
      DC.pods.forEach(y0 => line3(gg, V, [[x0, y0 + 1.8, z + 4.2], [x1 - 2, y0 + 1.8, z + 4.2]], { stroke: nc, sw: 1.6, dash: '6 5' }));
      line3(gg, V, [[x0 + 1, DC.pods[0] + 1.8, z + 4.2], [x0 + 1, DC.pods[4] + 1.8, z + 4.2]], { stroke: nc, sw: 1.6, dash: '6 5' });
    });
  }

  /* ---- cooling: chilled-water pipes out to the dry coolers in the yard ---- */
  if (show.has('cooling')) {
    const z = Z.cooling;
    plate(S, V, [[63, 1], [79, 1], [79, 39], [63, 39]], z, { stroke: 'rgba(245,241,229,.45)', sw: 1.4, depth: -5e6 });
    S.add(-4.5e6, (gg) => [3.2, 4.0].forEach(dz => line3(gg, V, [[DC.W, 20, dz + z], [64, 20, dz + z]], { stroke: C('cooling', 'rgba(245,241,229,.6)'), sw: 2 })));
    for (let y = 2; y < 38; y += 3.5) box(S, V, 64, y, z, 14, 2.4, 2.6, { bias: 2e5, stroke: C('cooling'), detail: (gg, V) => {
      for (let i = 0; i < 5; i++) ring(gg, V, 65.4 + i * 2.8, y + 1.2, z + 2.6, .95, { stroke: C('cooling', THIN), sw: 1.1 });
    } });
  }

  /* ---- generators along the front ---- */
  if (show.has('generators')) {
    const z = Z.generators;
    [2, 16, 30, 44].forEach(x => {
      box(S, V, x, 44, z, 12, 2.6, 3, { bias: 2e5, detail: (gg, V) => faceY(gg, V, x, 46.6, z, 12, 3, 2, [.5]) });
      box(S, V, x + 9.5, 44.6, z + 3, .5, .5, 2.2, { bias: 2e5 });
    });
  }

  S.paint(g);
  return g;
}

/* ---- the land: a block of ground cut as a site section (H3's "land", reusable by b030 and H4) ----
   Natural ground in true metres around a graded pad. The pad is the plot (opts.plot), flat at z = 0 because a data centre is
   built on a levelled platform; outside it the ground blends back to its natural shape over a 7 m embankment. Natural ground:
   a low rise behind the site and a gentle fall to the front, about 6 m of relief across the block, the kind of ground a plot
   survey shows. Drawn as a surveyor would: contours every 0.5 m (every 2 m heavier, the index contours), never on the pad; the
   block's two near faces cut as a section, the ground line on top, the topsoil line under it and the earth hatched below.
   opts: block [x0, y0, x1, y1] (metres), plot [x0, y0, x1, y1], depth (m below the pad), z (the layer's offset, H3 explodes it),
   gold (true: the accent, for "lighting" the land in H3's chain). */
function dcTerrain(svg, V, opts = {}) {
  const [bx0, by0, bx1, by1] = opts.block || [-42, -14, 78, 58], [px0, py0, px1, py1] = opts.plot || [-30, -4, 66, 50];
  const Z = opts.z || 0, DEPTH = opts.depth || 7, gold = !!opts.gold;
  const nat = (x, y) => 3.4 * Math.exp(-((x - bx0) ** 2 + (y - by0) ** 2) / 1400) + 0.9 * Math.sin(x / 11 + .7) * Math.sin(y / 8.5 + .3)
    - 0.032 * ((x - bx0) + (y - by0)) + 1.6;
  const out = (x, y) => Math.hypot(Math.max(px0 - x, 0, x - px1), Math.max(py0 - y, 0, y - py1));
  const sm = (u) => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
  const h = (x, y) => nat(x, y) * sm(out(x, y) / 7);
  const g = el(svg, 'g', { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  const LN = gold ? GOLDC : LINE, CT = gold ? 'rgba(212,175,55,.5)' : 'rgba(245,241,229,.34)', CI = gold ? 'rgba(212,175,55,.8)' : 'rgba(245,241,229,.58)';

  /* the soil pattern: earth in section (two sets of diagonals, the second sparse) */
  const d = svg.querySelector('defs') || el(svg, 'defs');
  if (!svg.querySelector('#soil')) {
    const p = el(d, 'pattern', { id: 'soil', width: 12, height: 12, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    el(p, 'rect', { width: 1.8, height: 12, fill: 'rgba(245,241,229,.42)' });
    el(p, 'rect', { x: 6, width: 1.2, height: 5, fill: 'rgba(245,241,229,.26)' });
  }

  /* the two cut faces: +x (x = bx1) and +y (y = by1), each from the section floor up to the ground line */
  const N = 60, prof = (f) => Array.from({ length: N + 1 }, (_, i) => f(i / N));
  const faceXp = prof(u => [bx1, by0 + (by1 - by0) * u]), faceYp = prof(u => [bx0 + (bx1 - bx0) * u, by1]);
  [[faceXp, [bx1, by1], [bx1, by0]], [faceYp, [bx1, by1], [bx0, by1]]].forEach(([pr, e1, e0]) => {
    const top = pr.map(([x, y]) => [x, y, Z + h(x, y)]);
    const poly = [...top, [e1[0], e1[1], Z - DEPTH], [e0[0], e0[1], Z - DEPTH]];
    el(g, 'polygon', { points: pts(V, poly), fill: 'url(#soil)', stroke: LN, 'stroke-width': 1.8 });
    line3(g, V, pr.map(([x, y]) => [x, y, Z + h(x, y) - .8]), { stroke: THIN, sw: 1 });           // the topsoil line
  });

  /* the ground surface: contours by marching squares on a 1 m grid, every 0.5 m, index every 2 m; the pad stays clean */
  const st = 1, nx = Math.round((bx1 - bx0) / st), ny = Math.round((by1 - by0) / st);
  const H = []; for (let j = 0; j <= ny; j++) { H.push([]); for (let i = 0; i <= nx; i++) H[j].push(h(bx0 + i * st, by0 + j * st)); }
  let lo = Infinity, hi = -Infinity; H.flat().forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
  for (let lv = Math.ceil(lo * 2) / 2; lv <= hi; lv += .5) {
    if (Math.abs(lv) < 1e-6) continue;
    const segs = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [bx0 + a * st, by0 + b * st, H[b][a]]);
      const hit = [];
      for (let e = 0; e < 4; e++) { const A = c[e], B = c[(e + 1) % 4];
        if ((A[2] - lv) * (B[2] - lv) < 0) { const u = (lv - A[2]) / (B[2] - A[2]); hit.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]); } }
      if (hit.length >= 2) segs.push([hit[0], hit[1]]); if (hit.length === 4) segs.push([hit[2], hit[3]]);
    }
    const idx = Math.abs(lv % 2) < 1e-6;
    el(g, 'path', { d: segs.map(([a, b]) => { const [x1, y1] = V.P(a[0], a[1], Z + lv), [x2, y2] = V.P(b[0], b[1], Z + lv);
      return `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`; }).join(''), fill: 'none', stroke: idx ? CI : CT, 'stroke-width': idx ? 1.5 : 1 });
  }
  /* the far edges of the block, the ground line along them */
  line3(g, V, prof(u => [bx0 + (bx1 - bx0) * u, by0]).map(([x, y]) => [x, y, Z + h(x, y)]), { stroke: LN, sw: 1.4 });
  line3(g, V, prof(u => [bx0, by0 + (by1 - by0) * u]).map(([x, y]) => [x, y, Z + h(x, y)]), { stroke: LN, sw: 1.4 });
  /* the plot: the graded pad's edge, dashed (a boundary), with a survey mark at each corner */
  line3(g, V, [[px0, py0, Z], [px1, py0, Z], [px1, py1, Z], [px0, py1, Z], [px0, py0, Z]], { stroke: gold ? GOLDC : 'rgba(245,241,229,.7)', sw: 2, dash: '10 8' });
  [[px0, py0], [px1, py0], [px1, py1], [px0, py1]].forEach(([x, y]) => {
    line3(g, V, [[x - 1.6, y, Z], [x + 1.6, y, Z]], { stroke: LN, sw: 1.6 }); line3(g, V, [[x, y - 1.6, Z], [x, y + 1.6, Z]], { stroke: LN, sw: 1.6 });
  });
  /* trees on the natural ground, in plan symbol (a crown circle and its trunk point), never on the pad */
  if (opts.trees !== false) [[-38, -8], [-33, -12], [-24, -13], [-14, -11], [-40, 4], [-39, 16], [-37, 30], [-40, 44], [-4, -12], [8, -13], [72, -9], [75, 6]]
    .forEach(([x, y], i) => { if (out(x, y) < 3) return; const r = 2.1 + (i % 3) * .4, z = Z + h(x, y);
      ring(g, V, x, y, z, r, { stroke: gold ? GOLDC : 'rgba(245,241,229,.62)', sw: 1.3 });
      const [cx, cy] = V.P(x, y, z); el(g, 'circle', { cx, cy, r: 1.8, fill: gold ? GOLDC : 'rgba(245,241,229,.62)' }); });
  return { g, h, corner: V.P(bx0, by1, Z + h(bx0, by1)), front: V.P(bx1, by1, Z - DEPTH) };
}
