/* KIT.rocket — a Falcon 9 at its own proportions (70 m tall, 3.7 m body, 5.2 m fairing, black interstage, grid fins, legs).
   const r = KIT.rocket.create(w, { h: 2.4, at: [x, 0, z] });
   r.s.rise 0..1  rises out of the floor        r.s.lift  metres of lift-off (world units), for a launch
   r.h, r.r       its height and fairing radius (for placing labels) */
KIT.rocket = { create(w, o = {}) {
  const T = THREE, h = o.h || 2.4, k = h / 70, g = new T.Group(), B = KIT.box, C = KIT.cyl, m = w.mat;
  const prof = [[0, 0], [1.85, 0], [1.85, 57], [2.6, 58.6], [2.6, 64.6], [2.45, 66.4], [2.0, 68.0], [1.2, 69.3], [0, 70]].map(([r, y]) => new T.Vector2(r * k, y * k));
  const body = new T.Mesh(new T.LatheGeometry(prof, 64), m.paint); body.castShadow = body.receiveShadow = true; g.add(body);
  const inter = C(1.9 * k, 1.9 * k, 5 * k, m.rubber, 64); inter.position.y = 44.5 * k; g.add(inter);
  const oct = C(1.9 * k, 1.9 * k, 1.6 * k, m.rubber, 64); oct.position.y = .8 * k; g.add(oct);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const leg = B(1.0 * k, 9.5 * k, .55 * k, m.rubber); leg.position.set(Math.cos(a) * 1.95 * k, 5.4 * k, Math.sin(a) * 1.95 * k); leg.rotation.y = -a; g.add(leg);
    const fin = B(.3 * k, 1.5 * k, 1.6 * k, m.graphite); fin.position.set(Math.cos(a) * 2.6 * k, 41.2 * k, Math.sin(a) * 2.6 * k); fin.rotation.y = -a; g.add(fin);
  }
  const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); w.scene.add(root);
  const hd = { group: root, h, r: 2.6 * k, s: { rise: o.rise ?? 1, lift: 0 },
    apply() { g.position.y = -h * 1.02 * (1 - hd.s.rise) + hd.s.lift; root.visible = hd.s.rise > .001; } };
  return w.add(hd);
} };
