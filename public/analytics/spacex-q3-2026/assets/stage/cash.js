/* KIT.cash — money as a thing. A bundle of notes (cream paper, engraved in grey line, a gold strap), stacked into a tower whose
   bundle count IS the figure: n = usd / per. Honest scale: every tower on a board uses the same `per`.
   const c = KIT.cash.tower(w, { usd: BW.fig(k).v, per: 10000, cols: 2, rows: 2, at: [x, 0, z], size: 1, red: false });
     usd and per in USD millions, as data.js holds them (per 10000 = one bundle per $10B). cols × rows bundles a layer.
     red: true for money lost or burned (red only for loss).
   c.s.fill 0..1   bundles land from the bottom up, in count order (fill × n of them on the stage)
   c.n, c.height, c.top()  bundle count, tower height, the world point over its top (for its figure)
   KIT.cash.bundle(w, { size, red }) one bundle (a Mesh), for a page that lays money out by hand. */
KIT.cash = {
  _tex: null,
  face(w) {
    if (KIT.cash._tex) return KIT.cash._tex;
    KIT.cash._tex = S3.canvasTex(w.renderer, 512, 216, (c, W, H) => {
      c.fillStyle = '#E9E4D4'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(60,66,58,.55)'; c.lineWidth = 3; c.strokeRect(10, 10, W - 20, H - 20);
      c.lineWidth = 1.5; c.strokeRect(20, 20, W - 40, H - 40);
      c.beginPath(); c.ellipse(W / 2, H / 2, 54, 66, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(W / 2, H / 2, 46, 58, 0, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(70, H / 2, 10 + i * 2.2, 0, Math.PI * 2); c.globalAlpha = .25; c.stroke(); }
      for (let i = 0; i < 18; i++) { c.beginPath(); c.arc(W - 70, H / 2, 10 + i * 2.2, 0, Math.PI * 2); c.stroke(); }
      c.globalAlpha = 1;
    });
    return KIT.cash._tex;
  },
  bundle(w, o = {}) {
    const T = THREE, k = o.size || 1, L = 1.0 * k, Wd = L / 2.35, Hh = .13 * k;
    const face = new T.MeshStandardMaterial({ map: KIT.cash.face(w), roughness: .9, envMapIntensity: .2, color: o.red ? S3.tok('--red').lerp(new T.Color(1, 1, 1), .25) : new T.Color(1, 1, 1) });
    const edge = KIT.M({ color: o.red ? S3.tok('--red', .8) : S3.col(0xd6d0bf), roughness: .95 });
    const m = new T.Mesh(new T.BoxGeometry(L, Hh, Wd), [edge, edge, face, edge, edge, edge]); m.castShadow = m.receiveShadow = true;
    const strap = KIT.box(L * .14, Hh + .006, Wd + .006, w.mat.gold); m.add(strap);
    m.userData = { L, W: Wd, H: Hh };
    return m;
  },
  tower(w, o = {}) {
    const T = THREE, n = Math.max(1, Math.round((o.usd || 0) / (o.per || 10000))), cols = o.cols ?? 2, rows = o.rows ?? 2, per = cols * rows;
    const g = new T.Group(), list = [], proto = KIT.cash.bundle(w, o), { L, W, H } = proto.userData, gap = .015 * (o.size || 1);
    for (let i = 0; i < n; i++) {
      const layer = Math.floor(i / per), j = i % per, cx = j % cols, rz = Math.floor(j / cols);
      const b = proto.clone(); const rot = (layer % 2) ? Math.PI : 0;        /* every other layer turned, as a real stack is */
      b.position.set((cx - (cols - 1) / 2) * (L + gap), H / 2 + layer * (H + gap * .3), (rz - (rows - 1) / 2) * (W + gap)); b.rotation.y = rot;
      g.add(b); list.push(b);
    }
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const height = Math.ceil(n / per) * (H + gap * .3);
    const hd = { group: root, n, height, s: { fill: o.fill ?? 1 },
      top: () => { const p = new T.Vector3(0, height, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { const shown = hd.s.fill * n; list.forEach((b, i) => { const u = Math.min(1, Math.max(0, shown - i)); b.visible = u > .001; b.position.y = b.userData.y0 + (1 - u) * .6; }); } };
    list.forEach(b => { b.userData.y0 = b.position.y; });
    return w.add(hd);
  }
};
