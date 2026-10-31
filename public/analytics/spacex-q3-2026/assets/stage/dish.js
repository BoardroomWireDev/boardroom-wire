/* KIT.dish — a Starlink dish (Standard: a 594 × 383 mm plate on its kickstand, facing the sky at about 55°).
   const d = KIT.dish.create(w, { width: 1.4, at: [x, 0, z], yaw: .3 });
   d.s.rise 0..1  rises out of the floor        d.w, d.h  plate width and standing height */
KIT.dish = { create(w, o = {}) {
  const T = THREE, pw = o.width || 1.4, k = pw / .594, m = w.mat;
  const W = .594 * k, H = .383 * k, D = .04 * k, r = .04 * k, s = new T.Shape();
  s.moveTo(-W / 2 + r, -H / 2); s.lineTo(W / 2 - r, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
  s.lineTo(W / 2, H / 2 - r); s.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2); s.lineTo(-W / 2 + r, H / 2);
  s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r); s.lineTo(-W / 2, -H / 2 + r); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
  const geo = new T.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: D * .25, bevelSize: D * .25, bevelSegments: 3 });
  geo.translate(0, 0, -D / 2);
  const plate = new T.Mesh(geo, m.paint); plate.castShadow = plate.receiveShadow = true; plate.position.y = H / 2;
  const tilt = new T.Group(); tilt.add(plate); tilt.rotation.x = -.62; tilt.position.y = .07 * k;
  const g = new T.Group(); g.add(tilt);
  const mast = KIT.box(.035 * k, .2 * k, .035 * k, m.paint); mast.position.set(0, .1 * k, -.11 * k); mast.rotation.x = .5; g.add(mast);
  g.add(KIT.box(.12 * k, .02 * k, .2 * k, m.paint, 0, .01 * k, -.14 * k));
  const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const hgt = Math.cos(.62) * H + .07 * k;
  const hd = { group: root, w: W, h: hgt, s: { rise: o.rise ?? 1 },
    apply() { g.position.y = -(hgt + .1) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
  return w.add(hd);
} };
