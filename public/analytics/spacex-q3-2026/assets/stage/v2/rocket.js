/* KIT v2 · the Falcon 9 (Ive, 28 Oct 2026, the polish pass). Same API as v1. Built to the Block 5's published dimensions
   (70 m tall, 3.66 m body, 5.2 m fairing): nine Merlin bells under a black octaweb, four carbon landing legs folded along the
   base, a white first stage with its weld seams and the cable raceway, the black carbon interstage with four titanium grid fins
   (lattice, stowed), the second stage, the boat-tail adapter and the fairing: a cylinder and a tangent ogive, its split line
   drawn. Matte paint, so the key shades it like Anthropic's rocket: lit side, shade side. A contact shadow sits under it.

   const r = KIT.rocket.create(w, { h: 2.4, at: [x, 0, z], mark, yaw });
     r.s.rise 0..1   rises out of the floor        r.s.lift   world units of lift-off (the contact shadow lets go)
     r.h, r.r        height and fairing radius
     mark (optional): the SpaceX wordmark as a texture, read down stage 1 as on the real vehicle:
       mark: await KIT.markTex(w, 'assets/logos/spacex-wordmark.svg', '#141417')                                         */
(() => {
const T = THREE, cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
/* a lathe whose v runs evenly with height (so a texture's rows are heights), from [r, y] keys, resampled to n points */
function lathe(keys, n, seg, y0, y1) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const y = y0 + (y1 - y0) * i / n; let j = 0; while (j < keys.length - 2 && keys[j + 1][1] < y) j++;
    const [ra, ya] = keys[j], [rb, yb] = keys[j + 1], u = Math.max(0, Math.min(1, (y - ya) / ((yb - ya) || 1)));
    pts.push(new T.Vector2(Math.max(0, ra + (rb - ra) * u), y));
  }
  return new T.LatheGeometry(pts, seg);
}
/* the paint, with seams drawn where the real vehicle has them (heights in metres over the span y0..y1) */
const paintTex = (w, key, y0, y1, rings, splits) => once(key, () => S3.canvasTex(w.renderer, 1024, 2048, (g, W, H) => {
  g.fillStyle = '#ece9e1'; g.fillRect(0, 0, W, H);
  const vy = (y) => H - (y - y0) / (y1 - y0) * H;
  rings.forEach(([y, k]) => { g.fillStyle = k ? 'rgba(60,60,64,.55)' : 'rgba(90,90,96,.32)'; g.fillRect(0, vy(y) - 2, W, 4); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, vy(y) + 2, W, 2); });
  (splits || []).forEach((u) => { g.fillStyle = 'rgba(70,70,76,.6)'; g.fillRect(u * W - 2, 0, 4, H); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(u * W + 2, 0, 2, H); });
}));
/* carbon: the interstage and the legs, a faint weave of panel lines */
const carbonTex = (w) => once('carbon', () => S3.canvasTex(w.renderer, 512, 512, (g, W, H) => {
  g.fillStyle = '#6b6c71'; g.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 6) { g.fillStyle = y % 12 ? '#707176' : '#5f6065'; g.fillRect(0, y, W, 3); }
  g.fillStyle = '#86878c'; for (let x = 0; x < W; x += W / 8) g.fillRect(x, 0, 2, H);
}));
/* a grid fin: a titanium lattice, transparent between the bars */
const finTex = (w) => once('fin', () => S3.canvasTex(w.renderer, 256, 208, (g, W, H) => {
  g.clearRect(0, 0, W, H); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.strokeRect(4, 4, W - 8, H - 8);
  g.lineWidth = 4; g.save(); g.beginPath(); g.rect(4, 4, W - 8, H - 8); g.clip();
  for (let x = -H; x < W + H; x += 26) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + H, H); g.stroke(); g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
  g.restore();
}));

KIT.rocket = { create(w, o = {}) {
  const h = o.h || 2.4, k = h / 70, g = new T.Group(), B = KIT.box, m = w.mat;
  const R = 1.83, RF = 2.6, seg = 72;
  const paint = (tex) => new T.MeshStandardMaterial({ map: tex, color: 0xffffff, roughness: .5, metalness: 0, envMapIntensity: .55 });
  const add = (geo, mat, y = 0) => { const me = new T.Mesh(geo, mat); me.scale.setScalar(k); me.position.y = y * k; me.castShadow = me.receiveShadow = true; g.add(me); return me; };
  /* engines: nine bells, the octaweb and its black heat shield */
  const bell = lathe([[.46, 0], [.4, .35], [.3, .7], [.22, 1.0]], 24, 36, 0, 1.0);
  const nozzle = new T.MeshStandardMaterial({ color: S3.col(0x2a2826), roughness: .4, metalness: .75, envMapIntensity: .9, side: T.DoubleSide });
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 8, rr = i === 8 ? 0 : 1.22; const b = add(bell, nozzle, .02); b.position.x = Math.cos(a) * rr * k; b.position.z = Math.sin(a) * rr * k; }
  add(new T.CylinderGeometry(R * 1.01, R * 1.01, .7, seg), m.carbon, 1.35);
  /* stage 1: paint with its seams; a ring where the white starts */
  const s1 = [[1.7, 0], [4.2, 1], [13, 0], [24.5, 1], [26, 0], [33.4, 0]];
  add(lathe([[R, 1.7], [R, 35]], 140, seg, 1.7, 35), paint(paintTex(w, 's1', 1.7, 35, s1)));
  /* the raceway: a conduit up the side, toward the camera's right */
  const rw = add(new T.BoxGeometry(.34, 31.5, .16), m.paintMatte, 1.7 + 31.5 / 2 + .3); const ra = -.55; rw.position.x = Math.sin(ra) * (R + .07) * k; rw.position.z = Math.cos(ra) * (R + .07) * k; rw.rotation.y = ra;
  /* the interstage, carbon, and four grid fins stowed against it */
  const ct = carbonTex(w).clone(); ct.needsUpdate = true; ct.wrapS = ct.wrapT = T.RepeatWrapping; ct.repeat.set(6, 2);
  add(new T.CylinderGeometry(R * 1.012, R * 1.012, 7.2, seg, 1, false), new T.MeshStandardMaterial({ map: ct, color: 0xffffff, roughness: .5, metalness: .1, envMapIntensity: .5 }), 35 + 3.6);
  const finM = new T.MeshStandardMaterial({ map: finTex(w), color: S3.col(0xa29e95), roughness: .36, metalness: .8, envMapIntensity: 1, alphaTest: .5, side: T.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const f = new T.Group(); f.add(new T.Mesh(new T.PlaneGeometry(1.6, 1.3), finM));
    const hub = new T.Mesh(new T.BoxGeometry(.5, .22, .3), m.steel); hub.position.set(0, -.75, -.1); f.add(hub);
    f.children.forEach(c => { c.castShadow = true; });
    f.scale.setScalar(k); f.position.set(Math.sin(a) * (R + .2) * k, 40.6 * k, Math.cos(a) * (R + .2) * k); f.rotation.y = a; g.add(f);
  }
  /* the landing legs: four carbon struts folded along the base, a pad and a hinge each */
  const legM = new T.MeshStandardMaterial({ map: ct, color: 0xffffff, roughness: .5, metalness: .1, envMapIntensity: .5 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, lg = new T.Group();
    const strut = new T.Mesh(new T.BoxGeometry(.95, 9.0, .3), legM); strut.position.y = 1.1 + 4.5; lg.add(strut);
    const tip = new T.Mesh(new T.CylinderGeometry(.3, .48, .7, 4, 1), legM); tip.rotation.y = Math.PI / 4; tip.scale.z = .45; tip.position.y = 1.1 + 9.0 + .35; lg.add(tip);
    const foot = new T.Mesh(new T.BoxGeometry(1.1, .5, .42), m.steel); foot.position.y = 1.35; lg.add(foot);
    lg.children.forEach(c => { c.castShadow = c.receiveShadow = true; });
    lg.scale.setScalar(k); lg.position.set(Math.sin(a) * (R + .16) * k, 0, Math.cos(a) * (R + .16) * k); lg.rotation.y = a; g.add(lg);
  }
  /* stage 2, the adapter, the fairing (cylinder + tangent ogive), its split line facing the camera */
  add(lathe([[R, 42.2], [R, 55.6]], 60, seg, 42.2, 55.6), paint(paintTex(w, 's2', 42.2, 55.6, [[42.4, 1], [46.2, 0], [54.8, 0]])));
  const L = 6.6, rho = (RF * RF + L * L) / (2 * RF), fk = [[R, 55.6], [RF, 57.4], [RF, 63.4]];
  for (let i = 1; i <= 40; i++) { const x = L * (1 - i / 40); fk.push([Math.max(0, Math.sqrt(rho * rho - (L - x) * (L - x)) + RF - rho) * (i === 40 ? 0 : 1), 63.4 + L * i / 40]); }
  fk.forEach(p => { p[0] = Math.max(p[0], 0); });
  add(lathe(fk, 260, seg, 55.6, 70), paint(paintTex(w, 'fair', 55.6, 70, [[55.7, 1], [57.4, 0], [57.6, 1]], [0, .5])));
  /* the wordmark down stage 1, on a curved strip (optional) */
  if (o.mark) {
    const t = o.mark.clone(); t.needsUpdate = true; t.center.set(.5, .5); t.rotation = -Math.PI / 2;
    const asp = o.mark.image.width / o.mark.image.height, Lm = 11.5, Wm = Lm / asp, th = Wm / (R + .02);
    const strip = new T.Mesh(new T.CylinderGeometry(R + .02, R + .02, Lm, 24, 1, true, -th / 2 + .35, th), new T.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2 }));
    strip.scale.setScalar(k); strip.position.y = (21 + Lm / 2) * k; strip.renderOrder = 2; g.add(strip);
  }
  const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const cs = KIT.contact(w, 6.4 * k, 6.4 * k, { round: true, k: .7, pad: .5 }); root.add(cs);
  const hd = { group: root, h, r: RF * k, s: { rise: o.rise ?? 1, lift: 0 },
    apply() {
      g.position.y = -h * 1.02 * (1 - hd.s.rise) + hd.s.lift; root.visible = hd.s.rise > .001;
      cs.set(Math.max(0, (hd.s.rise - .9) / .1) * Math.max(0, 1 - hd.s.lift / (h * .15)));
    } };
  return w.add(hd);
} };
})();
