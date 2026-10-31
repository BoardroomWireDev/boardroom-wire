/* KIT.plant — the scale reference: a power plant of about one gigawatt (an average US reactor is c_us_avg_reactor_gw, 1.05 GW).
   One hyperbolic cooling tower, the containment dome, the turbine hall, drawn in cream line on stone so the hall it feeds stays
   the subject. Sized against the hall: at the default, the tower stands about 3× a hall's height.
   const p = KIT.plant.create(w, { at: [x, 0, z], scale: 1, line: 'cream' | 'gold' });
   p.s.rise 0..1   rises out of the floor        p.out  world point of its outgoing line (for KIT.plant.line)
   const l = KIT.plant.line(w, from, to, { pylons: 2, sag: .4, line: 'gold' })   a transmission line on lattice pylons
   l.s.draw 0..1   the cable draws from `from` to `to` (the plug-in moment) */
KIT.plant = {
  create(w, o = {}) {
    const T = THREE, k = o.scale || 1, B = KIT.box, g = new T.Group();
    const stone = KIT.M({ color: S3.col(S3.MAT.stone).multiplyScalar(.3), roughness: .92, envMapIntensity: .3 });
    const line = o.line === 'gold' ? w.mat.goldLine : w.mat.cream;
    /* the cooling tower: a hyperboloid shell, its rim and its base ring in line */
    const H = 4.2 * k, rb = 1.55 * k, rt = 1.0 * k, rw = .78 * k, yw = H * .72;
    const pts = []; for (let i = 0; i <= 24; i++) { const y = H * i / 24, u = (y - yw) / (y < yw ? yw : H - yw); pts.push(new T.Vector2(rw + (y < yw ? rb - rw : rt - rw) * u * u, y)); }
    const shell = new T.Mesh(new T.LatheGeometry(pts, 72), Object.assign(stone.clone(), { side: T.DoubleSide })); shell.castShadow = shell.receiveShadow = true;
    const tower = new T.Group(); tower.add(shell);
    const ring = (r, y, th) => { const m = new T.Mesh(new T.TorusGeometry(r, th, 8, 72), line); m.rotation.x = Math.PI / 2; m.position.y = y; return m; };
    tower.add(ring(rt, H, .03 * k), ring(rb, .25 * k, .03 * k));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; const leg = B(.05 * k, .3 * k, .05 * k, stone, Math.cos(a) * rb * .98, .12 * k, Math.sin(a) * rb * .98); tower.add(leg); }
    g.add(tower);
    /* the reactor: a containment cylinder with a dome */
    const rr = .8 * k, rh = 1.6 * k, re = new T.Group();
    const cy = KIT.cyl(rr, rr, rh, stone, 56); cy.position.y = rh / 2; re.add(cy);
    const dome = new T.Mesh(new T.SphereGeometry(rr, 56, 20, 0, Math.PI * 2, 0, Math.PI / 2), stone); dome.position.y = rh; dome.castShadow = true; re.add(dome);
    re.add(ring(rr + .01, rh, .025 * k));
    re.position.set(3.0 * k, 0, .6 * k); g.add(re);
    /* the turbine hall */
    const th = B(2.6 * k, 1.0 * k, 1.3 * k, stone, 3.2 * k, .5 * k, -1.4 * k); g.add(th);
    const te = KIT.lineBox(2.6 * k, 1.0 * k, 1.3 * k, .03 * k, line); te.position.set(3.2 * k, 0, -1.4 * k); g.add(te);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, h: H, s: { rise: o.rise ?? 1 },
      out: () => { const p = new T.Vector3(4.5 * k, .9 * k, -1.4 * k); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      top: () => { const p = new T.Vector3(0, H * 1.1, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { g.position.y = -H * 1.05 * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  },
  line(w, from, to, o = {}) {
    const T = THREE, n = o.pylons ?? 2, ph = o.h ?? 2.2, sag = o.sag ?? .3, mat = o.line === 'cream' ? w.mat.cream : w.mat.goldLine, g = new T.Group();
    const A = new T.Vector3(...from), Bv = new T.Vector3(...to), tops = [A];
    for (let i = 1; i <= n; i++) {
      const p = A.clone().lerp(Bv, i / (n + 1)); p.y = 0;
      const py = new T.Group();                                           /* a lattice pylon: four tapered legs, a crossarm */
      for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const leg = KIT.box(.03, ph, .03, mat); leg.position.set(dx * .12, ph / 2, dz * .12); leg.rotation.set(dz * .05, 0, -dx * .05); py.add(leg); }
      py.add(KIT.box(.9, .03, .03, mat, 0, ph * .92, 0));
      for (let y = .3; y < ph; y += .35) py.add(KIT.box(.26, .015, .015, mat, 0, y, .12), KIT.box(.26, .015, .015, mat, 0, y, -.12));
      py.position.copy(p); py.lookAt(Bv.x, 0, Bv.z); g.add(py);
      tops.push(new T.Vector3(p.x, ph * .92, p.z));
    }
    tops.push(Bv);
    const pts = []; for (let i = 0; i < tops.length - 1; i++) { const a = tops[i], b = tops[i + 1]; for (let s = 0; s < 1; s += .05) { const q = a.clone().lerp(b, s); q.y -= sag * 4 * s * (1 - s); pts.push(q); } }
    pts.push(Bv);
    const curve = new T.CatmullRomCurve3(pts), cable = new T.Mesh(new T.TubeGeometry(curve, 240, o.r ?? .035, 8, false), mat);
    cable.castShadow = true; g.add(cable); w.scene.add(g);
    const total = cable.geometry.index.count;
    const hd = { group: g, s: { draw: o.draw ?? 1 }, apply() { cable.geometry.setDrawRange(0, Math.floor(total * hd.s.draw / 6) * 6); cable.visible = hd.s.draw > .001; } };
    return w.add(hd);
  }
};
