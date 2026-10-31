/* KIT.crate — the $40B crate of GPUs (ch 6, how he pays for it): a shipping crate on skids, dark boards in gold-line banding,
   its lid lifting to show the GPU trays packed inside in rows (each tray a black board with its gold heat-spreader lines).
   const c = KIT.crate.create(w, { w: 4, h: 2.2, d: 2.4, at: [x, 0, z], yaw, red: false });
     red: true only when the crate stands for debt as a loss (red only for loss); default gold banding.
   c.s.rise 0..1, c.s.open 0..1 (the lid lifts and tips back), c.top() the world point over it (for its figure). */
KIT.crate = { create(w, o = {}) {
  const T = THREE, B = KIT.box, W = o.w ?? 4, H = o.h ?? 2.2, D = o.d ?? 2.4, sk = .16, g = new T.Group();
  const board = KIT.M({ color: S3.col(S3.MAT.card).multiplyScalar(.85), roughness: .8 }), band = o.red ? w.mat.red : w.mat.goldLine;
  for (const z of [-D * .35, 0, D * .35]) g.add(B(W, sk, .22, w.mat.rubber, 0, sk / 2, z));          /* the skids */
  const box0 = sk, t = .05;
  /* the walls in planks: horizontal boards with a hairline gap */
  const planks = (len, hh, mk) => { const n = 5; for (let i = 0; i < n; i++) mk((i + .5) * hh / n, hh / n - .012); };
  planks(W, H, (y, ph) => { g.add(B(W, ph, t, board, 0, box0 + y, D / 2 - t / 2), B(W, ph, t, board, 0, box0 + y, -D / 2 + t / 2)); });
  planks(D, H, (y, ph) => { g.add(B(t, ph, D - 2 * t, board, W / 2 - t / 2, box0 + y, 0), B(t, ph, D - 2 * t, board, -W / 2 + t / 2, box0 + y, 0)); });
  g.add(B(W - .02, .04, D - .02, board, 0, box0 + .02, 0));
  /* the banding: gold-line edges and two straps round the girth */
  const e = KIT.lineBox(W + .02, H, D + .02, .06, band); e.position.y = box0; g.add(e);
  for (const x of [-W * .3, W * .3]) { g.add(B(.07, H, .012, band, x, box0 + H / 2, D / 2 + .006), B(.07, H, .012, band, x, box0 + H / 2, -D / 2 - .006)); }
  /* the cargo: GPU trays standing in rows */
  const tray = (x, z) => { const m = B(.06, H * .7, D * .2, w.mat.rubber, x, box0 + H * .35 + .04, z); for (let k = 0; k < 4; k++) m.add(B(.065, .018, D * .18, band, 0, -H * .25 + k * H * .16, 0)); m.add(B(.07, .02, D * .2, band, 0, H * .35, 0)); return m; };
  for (let x = -W / 2 + .3; x < W / 2 - .2; x += .14) for (const z of [-D * .25, 0, D * .25]) g.add(tray(x, z));
  /* the lid, hinged on the back edge */
  const lid = new T.Group(), lidBody = new T.Group();
  lidBody.add(B(W + .04, .1, D + .04, board, 0, .05, D / 2));
  const le = KIT.lineBox(W + .06, .1, D + .06, .05, band); le.position.z = D / 2; lidBody.add(le);
  lid.add(lidBody); lid.position.set(0, box0 + H, -D / 2 - .02); g.add(lid);
  const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const hd = { group: root, w: W, h: H + sk, d: D, s: { rise: o.rise ?? 1, open: o.open ?? 0 },
    top: () => { const p = new T.Vector3(0, H + sk + .5, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
    apply() { g.position.y = -(H + sk + .3) * (1 - hd.s.rise); root.visible = hd.s.rise > .001;
      lid.rotation.x = -1.15 * hd.s.open; lid.position.y = box0 + H + .5 * hd.s.open * 0; } };
  return w.add(hd);
} };
