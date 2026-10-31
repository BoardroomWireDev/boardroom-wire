/* KIT v2 · the $40B crate of GPUs (ch 6, how he pays for it). Ive, 28 Oct 2026, the polish pass. Same API as v1.
   An export crate in sawn pine, drawn to a real one: a 3-skid base with a deck, wall boards 1 in thick with their butt joints,
   grain, knots and nail heads, cleat rails top and bottom, battens at the corners, a Z-brace on the back and the ends, gold steel
   strapping over the rails with a crimped seal on every strap, a lid hinged on the back edge (two steel hinges) with its own
   straps; inside, on a foam bed, the GPU server trays: each a flat HGX-style tray, its top the heatsink field in fine line
   (eight GPU blocks, two CPU blocks, a fan row), its front a faceplate with a gold edge, stacked in columns to just under the rim.
   No words on it (the board paints its own stencil on the front face, at z = d/2 + .035; nothing here stands that proud).
   Proportions: v1's own box (w 4 × h 2.2 × d 2.4 on skids .16); boards 1/18 of the crate's height, a tray 1/11 of it. Wood is a warm
   brown-grey (never orange). Light comes from the stage; nothing emits. A contact shadow sits under it.

   const c = KIT.crate.create(w, { w: 4, h: 2.2, d: 2.4, at: [x, 0, z], yaw, red: false, rise, open });
     red: true only when the crate stands for debt as a loss (red only for loss); default gold strapping.
     c.s.rise 0..1, c.s.open 0..1 (the lid lifts and tips back), c.top() the world point over it (for its figure), c.w / c.h / c.d.
     c.group.children[0] is the crate's inner group (floor at y = 0, front face at z = d/2), as in v1: boards hang decals on it. */
(() => {
const T = THREE, cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
const rnd = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const CREAM = '236,230,214';
/* the line language: near-black body, the detail a cream hairline painted into the texture, and the same texture as an emissive map
   (flat ink, like a printed line: it holds on faces in shadow and is never brighter than the lit face) */
const std = (o) => new T.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: .8, metalness: .05, envMapIntensity: .25 }, o));
const ink = (map, o = {}) => std(Object.assign({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .16 }, o));
const cr = (a) => `rgba(${CREAM},${a})`;

/* sawn boards drawn as line: `rows` boards high; each board's edges, the butt joints and the nail heads in cream, a sparse grain at ~30% */
function woodPaint(g, W, H, rows, seed, nails = [], jointsOn = true) {
  const r = rnd(seed), ph = H / rows;
  g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < rows; i++) {
    const y0 = i * ph, joint = jointsOn && W / ph > 5 ? W * (.22 + r() * .56) : -1;
    const segs = joint > 0 ? [[0, joint], [joint, W]] : [[0, W]];
    g.fillStyle = r() < .5 ? '#15161a' : '#101114'; g.fillRect(0, y0, W, ph);
    segs.forEach(([a, b]) => {
      const nG = Math.round(ph / 24);
      for (let k = 0; k < nG; k++) {
        const y = y0 + 8 + r() * (ph - 16), amp = .6 + r() * 2.4, f = .004 + r() * .01, ph0 = r() * 7;
        g.strokeStyle = cr(.16 + r() * .12); g.lineWidth = 1.4 + r() * .8;
        g.beginPath(); for (let x = a + 6; x <= b - 6; x += 24) { const yy = y + Math.sin(x * f + ph0) * amp; x === a + 6 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
      }
      if (r() < .4) {                                    /* a knot: a few rings */
        const kx = a + (b - a) * (.15 + r() * .7), ky = y0 + ph * (.3 + r() * .4), kr = ph * (.06 + r() * .05);
        for (let q = 0; q < 3; q++) { g.strokeStyle = cr(.5 - q * .12); g.lineWidth = 2; g.beginPath(); g.ellipse(kx, ky, kr * (1 + q * .6) * 1.7, kr * (1 + q * .6), 0, 0, 7); g.stroke(); }
      }
    });
    g.fillStyle = cr(.92); g.fillRect(0, y0 + ph - 4, W, 4);                       /* the board's edge, full cream */
    if (joint > 0) g.fillRect(joint - 2, y0, 4, ph - 3);
    for (const u of [.014, .986, ...nails]) for (const dy of [.3, .7]) { g.fillStyle = cr(.85); g.beginPath(); g.arc(u * W, y0 + ph * dy, 4.2, 0, 7); g.fill(); }
  }
  g.strokeStyle = cr(.95); g.lineWidth = 7; g.strokeRect(3.5, 3.5, W - 7, H - 7);   /* the panel's outline */
}
const woodTex = (w, key, pw, ph, rows, seed, nails) => once(key, () => S3.canvasTex(w.renderer, pw, ph, (g, W, H) => woodPaint(g, W, H, rows, seed, nails)));
/* a heatsink block: a cream frame and its fins as hairline */
function fins(g, x, y, w, h, vertical, hi) {
  g.fillStyle = '#0c0d0f'; g.fillRect(x, y, w, h);
  g.strokeStyle = cr(.3); g.lineWidth = 1.3; g.beginPath();
  if (vertical) for (let u = x + 5; u < x + w - 4; u += 4.4) { g.moveTo(u, y + 5); g.lineTo(u, y + h - 5); }
  else for (let v = y + 5; v < y + h - 4; v += 4.4) { g.moveTo(x + 5, v); g.lineTo(x + w - 5, v); }
  g.stroke();
  g.strokeStyle = cr(.95); g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}
/* the top of a tray (what you see looking into the crate): 384 × 560, the front (gold edge) at the bottom */
const trayTop = (w, gold) => once('ttop' + gold, () => S3.canvasTex(w.renderer, 384, 560, (g, W, H) => {
  g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) fins(g, 22 + j * 176, 22 + i * 74, 164, 66, i % 2 === 0);     /* eight GPU blocks */
  for (let j = 0; j < 2; j++) fins(g, 22 + j * 176, 328, 164, 74, false);                                                /* two CPU blocks */
  for (let j = 0; j < 4; j++) {                                                                                           /* the fan row */
    const cx = 52 + j * 93, cy = 478, R = 36;
    g.strokeStyle = cr(.55); g.lineWidth = 1.6; for (let q = R * .3; q < R; q += R / 4) { g.beginPath(); g.arc(cx, cy, q, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.strokeStyle = cr(.95); g.lineWidth = 3.2; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
  }
  g.fillStyle = gold; g.fillRect(0, H - 11, W, 11);                                                                       /* the gold edge */
  g.strokeStyle = cr(.95); g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 17);
}));
/* a tray's front, one tile per tray: vents, drive bays, handles in cream line; the gold edge along its top */
const trayFront = (w, gold) => once('tfront' + gold, () => S3.canvasTex(w.renderer, 512, 192, (g, W, H) => {
  g.fillStyle = '#101114'; g.fillRect(0, 0, W, H);
  g.fillStyle = gold; g.fillRect(3, 10, W - 6, 8);                                                  /* the gold-edged front */
  g.strokeStyle = cr(.95); g.lineWidth = 4; g.strokeRect(3, 10, W - 6, H - 20);
  g.fillStyle = cr(.32); for (let y = 36; y < H - 34; y += 14) for (let x = 36; x < 238; x += 10) g.fillRect(x, y, 5, 5);                 /* the vent field */
  g.strokeStyle = cr(.9); g.lineWidth = 2.6;
  for (let i = 0; i < 4; i++) { const x = 262 + i * 44; g.strokeRect(x + 2, 42, 32, 88); g.beginPath(); g.moveTo(x + 11, 118); g.lineTo(x + 25, 118); g.stroke(); }
  for (const x of [14, W - 26]) g.strokeRect(x, 48, 12, 80);                                         /* the pull handles */
}));
const traySide = (w) => once('tside', () => S3.canvasTex(w.renderer, 128, 192, (g, W, H) => {
  g.fillStyle = '#101114'; g.fillRect(0, 0, W, H); g.fillStyle = cr(.8); g.fillRect(0, 0, W, 4); g.fillRect(0, H - 4, W, 4);
  g.fillStyle = cr(.3); for (let x = 20; x < W - 10; x += 14) g.fillRect(x, 62, 5, 68);
}));
const rep = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = T.RepeatWrapping; c.repeat.set(rx, ry); return c; };

KIT.crate = { create(w, o = {}) {
  const B = KIT.box, W = o.w ?? 4, H = o.h ?? 2.2, D = o.d ?? 2.4, sk = .16, box0 = sk, t = .06, g = new T.Group();
  const band = o.red ? w.mat.red : w.mat.trim, gold = o.red ? S3.css('--red') : S3.css('--gold');
  const edge = std({ color: 0x08090a }), rail = ink(woodTex(w, 'rail', 1024, 128, 1, 9)), skidM = edge;
  const ppu = 500;                                       /* texture pixels a unit */
  const rowsH = Math.max(4, Math.round(H / .36));
  const frontT = woodTex(w, `f${W}x${H}`, Math.round(W * ppu), Math.round(H * ppu), rowsH, 11, [.3, .7]);
  const sideT = woodTex(w, `s${D}x${H}`, Math.round(D * ppu), Math.round(H * ppu), rowsH, 23, [.3, .7]);
  const lidT = woodTex(w, `l${W}x${D}`, Math.round((W + .04) * ppu), Math.round((D + .06) * ppu), Math.max(4, Math.round(D / .32)), 37, []);
  const face = (tex) => ink(tex);
  const fM = face(frontT), sM = face(sideT), lidM = ink(lidT);
  /* the base: three skids (timbers with chamfered edges) and the deck */
  for (const z of [-D * .36, 0, D * .36]) g.add(KIT.bbox(W, sk, .22, skidM, 0, sk / 2, z, .014));
  g.add(B(W - .02, .05, D - .02, edge, 0, box0 + .025, 0));
  /* the walls: front and back (grain along x), the ends between them */
  g.add(B(W, H, t, [edge, edge, edge, edge, fM, fM], 0, box0 + H / 2, D / 2 - t / 2), B(W, H, t, [edge, edge, edge, edge, fM, fM], 0, box0 + H / 2, -D / 2 + t / 2));
  g.add(B(t, H, D - 2 * t, [sM, sM, edge, edge, edge, edge], W / 2 - t / 2, box0 + H / 2, 0), B(t, H, D - 2 * t, [sM, sM, edge, edge, edge, edge], -W / 2 + t / 2, box0 + H / 2, 0));
  /* a dressed face: cleat rails, corner battens, optionally a Z-brace, straps over the rails and the brace, one seal on each */
  const dress = (span, o2) => {
    const d = new T.Group(), bump = [[.1, .12], [H - .1, .12]], bt = .02;
    d.add(B(span - .22, .12, bt, rail, 0, .1, bt / 2), B(span - .22, .12, bt, rail, 0, H - .1, bt / 2));
    for (const s of [-1, 1]) d.add(B(.11, H, bt, edge, s * (span / 2 - .055), H / 2, bt / 2));
    if (o2.brace) {
      const dx = span - .22, dy = H - .44, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx), sg = o2.brace;
      const br = B(L, .1, bt * .9, rail, 0, H / 2, bt * .45); br.rotation.z = a * sg; d.add(br);
      o2.straps.forEach(x => { const yc = H / 2 + sg * x * dy / dx; bump.push([yc, .1 / Math.cos(a) + .02]); });
    }
    o2.straps.forEach((x, i) => {
      d.add(B(.06, H, .012, band, x, H / 2, .006));
      bump.forEach(([yc, hh]) => d.add(B(.06, hh + .014, .012, band, x, yc, .026)));
      const ys = H * (i ? .56 : .46);
      const seal = KIT.bbox(.1, .06, .022, band, x, ys, .02 + .011, .006); d.add(seal);
      for (const dy of [-.014, .014]) d.add(B(.1, .004, .002, w.mat.steel, x, ys + dy, .0335));
    });
    d.position.y = box0; return d;
  };
  const place = (d, rot, x, z) => { d.rotation.y = rot; d.position.x = x; d.position.z = z; g.add(d); };
  place(dress(W, { straps: [-W * .3, W * .3] }), 0, 0, D / 2);
  place(dress(W, { straps: [-W * .3, W * .3], brace: 1 }), Math.PI, 0, -D / 2);
  place(dress(D, { straps: [-D * .3, D * .3], brace: 1 }), Math.PI / 2, W / 2, 0);
  place(dress(D, { straps: [-D * .3, D * .3], brace: -1 }), -Math.PI / 2, -W / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(B(.02, H, .02, edge, sx * (W / 2 + .01), box0 + H / 2, sz * (D / 2 + .01)));
  /* the foam bed and the trays on it */
  const foam = std({ color: 0x101114, roughness: .9 });
  g.add(B(W - 2 * t - .02, .04, D - 2 * t - .02, foam, 0, box0 + .07, 0));
  const iw = W - 2 * t - .08, id = D - 2 * t - .08, nx = Math.max(2, Math.round(iw / .55)), nz = Math.max(1, Math.round(id / .76));
  const cw = iw / nx - .025, cd = id / nz - .025, top = H - .16, y0 = box0 + .09, sh = top - .09, layers = Math.max(3, Math.round(sh / .2));
  const front = ink(rep(trayFront(w, gold), 1, layers)), side = ink(rep(traySide(w), 1, layers));
  const topM = ink((() => { const m = rep(trayTop(w, gold), 1, -1); m.offset.y = 1; return m; })());
  const tm = [side, side, topM, side, front, side], cg = new T.BoxGeometry(cw, sh, cd);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const m = new T.Mesh(cg, tm); m.position.set(-iw / 2 + (i + .5) * iw / nx, y0 + sh / 2, -id / 2 + (j + .5) * id / nz);
    m.castShadow = m.receiveShadow = true; g.add(m);
  }
  /* the lid, hinged on the back edge: boards across, two end cleats, two steel hinges, its own straps */
  const lid = new T.Group(), lb = new T.Group(), lt = .08, lD = D + .06, lz = D / 2 + .01;
  lb.add(B(W + .04, lt, lD, [edge, edge, lidM, lidM, edge, edge], 0, lt / 2, lz));
  for (const s of [-1, 1]) lb.add(B(.1, .035, lD - .1, rail, s * (W / 2 - .06), lt + .0175, lz), B(.1, .04, D - .2, rail, s * (W / 2 - .3), -.02, lz));
  for (const x of [-W * .3, W * .3]) {
    lb.add(B(.06, .012, lD, band, x, lt + .006, lz), B(.06, lt, .012, band, x, lt / 2, lz + lD / 2 + .006));
    lb.add(KIT.bbox(.1, .014, .06, band, x, lt + .019, lz, .004));
  }
  for (const z of [-D * .3, D * .3]) { lb.add(B(W + .06, .012, .06, band, 0, lt + .018, lz + z)); for (const s of [-1, 1]) lb.add(B(.012, lt, .06, band, s * (W / 2 + .026), lt / 2, lz + z)); }
  lid.add(lb);
  const barrel = (x) => { const c = KIT.cyl(.026, .026, .34, w.mat.steel, 20); c.rotation.z = Math.PI / 2; c.position.set(x, .02, .0); return c; };
  for (const x of [-W * .18, W * .18]) { lb.add(B(.34, .012, .16, w.mat.steel, x, lt + .006, .1), barrel(x)); g.add(B(.34, .16, .012, w.mat.steel, x, box0 + H - .08, -D / 2 - .006)); }
  lid.position.set(0, box0 + H, -D / 2 - .02); g.add(lid);
  const root = new T.Group(); root.add(g);
  const cs = KIT.contact(w, W + .2, D + .2, { k: .6, pad: .3 }); root.add(cs);
  const at = o.at || [0, 0, 0]; root.position.set(...at); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const hd = { group: root, w: W, h: H + sk, d: D, s: { rise: o.rise ?? 1, open: o.open ?? 0 },
    top: () => { const p = new T.Vector3(0, H + sk + .5, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
    apply() {
      g.position.y = -(H + sk + .3) * (1 - hd.s.rise); root.visible = hd.s.rise > .001;
      lid.rotation.x = -1.15 * hd.s.open;
      const air = Math.max(0, root.position.y - at[1]);                  /* a board may drop the whole crate: the shadow stays on the floor */
      cs.position.y = .003 - air; cs.set(Math.max(0, (hd.s.rise - .85) / .15) * Math.max(0, 1 - air * .35));
    } };
  return w.add(hd);
} };
})();
