/* KIT.hotel and KIT.apartment — how the compute is rented. The apartment block: the same flat on every floor, balconies, lease
   signs hung on the rails (most AI clouds: multi-year leases at a fixed price). The hotel: gold-line fins, a canopy over a
   revolving door, rooms that light by the night (SpaceX: short stays at today's rate). Both: lit rooms are a warm flat pane,
   never a glow.
   const a = KIT.apartment.create(w, { bays: 6, floors: 7, at, yaw, lit: .8, signs: [{ bay, floor, text }] });
     sign text: a figure or a word from the script only (rule 16), or none (a plain board).
   a.s.rise, a.s.lit 0..1 (share of flats lit, a fixed seeded order), a.s.signs 0..1 (the signs drop onto the rails)
   const h = KIT.hotel.create(w, { bays: 7, floors: 12, at, yaw, lit: .6 });
   h.s.rise, h.s.lit 0..1 (rooms lit tonight; tween it for occupancy), h.door() world point at the lobby door (for a guest),
   h.top() world point over the roof. Sizes: h.w, h.h, h.d. */
(() => {
  const order = (n, seed) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: n }, (_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(p => p[1]); };
  KIT.apartment = { create(w, o = {}) {
    const T = THREE, B = KIT.box, bays = o.bays ?? 6, floors = o.floors ?? 7, bw = o.bay ?? 1.1, fh = o.floorH ?? .9, dep = o.dep ?? 3.2;
    const W = bays * bw, H = floors * fh + .3, g = new T.Group(), panes = [], signs = [];
    const slab = o.slab || w.mat.grey, rail = w.mat.greyLine;
    g.add(B(W, H, dep, o.body || w.mat.card, 0, H / 2, 0));
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const x = -W / 2 + (b + .5) * bw, y = .3 + f * fh;
      const p = B(bw * .5, fh * .5, .04, w.mat.glass, x, y + fh * .45, dep / 2 + .01); g.add(p); panes.push(p);
      if (f > 0) {
        g.add(B(bw * .86, .05, .34, slab, x, y + .03, dep / 2 + .17));
        g.add(B(bw * .86, .03, .03, rail, x, y + .32, dep / 2 + .33));
        for (const dx of [-.43, .43]) g.add(B(.025, .3, .025, rail, x + dx * bw, y + .18, dep / 2 + .33));
      }
    }
    g.add(B(W + .1, .12, dep + .1, slab, 0, H + .06, 0));
    (o.signs || []).forEach(sg => {
      const x = -W / 2 + (sg.bay + .5) * bw, y = .3 + sg.floor * fh, sw = bw * .62, sh = fh * .36;
      const board = new T.Group();
      const face = sg.text ? new T.MeshStandardMaterial({ map: KIT.textTex(w, sg.text, { px: 120, ink: '#0a0a0f', bg: '#F2EEE4', family: 'Inter' }), roughness: .8 }) : KIT.M({ color: S3.tok('--cream'), roughness: .8 });
      const side = KIT.M({ color: S3.col(0xd8d2c4) });
      const m = new T.Mesh(new T.BoxGeometry(sw, sh, .02), [side, side, side, side, face, side]); m.castShadow = true; board.add(m);
      board.position.set(x, y + .22, dep / 2 + .35); g.add(board); signs.push({ m: board, y: y + .22 });
    });
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const ord = order(panes.length, 7);
    const hd = { group: root, w: W, h: H + .12, d: dep, s: { rise: o.rise ?? 1, lit: o.lit ?? 0, signs: o.signsIn ?? 1 },
      top: () => { const p = new T.Vector3(0, H + .5, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { const s = hd.s; g.position.y = -(H + .2) * (1 - s.rise); root.visible = s.rise > .001;
        const k = Math.round(s.lit * panes.length); ord.forEach((pi, j) => { panes[pi].material = j < k ? w.mat.room : w.mat.glass; });
        signs.forEach((sg, i) => { const u = Math.min(1, Math.max(0, s.signs * signs.length - i)); sg.m.visible = u > .001; sg.m.position.y = sg.y + (1 - u) * .4; }); } };
    return w.add(hd);
  } };

  /* KIT.desk — the hotel's front desk, standing on the stage: a counter with a gold-line top edge; a receipt lies on it.
     const d = KIT.desk.create(w, { w: 4, h: 1.1, d: 1.2, at, yaw });  d.s.rise; d.topAt(u, v) world point on its top (0..1 across, 0..1 deep) */
  KIT.desk = { create(w, o = {}) {
    const T = THREE, B = KIT.box, W = o.w ?? 4, H = o.h ?? 1.1, D = o.d ?? 1.2, g = new T.Group();
    g.add(B(W, H - .06, D * .92, w.mat.graphite, 0, (H - .06) / 2, 0));
    g.add(B(W + .12, .06, D, w.mat.slab, 0, H - .03, 0));
    const e = KIT.lineBox(W + .12, .06, D, .025, w.mat.goldLine); e.position.y = H - .06; g.add(e);
    for (let x = -W / 2 + .4; x < W / 2 - .2; x += .4) g.add(B(.02, H - .2, .02, w.mat.goldLine, x, (H - .06) / 2, D * .46 + .01));
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, w: W, h: H, d: D, s: { rise: o.rise ?? 1 },
      topAt: (u = .5, v = .5) => { const p = new T.Vector3(-W / 2 + u * W, H, -D / 2 + v * D); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { g.position.y = -(H + .1) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  } };

  /* KIT.suitcase — a guest: a rolling case with a company's mark on its face (KIT.markTex), at a lobby door.
     const g = KIT.suitcase.create(w, { mark: tex, at, yaw, size: 1 });  g.s.rise; g.s.roll (metres rolled along its facing, for an arrival) */
  KIT.suitcase = { create(w, o = {}) {
    const T = THREE, B = KIT.box, k = o.size || 1, W = .55 * k, H = .78 * k, D = .3 * k, g = new T.Group();
    const body = KIT.M({ color: S3.col(S3.MAT.card).multiplyScalar(1.3), roughness: .6, metalness: .1 });
    const shell = S3.block(W, H, D, body, .04 * k); shell.position.y = .07 * k; g.add(shell);
    for (const dx of [-W / 2 + .06 * k, W / 2 - .06 * k]) for (const dz of [-D / 2 + .06 * k, D / 2 - .06 * k]) { const wh = KIT.cyl(.035 * k, .035 * k, .03 * k, w.mat.rubber, 20); wh.rotation.z = Math.PI / 2; wh.position.set(dx, .035 * k, dz); g.add(wh); }
    for (const dx of [-.13 * k, .13 * k]) g.add(B(.02 * k, .55 * k, .02 * k, w.mat.greyLine, dx, (.07 + .78 + .27) * k, -D / 2 + .05 * k));
    g.add(B(.3 * k, .035 * k, .045 * k, w.mat.rubber, 0, (.07 + .78 + .55) * k, -D / 2 + .05 * k));
    if (o.mark) { const a = o.mark.image.width / o.mark.image.height, mw = W * .55; const d = KIT.decal(o.mark, mw, mw / a); d.position.set(0, .07 * k + H * .55, D / 2 + .004); g.add(d); }
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, h: (.07 + .78 + .58) * k, s: { rise: o.rise ?? 1, roll: 0 },
      apply() { g.position.y = -(H + .2) * (1 - hd.s.rise); g.position.z = hd.s.roll; root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  } };

  KIT.hotel = { create(w, o = {}) {
    const T = THREE, B = KIT.box, bays = o.bays ?? 7, floors = o.floors ?? 12, bw = o.bay ?? .9, fh = o.floorH ?? .8, dep = o.dep ?? 3.4, lobby = o.lobby ?? 1.5;
    const W = bays * bw, H = lobby + floors * fh, g = new T.Group(), line = o.line === 'grey' ? w.mat.greyLine : w.mat.goldLine, panes = [];
    g.add(B(W, H, dep, o.body || w.mat.graphite, 0, H / 2, 0));
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) { const p = B(bw * .46, fh * .52, .04, w.mat.glass, -W / 2 + (b + .5) * bw, lobby + f * fh + fh * .5, dep / 2 + .01); g.add(p); panes.push(p); }
    for (let b = 0; b <= bays; b++) g.add(B(.035, H - lobby, .12, line, -W / 2 + b * bw, lobby + (H - lobby) / 2, dep / 2 + .06));
    for (let f = 0; f <= floors; f += 2) g.add(B(W, .025, .06, line, 0, lobby + f * fh, dep / 2 + .03));
    g.add(B(W * .86, lobby * .82, .04, w.mat.glass, 0, lobby * .41, dep / 2 + .01));
    const door = KIT.cyl(.42, .42, lobby * .78, w.mat.glass, 40); door.position.set(0, lobby * .39, dep / 2 + .22); g.add(door);
    for (let i = 0; i < 4; i++) { const p = B(.012, lobby * .78, .8, line, 0, lobby * .39, dep / 2 + .22); p.rotation.y = i * Math.PI / 4; g.add(p); }
    const cw = Math.min(2.6, W * .5), cd = 1.6;
    g.add(B(cw, .08, cd, w.mat.graphite, 0, lobby + .02, dep / 2 + cd / 2));
    const ce = KIT.lineBox(cw, .08, cd, .03, line); ce.position.set(0, lobby - .02, dep / 2 + cd / 2); g.add(ce);
    for (const dx of [-cw / 2 + .08, cw / 2 - .08]) g.add(B(.05, lobby, .05, line, dx, lobby / 2, dep / 2 + cd - .1));
    g.add(KIT.lineBox(W, H, dep, .05, line));
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const ord = order(panes.length, 11);
    const P = (x, y, z) => () => { const p = new T.Vector3(x, y, z); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; };
    const hd = { group: root, w: W, h: H, d: dep, lobby, s: { rise: o.rise ?? 1, lit: o.lit ?? 0 },
      door: P(0, 0, dep / 2 + cd + .2), top: P(0, H + .4, 0),
      apply() { const s = hd.s; g.position.y = -(H + .2) * (1 - s.rise); root.visible = s.rise > .001;
        const k = Math.round(s.lit * panes.length); ord.forEach((pi, j) => { panes[pi].material = j < k ? w.mat.room : w.mat.glass; }); } };
    return w.add(hd);
  } };
})();
