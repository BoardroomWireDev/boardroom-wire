/* KIT v2 FINAL · the data hall (Ive, 28 Oct 2026, the polish pass). One hall = one gigawatt, as in v1, with the same API.
   Drawn in the Muse Secure VM's language: a near-black body, its detail carried by crisp CREAM HAIRLINE, GOLD only on the coping,
   the corners, the base line and the dock canopy's edge (the subject's line, as v1's gold-line hall). A neighbour (`line: 'grey'`)
   is the same building in grey ink.
   The geometry is a real hyperscale hall: `hgt` is ~14 m and every part is sized from it (m = hgt / 14): insulated metal cladding
   with 1.2 m panel seams and a reveal, an intake louvre bank, a parapet, a raised loading dock (two roll-up doors under a canopy),
   two rows of rooftop dry coolers on steel dunnage (each 12 m, six fans with their grilles), a stair penthouse, and behind it a
   power yard (generator enclosures, transformers on a pad). The cutaway lifts the roof and lowers the front wall onto rows of racks
   on a tiled floor, a gold cable tray over each row.
   The line is printed into the textures and also used as a faint emissive map (intensity .16), so it holds on faces in shadow:
   flat ink, never brighter than a lit face, no bloom. A contact shadow sits under the footprint.

   const h = KIT.hall.create(w, { len: 8, wid: 3.2, hgt: 1.3, at, line: 'gold' | 'grey', door, mark, markH, coolers, yard, yaw, rise });
     h.s.rise / h.s.cut / h.s.dim (dim also sinks the ink), h.top(), h.len / h.wid / h.hgt          (as v1)
     yard: false drops the power yard (it sits behind the back wall, about 0.4 × hgt deep)
   KIT.hall.row(w, gw, {...}) and KIT.hall.footprint(w, len, wid, colour) are unchanged from v1. */
(() => {
const T = THREE, cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
const BLACK = '#121316', INK = { cream: '236,230,214', grey: '139,139,144' };
const rep = (base, rx, ry = 1) => { const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return t; };
/* a near-black surface whose cream line is printed and faintly self-lit (so a line on a shaded face still reads) */
const inkMat = (map, o = {}) => new T.MeshStandardMaterial(Object.assign({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .24,
  color: 0xffffff, roughness: .8, metalness: .05, envMapIntensity: .25 }, o));
/* a line painter: c(alpha) → the ink at that alpha */
const pen = (ink) => (a) => `rgba(${INK[ink]},${a})`;
const hl = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

/* the cladding: one 18 m × 14 m bay of wall, 85 px a metre */
const cladTex = (w, ink) => once('clad' + ink, () => S3.canvasTex(w.renderer, 1536, 1024, (g, W, H) => {
  const c = pen(ink), py = H / 14, px = W / 18;
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#16171a'); gr.addColorStop(1, '#101114'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let x = 0; x <= W; x += px * 1.2) hl(g, x - 2, 0, 4, H, c(.2));                                  /* panel seams */
  hl(g, 0, py * 1.2 - 3, W, 6, c(.75));                                                                  /* parapet flashing line */
  hl(g, 0, H - py * 5.6 - 2.5, W, 5, c(.5));                                                             /* the reveal */
  hl(g, 0, H - py * .9 - 2.5, W, 5, c(.6));                                                              /* the plinth line */
  /* the intake louvre bank: six panels, 9.6–16.8 m along, 1.2–5.2 m up */
  const x0 = px * 9.6, x1 = px * 16.8, y0 = H - py * 5.2, y1 = H - py * 1.2;
  g.fillStyle = '#0c0d0f'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let y = y0 + py * .2; y < y1 - 2; y += py * .2) hl(g, x0, y - 1.5, x1 - x0, 3, c(.38));
  for (let x = x0 + px * 1.2; x < x1 - 2; x += px * 1.2) hl(g, x - 2.5, y0, 5, y1 - y0, c(.7));
  g.strokeStyle = c(1); g.lineWidth = 7; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
}));
/* a roll-up dock door, 3 × 3.5 m */
const doorTex = (w, ink) => once('door' + ink, () => S3.canvasTex(w.renderer, 256, 300, (g, W, H) => {
  const c = pen(ink); g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
  for (let y = 16; y < H - 20; y += 16) hl(g, 6, y, W - 12, 2.5, c(.35));
  g.strokeStyle = c(1); g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
  hl(g, W * .42, H - 34, W * .16, 6, c(.8));
}));
/* a dry cooler's top: 12 × 2.3 m, six 1.75 m fans, each a grille of rings */
const coolTopTex = (w, ink) => once('ctop' + ink, () => S3.canvasTex(w.renderer, 2048, 392, (g, W, H) => {
  const c = pen(ink); g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
  g.strokeStyle = c(.85); g.lineWidth = 7; g.strokeRect(4, 4, W - 8, H - 8);
  const R = H * .38;
  for (let i = 0; i < 6; i++) {
    const cx = W * (i + .5) / 6, cy = H / 2;
    if (i) hl(g, W * i / 6 - 2, 10, 4, H - 20, c(.35));
    g.strokeStyle = c(.3); g.lineWidth = 2.5;
    for (let r = R * .25; r < R - 4; r += R / 6) { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    g.strokeStyle = c(1); g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    g.fillStyle = c(.7); g.beginPath(); g.arc(cx, cy, R * .1, 0, 7); g.fill();
  }
}));
/* a cooler's side: the coil, fine fins in six panels, framed */
const coolSideTex = (w, ink) => once('cside' + ink, () => S3.canvasTex(w.renderer, 1024, 256, (g, W, H) => {
  const c = pen(ink); g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
  for (let x = 4; x < W; x += 8) hl(g, x, H * .16, 1.5, H * .68, c(.16));
  for (let x = 0; x <= W; x += W / 6) hl(g, x - 2.5, 0, 5, H, c(.55));
  hl(g, 0, 0, W, 6, c(.85)); hl(g, 0, H - 6, W, 6, c(.85)); hl(g, 0, H * .16 - 2, W, 3, c(.4)); hl(g, 0, H * .84 - 1, W, 3, c(.4));
}));
/* a generator enclosure (a 12 m container): panel seams, louvred ends */
const genTex = (w, ink) => once('gen' + ink, () => S3.canvasTex(w.renderer, 1024, 256, (g, W, H) => {
  const c = pen(ink); g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
  for (let x = W / 12; x < W - 2; x += W / 12) hl(g, x - 1, 8, 2.5, H - 16, c(.22));
  for (const x0 of [W * .03, W * .85]) { for (let y = H * .26; y < H * .78; y += 12) hl(g, x0, y, W * .12, 2.5, c(.4)); g.strokeStyle = c(.8); g.lineWidth = 4; g.strokeRect(x0, H * .2, W * .12, H * .62); }
  g.strokeStyle = c(.9); g.lineWidth = 7; g.strokeRect(4, 4, W - 8, H - 8);
}));
/* racks: five 0.6 m cabinets a tile, perforated doors */
const rackTex = (w, ink) => once('rack' + ink, () => S3.canvasTex(w.renderer, 640, 512, (g, W, H) => {
  const c = pen(ink); g.fillStyle = '#0e0f11'; g.fillRect(0, 0, W, H);
  const cw = W / 5;
  for (let i = 0; i < 5; i++) {
    const x = i * cw;
    g.fillStyle = c(.16); for (let yy = 26; yy < H - 26; yy += 9) for (let xx = x + 18; xx < x + cw - 18; xx += 9) g.fillRect(xx, yy, 2.5, 2.5);
    g.strokeStyle = c(.75); g.lineWidth = 4; g.strokeRect(x + 7, 10, cw - 14, H - 20);
    hl(g, x + cw - 20, H * .42, 4, H * .16, c(.9));
  }
}));
const tileTex = (w, ink) => once('tile' + ink, () => S3.canvasTex(w.renderer, 256, 256, (g, W, H) => {
  const c = pen(ink); g.fillStyle = '#141518'; g.fillRect(0, 0, W, H);
  for (let k = 0; k <= 4; k++) { hl(g, k * W / 4 - 1, 0, 2, H, c(.16)); hl(g, 0, k * H / 4 - 1, W, 2, c(.16)); }
}));
/* the roof membrane: 3 m sheets, welded seams */
const roofTex = (w, ink) => once('roof' + ink, () => S3.canvasTex(w.renderer, 512, 512, (g, W, H) => {
  const c = pen(ink); g.fillStyle = '#141518'; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 4; k++) hl(g, 0, k * H / 4, W, 3, c(.2));
}));

function inst(geo, mat, mats) {
  const m = new T.InstancedMesh(geo, mat, mats.length); mats.forEach((M, i) => m.setMatrixAt(i, M));
  m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; return m;
}
const at4 = (x, y, z, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion(), new T.Vector3(sx, sy, sz));

KIT.hall = {
  create(w, o = {}) {
    const B = KIT.box, len = o.len ?? 8, wid = o.wid ?? 3.2, hgt = o.hgt ?? 1.3, m = hgt / 14;
    const t = o.t ?? Math.max(.018, hgt * .022), wt = Math.max(.03, m * .35);
    const grey = o.line === 'grey', ink = grey ? 'grey' : 'cream';
    const trim = (grey ? w.mat.greyLine : w.mat.trim).clone(); trim.emissive = trim.color.clone(); trim.emissiveIntensity = .14;   /* the gold line holds on the far edges too */
    const inks = [];                                           /* every ink material, so `dim` can sink the line */
    const IM = (map, oo) => { const mm = inkMat(map, oo); inks.push(mm); return mm; };
    const black = new T.MeshStandardMaterial({ color: S3.col(0x121316), roughness: .8, metalness: .05, envMapIntensity: .25 });
    const g = new T.Group(), roof = new T.Group(), front = new T.Group(), inside = new T.Group();
    const bay = 18 * m, clad = cladTex(w, ink);
    const wallMat = (span) => o.body || IM(rep(clad, Math.max(1, Math.round(span / bay))));
    /* the shell: back and end walls stay; the front wall and the roof move for the cutaway */
    g.add(B(len, .02, wid, black, len / 2, .01, 0));
    g.add(B(len, hgt, wt, wallMat(len), len / 2, hgt / 2, -wid / 2 + wt / 2));
    const endM = wallMat(wid);
    g.add(B(wt, hgt, wid - wt * 2, endM, wt / 2, hgt / 2, 0), B(wt, hgt, wid - wt * 2, endM, len - wt / 2, hgt / 2, 0));
    front.add(B(len, hgt, wt, wallMat(len), len / 2, hgt / 2, 0));
    /* the loading dock: two doors raised 1.2 m, a canopy with its gold edge, bumpers, an apron */
    if (o.door !== false && len > 14 * m) {
      const dw = 3 * m, dh = 3.5 * m, y0 = 1.2 * m, dx0 = Math.min(5 * m, len * .12), dm = IM(doorTex(w, ink));
      for (let i = 0; i < 2; i++) {
        const cx = dx0 + dw / 2 + i * (dw + 1.2 * m);
        const dr = new T.Mesh(new T.PlaneGeometry(dw, dh), dm); dr.position.set(cx, y0 + dh / 2, wt / 2 + .003); dr.receiveShadow = true; front.add(dr);
        for (const s of [-1, 1]) front.add(B(.35 * m, .5 * m, .35 * m, black, cx + s * dw * .32, y0 - .3 * m, wt / 2 + .18 * m));
      }
      const cl = 2 * dw + 1.2 * m + 2.2 * m, cx = dx0 + cl / 2 - 1.1 * m, cd = 3.2 * m;
      front.add(B(cl, .3 * m, cd, black, cx, y0 + dh + 1.0 * m, wt / 2 + cd / 2));
      front.add(B(cl, t * .7, t * .7, trim, cx, y0 + dh + 1.0 * m, wt / 2 + cd));
      front.add(B(cl, y0, 2.4 * m, black, cx, y0 / 2, wt / 2 + 1.2 * m));
      front.add(B(cl, t * .45, t * .45, trim, cx, y0, wt / 2 + 2.4 * m));                         /* the dock edge, a gold line */
    }
    front.position.z = wid / 2 - wt / 2; g.add(front);
    if (o.mark) { const a = o.mark.image.width / o.mark.image.height, mh = Math.min(hgt * (o.markH ?? .26), (len * .55) / a), d = KIT.decal(o.mark, mh * a, mh); d.position.set(len - mh * a / 2 - hgt * .35, hgt * .72, wt / 2 + .004); front.add(d); }
    /* the gold line: the coping round the parapet, the four corners, and the base line round the foot */
    const crown = new T.Group();
    for (const z of [-wid / 2 + t / 2, wid / 2 - t / 2]) crown.add(B(len + t * .2, t, t * 1.3, trim, len / 2, hgt + t / 2, z));
    for (const x of [t / 2, len - t / 2]) crown.add(B(t * 1.3, t, wid, trim, x, hgt + t / 2, 0));
    for (const x of [t * .5, len - t * .5]) for (const z of [-wid / 2 + t * .5, wid / 2 - t * .5]) g.add(B(t * 1.1, hgt, t * 1.1, trim, x, hgt / 2, z));
    for (const z of [-wid / 2 + t * .4, wid / 2 - t * .4]) g.add(B(len, t * .8, t * .8, trim, len / 2, t * .4, z));
    for (const x of [t * .4, len - t * .4]) g.add(B(t * .8, t * .8, wid, trim, x, t * .4, 0));
    g.add(crown);
    /* the roof: membrane 1.2 m below the coping, two rows of dry coolers on dunnage, a stair penthouse */
    const ry = hgt - 1.2 * m;
    roof.add(B(len - wt * 2, .3 * m, wid - wt * 2, IM(rep(roofTex(w, ink), 1, (wid - wt * 2) / (12 * m))), len / 2, ry, 0));
    if (o.coolers !== false) {
      const uL = 12 * m, uW = 2.3 * m, uH = 2.4 * m, gap = 1.6 * m, lift = .5 * m, z1 = wid * .2;
      const n = Math.max(1, Math.floor((len - 6 * m + gap) / (uL + gap)));
      const x0 = (len - (n * uL + (n - 1) * gap)) / 2;
      const hm = [], tm = [];
      for (const z of [-z1, z1]) {
        roof.add(B(n * uL + (n - 1) * gap + 2 * m, .25 * m, .3 * m, black, len / 2, ry + lift * .5, z - uW * .32), B(n * uL + (n - 1) * gap + 2 * m, .25 * m, .3 * m, black, len / 2, ry + lift * .5, z + uW * .32));
        for (let i = 0; i < n; i++) { const x = x0 + uL / 2 + i * (uL + gap); hm.push(at4(x, ry + lift + uH / 2, z, uL, uH, uW)); tm.push(at4(x, ry + lift + uH + .002, z, uL, 1, uW)); }
      }
      roof.add(inst(new T.BoxGeometry(1, 1, 1), IM(coolSideTex(w, ink)), hm));
      const tops = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), IM(coolTopTex(w, ink)), tm.length);
      tm.forEach((M, i) => tops.setMatrixAt(i, M)); tops.receiveShadow = true; roof.add(tops);
    }
    roof.add(B(4 * m, 3 * m, 3 * m, IM(genTex(w, ink)), len - 5 * m, ry + 1.5 * m, -wid * .38));
    g.add(roof);
    /* the power yard behind the back wall: generator enclosures and transformers on a concrete pad */
    let yd = 0;
    if (o.yard !== false && len > 10 * m) {
      yd = 5.2 * m; const zc = -wid / 2 - .8 * m - yd / 2;
      g.add(B(len, .12 * m, yd + 1.6 * m, black, len / 2, .06 * m, -wid / 2 - (yd + 1.6 * m) / 2));
      const gl = 12 * m, nG = Math.max(1, Math.floor((len - 4 * m) / (gl + 2.5 * m))), gm = [], tx = [];
      const span = nG * gl + (nG - 1) * 2.5 * m, gx0 = (len - span) / 2 - 2 * m;
      for (let i = 0; i < nG; i++) gm.push(at4(gx0 + gl / 2 + i * (gl + 2.5 * m), 1.5 * m + .12 * m, zc, gl, 3 * m, 2.5 * m));
      for (let i = 0; i < Math.max(1, Math.floor(nG / 2)); i++) tx.push(at4(len - 2.6 * m - i * 4.4 * m, 1.4 * m + .12 * m, zc, 2.8 * m, 2.8 * m, 2.8 * m));
      g.add(inst(new T.BoxGeometry(1, 1, 1), IM(genTex(w, ink)), gm));
      g.add(inst(new T.BoxGeometry(1, 1, 1), IM(coolSideTex(w, ink)), tx));
    }
    /* inside: a tiled floor, rows of racks, a gold cable tray over each row (seen in the cutaway) */
    const fl = new T.Mesh(new T.PlaneGeometry(len - wt * 2, wid - wt * 2), IM(rep(tileTex(w, ink), (len - wt * 2) / (2.4 * m), (wid - wt * 2) / (2.4 * m))));
    fl.rotation.x = -Math.PI / 2; fl.position.set(len / 2, .025, 0); fl.receiveShadow = true; inside.add(fl);
    const rH = 3.4 * m, rD = 1.3 * m, pitch = 3.8 * m, rL = len - 6 * m, nR = Math.max(2, Math.floor((wid - 5 * m) / pitch));
    const rm = IM(rep(rackTex(w, ink), Math.max(1, rL / (3 * m))));
    for (let r = 0; r < nR; r++) {
      const z = -((nR - 1) * pitch) / 2 + r * pitch;
      inside.add(B(rL, rH, rD, rm, len / 2, rH / 2, z));
      inside.add(B(rL, t * .45, rD * .45, trim, len / 2, rH + .6 * m, z));
    }
    inside.visible = false; g.add(inside);
    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, len, wid + yd + 1.6 * m, { k: .6, pad: .18 }); cs.position.set(len / 2, .003, -(yd + 1.6 * m) / 2 * (yd ? 1 : 0)); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const lineC = trim.color.clone(), dimC = w.mat.greyLine.color.clone();
    const hd = { group: root, len, wid, hgt, s: { rise: o.rise ?? 1, cut: 0, dim: 0 },
      top: () => { const p = new T.Vector3(len / 2, hgt + hgt * .3, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() {
        const s = hd.s;
        g.position.y = -(hgt * 1.3) * (1 - s.rise); root.visible = s.rise > .001;
        cs.set(Math.max(0, (s.rise - .85) / .15));
        roof.position.y = s.cut * hgt * 1.3;
        front.scale.y = Math.max(.001, 1 - s.cut); front.visible = s.cut < .999;
        inside.visible = s.cut > .001;
        if (!grey) { trim.color.copy(lineC).lerp(dimC, s.dim); trim.emissive.copy(trim.color); }
        if (hd._dim !== s.dim) { hd._dim = s.dim; const k = 1 - .45 * s.dim; inks.forEach(mm => { mm.color.setScalar(k); mm.emissiveIntensity = .24 * k; }); }
      } };
    return w.add(hd);
  },
  footprint(w, len, wid, colour, o = {}) {
    const PX = 140;
    const tex = S3.canvasTex(w.renderer, Math.round(len * PX), Math.round(wid * PX), (g, W, H) => {
      g.clearRect(0, 0, W, H); g.strokeStyle = colour; g.globalAlpha = o.hatch ?? .42; g.lineWidth = 5;
      for (let x = -H; x < W; x += 30) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
      g.globalAlpha = o.edge ?? .95; g.lineWidth = 8; g.setLineDash([30, 20]); g.strokeRect(4, 4, W - 8, H - 8);
    });
    const mm = new T.Mesh(new T.PlaneGeometry(len, wid), new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: .6, metalness: .2, envMapIntensity: .5, polygonOffset: true, polygonOffsetFactor: -2 }));
    mm.rotation.x = -Math.PI / 2; mm.position.set(len / 2, .008, 0); mm.renderOrder = 1;
    const g = new T.Group(); g.add(mm); return g;
  },
  row(w, gw, o = {}) {
    const len = o.len ?? 8, gap = o.gap ?? .5, at = o.at || [0, 0, 0], full = Math.floor(gw + 1e-9), frac = gw - full, halls = [];
    const mk = (i, l) => KIT.hall.create(w, Object.assign({}, o, { len: l, at: [at[0] + i * (len + gap), at[1], at[2]] }));
    for (let i = 0; i < full; i++) halls.push(mk(i, len));
    if (frac > .01) halls.push(mk(full, len * frac));
    const width = full * (len + gap) + (frac > .01 ? len * frac : -gap);
    let plan = null, planWidth = width;
    if (o.plan && o.plan > gw) {
      const pg = new T.Group(), colour = o.planColour || S3.css('--gold'), wid = o.wid ?? 3.2;
      const x0 = at[0] + full * (len + gap) + len * frac, x1 = at[0] + Math.floor(o.plan) * (len + gap) + len * (o.plan % 1);
      let x = x0; const ends = [];
      if (frac > .01) { ends.push([x, at[0] + full * (len + gap) + len]); x = at[0] + (full + 1) * (len + gap); }
      while (x < x1 - .01) { const e = Math.min(x + len, x1); ends.push([x, e]); x += len + gap; }
      ends.forEach(([a, b]) => { const f = KIT.hall.footprint(w, b - a, wid, colour); f.position.set(a, 0, at[2]); pg.add(f); });
      planWidth = x1 - at[0]; w.scene.add(pg); plan = pg;
    }
    const hd = { halls, width, planWidth, plan, s: { rise: o.rise ?? 1, plan: o.plan ? 1 : 0 },
      top: () => [at[0] + width / 2, at[1] + (o.hgt ?? 1.3) * 1.3, at[2]],
      apply() { const n = halls.length; halls.forEach((h, i) => { h.s.rise = Math.min(1, Math.max(0, hd.s.rise * (n + 1) - i)); });
        if (plan) { plan.visible = hd.s.plan > .001; plan.children.forEach(c => { c.children[0].material.opacity = hd.s.plan; }); } } };
    return w.add(hd);
  }
};
})();
