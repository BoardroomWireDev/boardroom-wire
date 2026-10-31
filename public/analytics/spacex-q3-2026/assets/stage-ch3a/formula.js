/* KIT.c3a.formula — the formula as things, shared by boards 72 (3.7–3.8) and 74 (3.10), so 74 opens on 72's last frame.
   Hall × tag = money. One hall is one gigawatt (on these boards: 3 long); the price tag hangs on the first; the money is a
   tower of bundles whose count is the figure (one bundle = $10B, every bundle on both boards).
   Musk's 13 GW is a forecast, so the twelve halls beyond the first are ghosts (dashed). Thirteen stand as an estate three
   across and five deep (3, 3, 3, 3, 1), so the pulled-back frame has depth. The middle row's left hall is in two halves, so
   "half" can be exact: the rented half is the front two rows and one half-hall (6.5), the half SpaceX keeps is the rest (6.5).
   const S = await KIT.c3a.formula(w, { usd, per, rangeLo, rangeHi, tagFaces })
     S.hall the gold hall · S.ghosts (in landing order) · S.tag, S.spin · S.tower · S.range (the dashed $500B–$1T column)
     S.rented / S.kept (ghost halves for 3.10; the gold hall is rented) · S.pt (named world points) · S.SHOT */
KIT.c3a.formula = async (w, o) => {
  const L = 3.0, WD = 1.7, HG = 1.1, GX = .35, GZ = .8, XG = -10.05, ZF = 1.2;
  const mSX = await KIT.markTex(w, 'assets/logos/spacex-wordmark.svg', S3.css('--cream'));
  const col = (i) => XG + i * (L + GX), row = (r) => ZF - r * (WD + GZ);
  /* the gold hall: front row, right column (nearest the money) */
  const hall = KIT.hall.create(w, { len: L, wid: WD, hgt: HG, at: [col(2), 0, ZF], mark: mSX, markH: .2, door: false, rise: 0 });
  const gh = (x, z, len) => KIT.c3a.ghost(w, { len, wid: WD, hgt: HG, at: [x, 0, z], op: 0, hatch: o.hatch });   /* o.hatch: p2's calmer hatch */
  const G = {};
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    if (r === 0 && c === 2) continue;
    if (r === 2 && c === 0) { G['2.0a'] = gh(col(0), row(2), L / 2 - .02); G['2.0b'] = gh(col(0) + L / 2 + .02, row(2), L / 2 - .02); continue; }
    G[r + '.' + c] = gh(col(c), row(r), L);
  }
  G['4.1'] = gh(col(1), row(4), L);
  /* landing order: nearest the gold hall first, outward and back */
  const order = ['0.1', '1.2', '0.0', '1.1', '1.0', '2.2', '2.1', '2.0b', '2.0a', '3.2', '3.1', '3.0', '4.1'];
  const ghosts = order.map(k => G[k]);
  const rented = ['0.0', '0.1', '1.0', '1.1', '1.2', '2.0a'].map(k => G[k]);
  const kept = ['2.0b', '2.1', '2.2', '3.0', '3.1', '3.2', '4.1'].map(k => G[k]);
  /* the tag on the gold hall's face */
  const TH = 1.55, TW = 1.12, lean = Math.acos((HG - .04) / (TH * .93));
  const tag = KIT.tag.create(w, { anchor: [col(2) + L * .5, HG, ZF + WD / 2 + .03], drop: .04, w: TW, h: TH, lean, lines: [], dropIn: 0 });
  const spin = KIT.c3a.spinner(w, tag, o.tagFaces);
  /* the money: one tower, a bundle per $10B */
  const TX = col(2) + L + 2.7;
  const tower = KIT.cash.tower(w, { usd: o.usd, per: o.per, cols: 2, rows: 2, size: 1.15, at: [TX, 0, ZF], fill: 0 });
  const layerH = tower.height / Math.ceil(tower.n / 4);
  const bw = 1.15 * 2 + .03, bd = 1.15 / 2.35 * 2 + .03;
  /* Musk's range, $500B to $1T, as a dashed column over the tower (a forecast is never solid) */
  const y0 = layerH * o.rangeLo / o.per / 4, y1 = layerH * o.rangeHi / o.per / 4;
  const range = KIT.c3a.ghost(w, { len: bw + .2, wid: bd + .2, hgt: y1 - y0, at: [TX - bw / 2 - .1, y0, ZF], op: 0, dash: .22, gap: .14, body: false });   /* a frame only: the tower shows through */
  /* o.estimate (p2): our $ figures are estimates, so the money is hatched: every landed bundle wears hatched gold sides, the
     diagonals running unbroken up the stack (each layer's pattern offset by its height). Positions follow KIT.cash.tower's layout. */
  let est = null;
  if (o.estimate) {
    const tex = S3.canvasTex(w.renderer, 256, 256, (c, W, H) => { c.clearRect(0, 0, W, H); c.strokeStyle = '#ffffff'; c.lineWidth = 16;
      for (let x = -H; x < W + H; x += 64) { c.beginPath(); c.moveTo(x, H); c.lineTo(x + H, 0); c.stroke(); } });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const k = 1.15, d = KIT.cash.bundle(w, { size: k }).userData, gap = .015 * k, cols = 2, rows = 2, per = cols * rows;
    const none = new THREE.MeshBasicMaterial({ visible: false }), geo = new THREE.BoxGeometry(d.L + .02, d.H + .004, d.W + .02);   /* sides only */
    const mats = {}, mat = (layer) => mats[layer] || (mats[layer] = (() => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set((d.L + .02) / .8, (d.H + .004) / .8); t.offset.y = layer * (d.H + gap * .3) / .8;
      const m = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(S3.css('--gold')), transparent: true, opacity: .92, depthWrite: false }); return [m, m, none, none, m, m]; })());
    const shells = [];
    for (let i = 0; i < tower.n; i++) {
      const layer = Math.floor(i / per), q = i % per, cx = q % cols, rz = Math.floor(q / cols);
      const b = new THREE.Mesh(geo, mat(layer)); b.position.set(TX + (cx - (cols - 1) / 2) * (d.L + gap), d.H / 2 + layer * (d.H + gap * .3), ZF + (rz - (rows - 1) / 2) * (d.W + gap));
      b.rotation.y = (layer % 2) ? Math.PI : 0; b.renderOrder = 2; b.visible = false; w.scene.add(b); shells.push(b);
    }
    est = w.add({ s: {}, apply() { const shown = tower.s.fill * tower.n; shells.forEach((b, i) => { b.visible = shown - i >= .999; }); } });
  }
  const pools = {
    hall: KIT.c3a.pool(w, [col(2) + L / 2 + 1.6, ZF + 1.4], 5.5, { I: 1000, h: 16, on: 0 }),
    grid: KIT.c3a.pool(w, [col(1) + L / 2, row(2)], 9, { I: 1100, h: 22, on: 0 }),
    tower: KIT.c3a.pool(w, [TX, ZF + 1.2], 4.0, { I: 700, h: 16, on: 0 })
  };
  const view = (tx, ty, tz, d, yaw, pitch, fov = 26) => { const a = yaw * Math.PI / 180, p = pitch * Math.PI / 180; return { px: tx + d * Math.sin(a) * Math.cos(p), py: ty + d * Math.sin(p), pz: tz + d * Math.cos(a) * Math.cos(p), tx, ty, tz, fov }; };
  const SHOT = {
    hall: view(col(2) + L / 2 + .1, .62, ZF, 8.6, -8, 6),
    pair: view(col(2) + L / 2 + 2.3, .8, ZF, 13.0, -8, 7),
    wide: view(col(1) + 2.6, -1.1, row(2) + .7, 29.5, -12, 25)
  };
  return { hall, ghosts, G, rented, kept, tag, spin, tower, range, est, pools, SHOT, view,
    pt: { hallTop: [col(2) + L / 2, HG, ZF], tagFoot: [col(2) + L * .5, 0, ZF + WD / 2 + .35], eq: [col(2) + L + 1.05, HG * .55, ZF],
          towerFoot: [TX, 0, ZF + bd / 2 + .5], towerTop: () => tower.top(), gridTop: [col(1) + L / 2, HG * 1.2, row(4) - WD / 2],
          gridFront: [col(1) + L / 2, 0, ZF + WD / 2 + .5], rangeSide: [TX, y1 + .15, ZF] },
    dims: { L, WD, HG, TX, layerH, bw } };
};
