/* KIT v2 FINAL . the power plant, the scale reference (Ive, 28 Oct 2026, the line-language pass). About one gigawatt (an average US
   reactor is c_us_avg_reactor_gw, 1.05 GW). Same API as v1; it is the quiet reference beside the subject, so it carries no gold.
   Drawn in the Muse Secure VM's language, as the hall: a near-black body (#14151a, roughness .8), its detail carried by CREAM HAIRLINE
   printed into the textures (full for outlines and frames, about 60% for secondary lines, about 30% for fine fill) and used as a faint
   emissive map (.16), so a line on a shaded face still reads. Flat ink, no glow. The pylons and the columns are drawn as line.
   Real dimensions (1 unit of k = about 36 m: the tower stands 4.2 k = 150 m):
     - the natural-draught cooling tower, 150 m tall, about 110 m across the base (a hyperbolic shell: throat 70 m across at 72% of
       the height, rim 76 m), shuttering lifts every 3.4 m and meridian joints as line, on a ring of 80 raking support columns about
       11 m high (line), an open basin inside, a thin line at the rim and at the base;
     - the containment: a cylinder 40 m high and 60 m wide with a hemispherical dome (70 m in all), buttress strips, a ring at the
       springline, an equipment hatch; an auxiliary building beside it;
     - the turbine hall: 93 m long, 36 m high, 46 m deep, cladding seams, a clerestory band, roll-up doors, a flat roof with a ridge
       monitor, six round vents and a coping line; a step-up transformer and the terminal gantry where the line leaves (p.out()).
   The cream line is the tower's rim and the dome's springline unless line: 'gold' (an option kept from v1). A contact shadow sits under it.

   const p = KIT.plant.create(w, { at: [x, 0, z], scale: 1, line: 'cream' | 'gold', yaw, rise });
   p.s.rise 0..1   rises out of the floor        p.out  world point of its outgoing line (for KIT.plant.line)      p.h, p.top()
   const l = KIT.plant.line(w, from, to, { pylons: 2, sag: .4, h, r, line: 'gold', draw })   a transmission line on lattice pylons
   l.s.draw 0..1   the cable draws from `from` to `to` (the plug-in moment, the one gold line); the pylons stand regardless   (all as v1) */
(() => {
const T = THREE, cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
const rnd = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const BLACK = '#13141a', CREAM = '236,230,214';
const c = (a) => `rgba(${CREAM},${a})`;
const hl = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
const rep = (base, rx, ry) => { const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return t; };
/* a near-black surface whose cream line is printed and faintly self-lit */
const inkMat = (map, o = {}) => new T.MeshStandardMaterial(Object.assign({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .16, color: 0xffffff, roughness: .8, metalness: .05, envMapIntensity: .25 }, o));
const mesh = (geo, mat, cast = true) => { const m = new T.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
const inkLine = new T.LineBasicMaterial({ color: 0xece6d6, transparent: true, opacity: .8 });
const edged = (m, thr = 40) => { m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry, thr), inkLine)); return m; };
/* drawn line members: flat cream, three weights (full, secondary, fine) */
const L1 = new T.MeshBasicMaterial({ color: 0xaaa699 }), L2 = new T.MeshBasicMaterial({ color: 0x827f74 }), L3 = new T.MeshBasicMaterial({ color: 0x5e5c54 });

/* the tower: wraps the lathe twice round; lifts every 3.4 m (44), meridian joints every 5 m of the ring, a rim line and a base line */
const towerTex = (w) => once('tower', () => S3.canvasTex(w.renderer, 2048, 2048, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#191a1f'); gr.addColorStop(1, '#101115'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const R = rnd(5), im = g.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0);
  for (let j = 0; j < 18; j++) hl(g, W * j / 18 - 3, 0, j % 3 ? 5 : 8, H, c(j % 3 ? .26 : .5));                          /* meridian joints */
  for (let i = 1; i < 44; i++) { const y = H * i / 44; hl(g, 0, y - 3, W, i % 4 ? 5 : 8, c(i % 4 ? .3 : .6)); }          /* shuttering lifts */
  hl(g, 0, 0, W, 20, c(.8)); hl(g, 0, H - 22, W, 22, c(.5));
}));
const cylTex = (w) => once('cyl', () => S3.canvasTex(w.renderer, 1024, 512, (g, W, H) => {
  g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
  for (let j = 0; j < 8; j++) hl(g, W * j / 8 - 2, 0, 4, H, c(.22));
  for (let i = 1; i < 9; i++) hl(g, 0, H * i / 9 - 2, W, 4, c(.3));
  for (const f of [.2, .5, .78]) hl(g, 0, H * f - 4, W, 8, c(.6));                                                      /* the tendon bands */
  hl(g, 0, 0, W, 8, c(.8)); hl(g, 0, H - 8, W, 8, c(.8));
}));
const domeTex = (w) => once('dome', () => S3.canvasTex(w.renderer, 1024, 512, (g, W, H) => {
  g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
  for (let j = 0; j < 24; j++) hl(g, W * j / 24 - 2, 0, j % 3 ? 3 : 5, H, c(j % 3 ? .22 : .45));
  for (let i = 1; i < 6; i++) hl(g, 0, H * i / 6 - 2, W, 4, c(.45));
}));
const auxTex = (w) => once('aux', () => S3.canvasTex(w.renderer, 512, 512, (g, W, H) => {
  g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
  for (let i = 1; i < 6; i++) hl(g, 0, H * i / 6 - 2, W, 4, c(.28));
  for (let j = 1; j < 4; j++) hl(g, W * j / 4 - 2, 0, 4, H, c(.2));
  hl(g, 0, 0, W, 10, c(.8)); hl(g, 0, H - 10, W, 10, c(.7));
  g.strokeStyle = c(1); g.lineWidth = 7; g.strokeRect(W * .62, H * .52, W * .22, H * .46); hl(g, W * .73 - 2, H * .52, 4, H * .46, c(.5));
}));
/* turbine hall cladding: panel joints, a clerestory band, a plinth line, roll-up doors. A face is len x hgt. */
function cladFace(w, key, W, H, o) {
  return once('clad' + key, () => S3.canvasTex(w.renderer, W, H, (g) => {
    g.fillStyle = BLACK; g.fillRect(0, 0, W, H);
    const n = Math.round(o.joints || 22); for (let i = 1; i < n; i++) hl(g, W * i / n - 2.5, 0, 5, H, c(.26));              /* panel seams */
    for (const f of [.3, .52]) hl(g, 0, H * f - 3, W, 6, c(.5));
    hl(g, 0, H * .9 - 4, W, 8, c(.75)); hl(g, 0, H * .045 - 4, W, 8, c(.8));                                                /* plinth, cornice */
    if (o.win) {          /* the clerestory: a dark glazed band, a frame, mullions */
      const y0 = H * .09, y1 = H * .24; g.fillStyle = '#0a0b0e'; g.fillRect(W * .02, y0, W * .96, y1 - y0);
      const m = Math.round(o.win); for (let i = 0; i <= m; i++) hl(g, W * (.02 + .96 * i / m) - 3, y0, 6, y1 - y0, c(.6));
      g.strokeStyle = c(1); g.lineWidth = 9; g.strokeRect(W * .02, y0, W * .96, y1 - y0);
    }
    for (const dx of (o.doors || [])) {            /* roll-up doors, 8 x 8 m */
      const dw = W * o.dw, dh = H * .5, x = W * dx, y = H * .9 - dh;
      g.fillStyle = '#0b0c0f'; g.fillRect(x, y, dw, dh);
      for (let yy = y + 14; yy < y + dh - 8; yy += 18) hl(g, x + 4, yy, dw - 8, 3, c(.35));
      g.strokeStyle = c(1); g.lineWidth = 9; g.strokeRect(x, y, dw, dh);
    }
  }));
}
const roofTex = (w) => once('roof', () => S3.canvasTex(w.renderer, 512, 512, (g, W, H) => {
  g.fillStyle = '#101115'; g.fillRect(0, 0, W, H);
  for (let k = 1; k < 4; k++) hl(g, 0, H * k / 4 - 2, W, 4, c(.28));
  hl(g, W / 3 - 2, 0, 4, H, c(.2)); hl(g, W * 2 / 3 - 2, 0, 4, H, c(.2));
}));
const louvreTex = (w) => once('louvre', () => S3.canvasTex(w.renderer, 512, 128, (g, W, H) => {
  g.fillStyle = '#0c0d10'; g.fillRect(0, 0, W, H);
  for (let y = 8; y < H; y += 16) hl(g, 0, y - 2, W, 4, c(.4));
  g.strokeStyle = c(.9); g.lineWidth = 8; g.strokeRect(2, 2, W - 4, H - 4);
}));
const finTex = (w) => once('fin', () => S3.canvasTex(w.renderer, 256, 128, (g, W, H) => {
  g.fillStyle = '#0d0e11'; g.fillRect(0, 0, W, H); for (let x = 6; x < W; x += 14) hl(g, x, 0, 4, H, c(.35)); g.strokeStyle = c(.9); g.lineWidth = 6; g.strokeRect(2, 2, W - 4, H - 4);
}));

/* a strap/rod between two points (a unit box, scaled) */
const unit = new T.BoxGeometry(1, 1, 1);
function beam(a, b, tx, ty, mat, cast = false) {
  const d = b.clone().sub(a), len = d.length(), m = new T.Mesh(unit, mat);
  m.scale.set(tx, len, ty); m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.castShadow = cast; m.receiveShadow = false; return m;
}
const V = (x, y, z) => new T.Vector3(x, y, z);

KIT.plant = {
  create(w, o = {}) {
    const k = o.scale || 1, B = KIT.box, g = new T.Group();
    const line = o.line === 'gold' ? w.mat.goldLine : L1;
    const dk = new T.MeshStandardMaterial({ color: 0x15161a, roughness: .8, metalness: .05, envMapIntensity: .25 });
    const dkk = new T.MeshStandardMaterial({ color: 0x0c0d10, roughness: .85, metalness: 0, envMapIntensity: .2 });
    const porc = new T.MeshStandardMaterial({ color: 0xd8d2c0, roughness: .4, envMapIntensity: .5 });

    /* the cooling tower: a hyperbolic shell, open at the top, on a ring of raking columns round an open basin */
    const H = 4.2 * k, rb = 1.55 * k, rt = 1.0 * k, rw = .78 * k, yw = H * .72, yb = .3 * k;
    const prof = (y) => { const a = y < yw ? (yw - yb) / Math.sqrt((rb / rw) ** 2 - 1) : (H - yw) / Math.sqrt((rt / rw) ** 2 - 1); return rw * Math.sqrt(1 + ((y - yw) / a) ** 2); };
    const pts = []; for (let i = 0; i <= 40; i++) { const y = yb + (H - yb) * i / 40; pts.push(new T.Vector2(prof(y), y)); }
    const shell = mesh(new T.LatheGeometry(pts, 96), inkMat(rep(towerTex(w), 2, 1), { side: T.DoubleSide }));
    const tower = new T.Group(); tower.add(shell);
    const ring = (r, y, th, mat) => { const m = mesh(new T.TorusGeometry(r, th, 6, 96), mat, false); m.rotation.x = Math.PI / 2; m.position.y = y; return m; };
    tower.add(ring(prof(H), H + .004 * k, .014 * k, line), ring(rb, yb, .012 * k, L2));
    /* the support columns: 40 raking pairs, 11 m high, drawn as line, in two leaning directions */
    const N = 40, cols = new T.InstancedMesh(unit, L2, N * 2); let ci = 0;
    for (let i = 0; i < N; i++) for (const s of [-1, 1]) {
      const a0 = i / N * Math.PI * 2, a1 = a0 + s * .085, r0 = rb * 1.03;
      const A = V(Math.cos(a0) * r0, .01 * k, Math.sin(a0) * r0), Bp = V(Math.cos(a1) * rb, yb, Math.sin(a1) * rb), d = Bp.clone().sub(A), len = d.length();
      const q = new T.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
      cols.setMatrixAt(ci++, new T.Matrix4().compose(A.clone().add(Bp).multiplyScalar(.5), q, V(.011 * k, len, .011 * k)));
    }
    cols.castShadow = true; tower.add(cols);
    /* the basin: near-black inside, a line at its curb */
    const basin = mesh(new T.CircleGeometry(rb * 1.02, 72), dkk, false); basin.rotation.x = -Math.PI / 2; basin.position.y = .006 * k; tower.add(basin);
    tower.add(ring(rb * 1.045, .014 * k, .008 * k, L3));
    g.add(tower);

    /* the containment: a cylinder under a hemispherical dome, buttress strips, the springline ring, an equipment hatch */
    const rr = .84 * k, rh = 1.12 * k, re = new T.Group();
    const cy = KIT.cyl(rr, rr, rh, inkMat(rep(cylTex(w), 3, 1)), 72); cy.position.y = rh / 2; re.add(cy);
    const dome = mesh(new T.SphereGeometry(rr, 72, 28, 0, Math.PI * 2, 0, Math.PI / 2), inkMat(domeTex(w))); dome.position.y = rh; re.add(dome);
    re.add(ring(rr + .006 * k, rh, .012 * k, line)); re.children[re.children.length - 1].position.y = rh;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + .3, bg = new T.Group(); bg.position.set(Math.cos(a) * (rr + .008 * k), rh / 2, Math.sin(a) * (rr + .008 * k)); bg.rotation.y = -a + Math.PI / 2;
      bg.add(B(.085 * k, rh, .03 * k, dk, 0, 0, 0), B(.012 * k, rh, .034 * k, L1, -.0425 * k, 0, 0), B(.012 * k, rh, .034 * k, L1, .0425 * k, 0, 0)); re.add(bg);
    }
    const cap = edged(mesh(new T.CylinderGeometry(.1 * k, .13 * k, .05 * k, 32), dk), 30); cap.position.y = rh + rr + .01 * k; re.add(cap);
    const hatchA = 1.25, hatch = edged(B(.1 * k, .16 * k, .012 * k, dkk, Math.cos(hatchA) * (rr + .004 * k), .22 * k, Math.sin(hatchA) * (rr + .004 * k))); hatch.rotation.y = Math.PI / 2 - hatchA; re.add(hatch);
    re.position.set(3.0 * k, 0, .6 * k); g.add(re);
    /* the auxiliary building beside it */
    const aux = mesh(new T.BoxGeometry(.8 * k, .55 * k, .8 * k), [inkMat(auxTex(w)), inkMat(auxTex(w)), dk, dkk, inkMat(auxTex(w)), inkMat(auxTex(w))]); aux.position.set(4.3 * k, .275 * k, .6 * k); g.add(aux);
    g.add(edged(B(.84 * k, .03 * k, .84 * k, dk, 4.3 * k, .565 * k, .6 * k)));

    /* the turbine hall */
    const hl_ = 2.6 * k, hh = 1.0 * k, hd_ = 1.3 * k, hx = 3.2 * k, hz = -1.4 * k;
    const front = inkMat(cladFace(w, 'f', 2048, 788, { win: 22, doors: [.14, .64], dw: .08 })), back = inkMat(cladFace(w, 'b', 2048, 788, { win: 22 }));
    const endM = inkMat(cladFace(w, 'e', 1024, 788, { win: 11, joints: 11 })), roofM = inkMat(rep(roofTex(w), 6, 3));
    const hall = mesh(new T.BoxGeometry(hl_, hh, hd_), [endM, endM, roofM, dkk, front, back]); hall.position.set(hx, hh / 2, hz); g.add(hall);
    const cp = .012 * k;                                                   /* the coping line round the roof */
    for (const z of [-hd_ / 2, hd_ / 2]) g.add(B(hl_ + cp, cp, cp, L1, hx, hh + cp / 2, hz + z));
    for (const x of [-hl_ / 2, hl_ / 2]) g.add(B(cp, cp, hd_, L1, hx + x, hh + cp / 2, hz));
    const lv = inkMat(louvreTex(w)), lv2 = inkMat(rep(louvreTex(w), 6, 1));
    const mon = mesh(new T.BoxGeometry(hl_ * .72, .13 * k, .3 * k), [lv, lv, roofM, roofM, lv2, lv2]); mon.position.set(hx - hl_ * .04, hh + .065 * k, hz); g.add(mon);
    g.add(B(hl_ * .74, .008 * k, .34 * k, L2, hx - hl_ * .04, hh + .132 * k, hz));
    for (let i = 0; i < 6; i++) {                                          /* round roof vents */
      const vx = hx - hl_ * .4 + i * hl_ * .16, vz = hz + (i % 2 ? .38 : -.38) * k;
      const v = edged(mesh(new T.CylinderGeometry(.04 * k, .045 * k, .06 * k, 20), dk), 30); v.position.set(vx, hh + .03 * k, vz); g.add(v);
      const vc = edged(mesh(new T.ConeGeometry(.06 * k, .025 * k, 20), dk), 30); vc.position.set(vx, hh + .075 * k, vz); g.add(vc);
    }
    /* the step-up transformer: a tank, radiator fins, three porcelain bushings, on a pad */
    const tx = 4.8 * k, tz = -.3 * k;
    g.add(edged(B(.42 * k, .02 * k, .34 * k, dkk, tx, .01 * k, tz)));
    g.add(edged(B(.26 * k, .2 * k, .2 * k, dk, tx, .12 * k, tz)));
    const fins = mesh(new T.BoxGeometry(.1 * k, .15 * k, .2 * k), inkMat(finTex(w))); fins.position.set(tx + .18 * k, .105 * k, tz); g.add(fins);
    for (let i = -1; i <= 1; i++) { const bs = mesh(new T.CylinderGeometry(.012 * k, .018 * k, .09 * k, 12), porc); bs.position.set(tx + i * .07 * k, .27 * k, tz); g.add(bs); }
    /* the terminal gantry where the line leaves the hall: two posts and a beam drawn as line, an insulator string */
    const gx = 4.52 * k, gz = hz;
    for (const s of [-1, 1]) g.add(B(.016 * k, 1.06 * k, .016 * k, L1, gx, .53 * k, gz + s * .17 * k));
    g.add(B(.016 * k, .016 * k, .36 * k, L1, gx, 1.06 * k, gz));
    for (let i = 0; i < 6; i++) { const d = mesh(new T.CylinderGeometry(.02 * k, .02 * k, .006 * k, 14), porc, false); d.position.set(gx, 1.04 * k - i * .02 * k, gz); g.add(d); }

    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, 6.9 * k, 3.9 * k, { k: .6, pad: .2 }); cs.position.set(1.75 * k, .003, -.2 * k); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, h: H, s: { rise: o.rise ?? 1 },
      out: () => { const p = new T.Vector3(4.5 * k, .9 * k, -1.4 * k); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      top: () => { const p = new T.Vector3(0, H * 1.1, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { g.position.y = -H * 1.05 * (1 - hd.s.rise); root.visible = hd.s.rise > .001; cs.set(Math.max(0, (hd.s.rise - .85) / .15)); } };
    return w.add(hd);
  },

  line(w, from, to, o = {}) {
    const n = o.pylons ?? 2, ph = o.h ?? 2.2, sag = o.sag ?? .3, mat = o.line === 'cream' ? w.mat.cream : w.mat.goldLine, g = new T.Group();
    const pad = new T.MeshStandardMaterial({ color: 0x15161a, roughness: .85, envMapIntensity: .2 });
    const porc = new T.MeshStandardMaterial({ color: 0xd8d2c0, roughness: .4, envMapIntensity: .5 });
    const A = new T.Vector3(...from), Bv = new T.Vector3(...to), tops = [A];
    const s = ph / 2.2, disc = new T.CylinderGeometry(.034 * s, .034 * s, .008 * s, 14), mt = .03 * s, bt = .018 * s, dg = .013 * s;
    for (let i = 1; i <= n; i++) {
      const p = A.clone().lerp(Bv, i / (n + 1)); p.y = 0;
      const py = new T.Group();
      /* a lattice pylon drawn as line: four tapered legs to a waist at 60%, a neck to the arms, an earth-wire peak, X-bracing on every face */
      const bw = ph * .11, tw = bw * .34, yW = ph * .6, yN = ph * .92, hw = (y) => y >= yW ? tw : bw + (tw - bw) * y / yW;
      const corner = (sx, sz, y) => V(sx * hw(y), y, sz * hw(y));
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [sx, sz] of corners) { py.add(beam(corner(sx, sz, 0), corner(sx, sz, yW), mt, mt, L1, true), beam(corner(sx, sz, yW), corner(sx, sz, yN), mt, mt, L1, true));
        const foot = new T.Mesh(unit, pad); foot.scale.set(.07 * s, .03 * s, .07 * s); foot.position.set(sx * bw, .012 * s, sz * bw); foot.receiveShadow = true; py.add(foot); }
      const levels = [0, .18, .36, yW / ph, .76, yN / ph].map(v => v * ph);
      levels.forEach((y, li) => {
        for (let q = 0; q < 4; q++) { const [ax, az] = corners[q], [bx, bz] = corners[(q + 1) % 4]; py.add(beam(corner(ax, az, y), corner(bx, bz, y), bt, bt, L2));
          if (li < levels.length - 1) { const y2 = levels[li + 1]; py.add(beam(corner(ax, az, y), corner(bx, bz, y2), dg, dg, L3), beam(corner(bx, bz, y), corner(ax, az, y2), dg, dg, L3)); } }
      });
      for (const sgn of [-1, 1]) py.add(beam(corner(sgn, -1, yN), V(0, ph, 0), mt * .8, mt * .8, L1), beam(corner(sgn, 1, yN), V(0, ph, 0), mt * .8, mt * .8, L1));
      /* two arm tiers, each a small truss; a cream insulator string hangs from each tip; only the upper right carries the cable */
      const strLen = .09 * ph, attach = [];
      for (const [ay, al] of [[ph * .92, ph * .22], [ph * .8, ph * .17]]) for (const sx of [-1, 1]) {
        const tip = V(sx * al, ay, 0), root_ = V(sx * hw(ay), ay, 0), low = V(sx * al * .96, ay - .035 * ph, 0), lowR = V(sx * hw(ay), ay - .06 * ph, 0);
        py.add(beam(root_, tip, bt * 1.2, bt * 1.2, L1), beam(lowR, low, bt, bt, L2), beam(tip, low, bt, bt, L2), beam(root_.clone().lerp(tip, .5), lowR.clone().lerp(low, .5), dg, dg, L3));
        for (let d = 0; d < 9; d++) { const m = new T.Mesh(disc, porc); m.position.set(tip.x, tip.y - .02 * s - d * strLen / 9, 0); m.castShadow = true; py.add(m); }
        if (ay > ph * .9 && sx > 0) attach.push(V(tip.x, tip.y - strLen - .02 * s, 0));
      }
      py.position.copy(p); py.lookAt(Bv.x, 0, Bv.z); py.updateMatrix(); py.updateMatrixWorld(true); g.add(py);
      tops.push(attach[0].clone().applyMatrix4(py.matrix));
    }
    tops.push(Bv);
    const pts = []; for (let i = 0; i < tops.length - 1; i++) { const a = tops[i], b = tops[i + 1]; for (let t = 0; t < 1; t += .05) { const q = a.clone().lerp(b, t); q.y -= sag * 4 * t * (1 - t); pts.push(q); } }
    pts.push(Bv);
    const curve = new T.CatmullRomCurve3(pts), cable = new T.Mesh(new T.TubeGeometry(curve, 240, o.r ?? .022, 8, false), mat);
    cable.castShadow = true; g.add(cable); w.scene.add(g);
    const total = cable.geometry.index.count;
    const hd = { group: g, s: { draw: o.draw ?? 1 }, apply() { cable.geometry.setDrawRange(0, Math.floor(total * hd.s.draw / 6) * 6); cable.visible = hd.s.draw > .001; } };
    return w.add(hd);
  }
};
})();
