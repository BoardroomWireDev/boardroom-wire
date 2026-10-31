/* KIT v2 · KIT.hotel, KIT.apartment, KIT.desk, KIT.suitcase (Ive, 28 Oct 2026, the polish pass). Same API as v1, rebuilt to the bar.
   How the compute is rented: the apartment block (most AI clouds: multi-year leases at a fixed price), the hotel (SpaceX: short
   stays at today's rate). Lit rooms are w.mat.room, a warm flat pane: the one self-lit thing, never a glow. Nothing else emits.

   Real dimensions (1 stage unit = 4 m for the hotel, 3 m for the apartment, as v1 sized them):
   - hotel: floor-to-floor 3.2 m (fh .8), bay 3.6 m (bw .9), a 6 m lobby podium in dark stone, a tower of curtain wall (glass 3.0 m
     wide x 1.8 m high in a painted frame with a mullion and a transom, a 0.8 m spandrel at each slab), gold fins 12 cm wide and
     40 cm deep on every bay line, a recessed lobby (1 m deep behind a stone lintel and piers), a 6.4 m canopy with a gold edge
     over a drop-off apron, a revolving door (2.7 m drum, four glass wings, steel head and sill), a roof plant screen 1 m high.
   - apartment: floor-to-floor 2.7 m (fh .9), flat width 3.3 m (bw 1.1), render over a 0.9 m stone plinth, a full-height window
     door per flat (1.8 m) in an aluminium frame, a balcony per flat from the first floor (1 m deep, 0.9 m glass or bar
     balustrade, a 0.2 m slab edge), an entrance door with canopy and two steps, a lift overrun and vents on the roof.
   - desk: 1.05 m counter; walnut veneer in 0.7 m panels with a gold hairline inlay, a stone top with a raised guest ledge
     at the front, a steel kick plate (the top surface stays at y = h: receipts lie on it).
   - suitcase: 55 x 40 x 23 cm carry-on shell (the v1 proportions), ribbed front and back panels, a zip seam, corner guards,
     four twin spinner wheels, a two-stage telescoping handle, a top carry handle.

   const a = KIT.apartment.create(w, { bays: 6, floors: 7, at, yaw, lit: .8, signs: [{ bay, floor, text }] });
     sign text: a figure or a word from the script only (rule 16), or none (a plain board).
   a.s.rise, a.s.lit 0..1 (share of flats lit, a fixed seeded order), a.s.signs 0..1 (the signs drop onto the rails)
   const h = KIT.hotel.create(w, { bays: 7, floors: 12, at, yaw, lit: .6 });
   h.s.rise, h.s.lit 0..1 (rooms lit tonight; tween it for occupancy), h.door() world point at the lobby door (for a guest),
   h.top() world point over the roof. Sizes: h.w, h.h, h.d.
   const d = KIT.desk.create(w, { w: 4, h: 1.1, d: 1.2, at, yaw });  d.s.rise; d.topAt(u, v) world point on its top (0..1 across, 0..1 deep)
   const g = KIT.suitcase.create(w, { mark: tex, at, yaw, size: 1 });  g.s.rise; g.s.roll (metres rolled along its facing)
   Options as v1: bays floors bay floorH dep lobby line('grey') body slab at yaw rise lit signs signsIn mark size w h d. */
(() => {
  const T = THREE, cache = {};
  const once = (k, f) => cache[k] || (cache[k] = f());
  const order = (n, seed) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; return Array.from({ length: n }, (_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(p => p[1]); };
  const rgb = (b, d) => `rgb(${b.map(v => Math.max(0, Math.min(255, v + d))).join(',')})`;
  const rep = (base, rx, ry = 1) => once('rep|' + base.uuid + '|' + rx.toFixed(2) + '|' + ry.toFixed(2), () => { const t = base.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return t; });
  const texMat = (map, o = {}) => new T.MeshStandardMaterial(Object.assign({ map, color: 0xffffff, roughness: .74, metalness: .06, envMapIntensity: .5 }, o));
  const base = (w, key, pw, ph, paint) => once('base|' + key, () => KIT.tile(w, pw, ph, paint, 1, 1));
  const speckle = (g, W, H, n, seed, a) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < n; i++) { g.fillStyle = r() < .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.fillRect(r() * W, r() * H, 1 + r() * 1.6, 1 + r() * 1.6); } };
  const at4 = (x, y, z, sx, sy, sz) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion(), new T.Vector3(sx, sy, sz));
  const inst = (mat, ms) => { const m = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, ms.length); ms.forEach((M, i) => m.setMatrixAt(i, M)); m.castShadow = true; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true; return m; };
  const plane = (wd, ht, mat) => { const m = new T.Mesh(new T.PlaneGeometry(wd, ht), mat); m.receiveShadow = true; return m; };

  /* ---------- shared textures ---------- */
  /* ashlar stone: four courses, staggered joints; a 0.6 u square */
  const stoneBase = (w, tone = [74, 75, 81], key = 'stone') => base(w, key, 256, 256, (g, W, H) => {
    g.fillStyle = rgb(tone, 0); g.fillRect(0, 0, W, H);
    for (let c = 0; c < 8; c++) {
      const y = c * 32; g.fillStyle = rgb(tone, ((c * 7) % 5) - 2); g.fillRect(0, y, W, 32);
      const off = (c % 2) * 32; for (let x = off; x < W + 64; x += 64) { g.fillStyle = rgb(tone, ((x / 64 + c * 3) % 3) * 2 - 2); g.fillRect(x + 1, y + 1, 62, 30); g.fillStyle = rgb(tone, -24); g.fillRect(x - 1, y, 2, 32); g.fillStyle = rgb(tone, 11); g.fillRect(x + 1, y, 1, 32); }
      g.fillStyle = rgb(tone, -26); g.fillRect(0, y, W, 2); g.fillStyle = rgb(tone, 12); g.fillRect(0, y + 2, W, 1);
    }
    speckle(g, W, H, 900, 5, .05);
  });
  const stoneMat = (w, rx, ry, tone, key) => once('smat|' + key + rx.toFixed(1) + '|' + ry.toFixed(1), () => texMat(rep(stoneBase(w, tone, key), Math.max(.5, rx), Math.max(.5, ry)), { roughness: .8, metalness: .04, envMapIntensity: .4 }));
  /* a block of stone with courses sized right on every face (0.6 u per tile) */
  const stoneBox = (w, tone, key, wd, ht, dd, x, y, z) => {
    const s = .6, m = (a, b) => inkMat(rep(plinthBase(w), a / s, b / s));
    return KIT.box(wd, ht, dd, [m(dd, ht), m(dd, ht), m(wd, dd), m(wd, dd), m(wd, ht), m(wd, ht)], x, y, z);
  };

  /* ================================================================== HOTEL ================================================================== */
  /* one bay of curtain wall: spandrel panel, the frame reveal round the glass, the slab edge line */
  const hotelCell = (g, W, H) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    speckle(g, W, H, 700, 3, .03);
    g.fillStyle = '#ece6d6'; g.fillRect(0, H - 5, W, 5);                                   /* the slab edge: full cream */
    g.fillStyle = 'rgba(236,230,214,.3)'; g.fillRect(0, H - 9, W, 2);
    const x0 = W * .07, x1 = W * .93, y0 = H * .15, y1 = H * .75;
    g.strokeStyle = 'rgba(236,230,214,.6)'; g.lineWidth = 2.5; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(236,230,214,.3)'; g.lineWidth = 1.8; g.strokeRect(x0, y1 + 12, x1 - x0, H - y1 - 28);   /* the spandrel panel */
  };
  /* an unlit pane: dark tinted glass, a graded sky above, a faint diagonal reflection; four variants */
  const paneTex = (w, v) => once('pane' + v, () => S3.canvasTex(w.renderer, 338, 200, (g, W, H) => {
    g.fillStyle = '#16181d'; g.fillRect(0, 0, W, H);
    const sx = W * (.12 + v * .19);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + W * .22, 0); g.lineTo(sx + W * .22 - H * .5, H); g.lineTo(sx - H * .5, H); g.closePath(); g.fill();
    g.strokeStyle = '#ece6d6'; g.lineWidth = 5; g.strokeRect(2.5, 2.5, W - 5, H - 5);
  }));
  const louvreTex = (w) => base(w, 'louvre2', 256, 128, (g, W, H) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    for (let y = 2; y < H; y += 8) { g.fillStyle = 'rgba(236,230,214,.6)'; g.fillRect(0, y, W, 2.2); }
    for (const x of [0, W / 2]) { g.fillStyle = '#ece6d6'; g.fillRect(x, 0, 4, H); }
  });
  const lobbyGlassTex = (w) => base(w, 'lobbyglass', 128, 256, (g, W, H) => {
    const gg = g.createLinearGradient(0, 0, 0, H); gg.addColorStop(0, '#59606c'); gg.addColorStop(1, '#2f353d'); g.fillStyle = gg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(W * .1, 0); g.lineTo(W * .5, 0); g.lineTo(W * .5 - H * .3, H); g.lineTo(W * .1 - H * .3, H); g.closePath(); g.fill();
  });
  const veneerBase = (w) => base(w, 'veneer', 512, 512, (g, W, H) => {
    g.fillStyle = '#41352a'; g.fillRect(0, 0, W, H);
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 160; i++) { const x = r() * W; g.fillStyle = r() < .5 ? `rgba(255,235,200,${.03 + r() * .04})` : `rgba(0,0,0,${.05 + r() * .06})`; g.fillRect(x, 0, .8 + r() * 2.2, H); }
    g.fillStyle = '#1c1712'; g.fillRect(0, 0, 4, H); g.fillRect(0, 0, W, 4); g.fillRect(0, H - 4, W, 4);
    g.fillStyle = 'rgba(255,230,190,.12)'; g.fillRect(4, 4, 1.5, H - 8); g.fillRect(4, 4, W - 8, 1.5);
    g.fillStyle = 'rgba(190,150,70,.78)'; g.fillRect(W - 6, 14, 2.5, H - 28);
  });

  KIT.hotel = { create(w, o = {}) {
    const B = KIT.box, bays = o.bays ?? 7, floors = o.floors ?? 12, bw = o.bay ?? .9, fh = o.floorH ?? .8, dep = o.dep ?? 3.4, lobby = o.lobby ?? 1.5;
    const W = bays * bw, H = lobby + floors * fh, tH = floors * fh, g = new T.Group(), gold = (o.line === 'grey' ? w.mat.greyLine : w.mat.trim), panes = [];
    const frameM = KIT.M({ color: S3.col(0xece6d6), roughness: .55, metalness: 0, emissive: S3.col(0xece6d6), emissiveIntensity: .16, envMapIntensity: .3 });
    const dk = KIT.M({ color: S3.col(0x15161a), roughness: .8, metalness: 0, envMapIntensity: .25 });
    /* the tower: curtain wall on every face, the roof slab above */
    const cellF = rep(base(w, 'hcell', 288, 256, hotelCell), bays, floors), cellS = rep(base(w, 'hcell', 288, 256, hotelCell), Math.max(1, Math.round(dep / bw)), floors);
    const wallF = o.body || inkMat(cellF), wallS = o.body || inkMat(cellS);
    g.add(B(W, tH, dep, [wallS, wallS, dk, dk, wallF, wallS], 0, lobby + tH / 2, 0));
    const gm = [0, 1, 2, 3].map(v => KIT.M({ map: paneTex(w, v), color: 0xffffff, roughness: .25, metalness: .2, envMapIntensity: .5 }));
    const pw = bw * .84, ph = fh * .56, mul = [];
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const x = -W / 2 + (b + .5) * bw, y = lobby + f * fh + fh * .55;
      const p = B(pw, ph, .016, gm[(f * 7 + b * 3) % 4], x, y, dep / 2 + .008); p.userData.gm = gm[(f * 7 + b * 3) % 4]; g.add(p); panes.push(p);
      mul.push(at4(x, y, dep / 2 + .019, .016, ph, .012), at4(x, y + ph * .16, dep / 2 + .019, pw, .014, .012));
    }
    g.add(inst(frameM, mul));
    /* the gold fins: slim, deep, one on every bay line, from the podium to the roof */
    for (let b = 0; b <= bays; b++) g.add(B(.03, tH + .03, .1, gold, -W / 2 + b * bw, lobby + tH / 2, dep / 2 + .05));
    /* the roof: a slab with a gold coping, the plant screen and a lift housing */
    const ry = H + .03; g.add(KIT.bbox(W + .05, .06, dep + .05, dk, 0, ry, 0, .01));
    const ct = .022, cy = H + .06 + ct / 2;
    for (const z of [-dep / 2 - .0, dep / 2]) g.add(B(W + .05, ct, ct * 1.4, gold, 0, cy, z));
    for (const x of [-W / 2, W / 2]) g.add(B(ct * 1.4, ct, dep + .05, gold, x, cy, 0));
    const lv = rep(louvreTex(w), 3, 2);
    g.add(B(W * .6, .26, dep * .44, inkMat(lv), -W * .08, H + .06 + .13, -dep * .12));
    g.add(B(W * .6 + .03, .014, dep * .44 + .03, frameM, -W * .08, H + .06 + .27, -dep * .12));
    g.add(B(W * .16, .15, dep * .2, dk, W * .32, H + .06 + .075, dep * .1)); g.add(B(W * .16 + .01, .012, dep * .2 + .01, frameM, W * .32, H + .06 + .15, dep * .1));
    /* the podium: dark stone wings and back wall, the recessed lobby glass behind piers under a deep lintel */
    const ww = W * .07, Wg = W - 2 * ww, zg = dep / 2 - .26, zb = zg - .45, lt = .22, hg = lobby - lt, STONE = [66, 67, 73];
    for (const s of [-1, 1]) g.add(stoneBox(w, STONE, 'pod', ww, lobby, dep, s * (W / 2 - ww / 2), lobby / 2, 0));
    g.add(stoneBox(w, STONE, 'pod', Wg, lobby, zb + dep / 2, 0, lobby / 2, (zb - dep / 2) / 2));
    g.add(stoneBox(w, STONE, 'pod', Wg, lt, dep / 2 - zb, 0, lobby - lt / 2, (zb + dep / 2) / 2));
    g.add(KIT.bbox(W + .04, .05, dep + .04, dk, 0, lobby + .005, 0, .008)); g.add(B(W + .045, .012, .012, frameM, 0, lobby + .032, dep / 2 + .022));
    const veneer = texMat(rep(veneerBase(w), Math.round(Wg / .7), 1), { roughness: .6, metalness: .05 });
    const iw = plane(Wg, hg, veneer); iw.position.set(0, hg / 2, zb + .004); g.add(iw);
    const fl = plane(Wg, zg - zb, inkMat(rep(plinthBase(w), Wg / .6, (zg - zb) / .6))); fl.rotation.x = -Math.PI / 2; fl.position.set(0, .012, (zg + zb) / 2); g.add(fl);
    const lg = plane(Wg, hg, new T.MeshStandardMaterial({ map: rep(lobbyGlassTex(w), 1, 1), transparent: true, opacity: .4, roughness: .12, metalness: .2, envMapIntensity: .6, depthWrite: false }));
    lg.position.set(0, hg / 2, zg); lg.receiveShadow = false; g.add(lg);
    const lm = [];
    for (let x = -Wg / 2; x <= Wg / 2 + .001; x += bw / 2) lm.push(at4(x, hg / 2, zg + .004, .016, hg, .014));
    lm.push(at4(0, hg * .72, zg + .004, Wg, .014, .014), at4(0, .02, zg + .004, Wg, .04, .02));
    g.add(inst(frameM, lm));
    for (let b = 1; b < bays; b++) { const x = -W / 2 + b * bw; if (Math.abs(x) < .7) continue; g.add(stoneBox(w, STONE, 'pod', .09, hg, dep / 2 - zg + .0, x, hg / 2, (zg + dep / 2) / 2)); }
    /* the canopy over the drop-off: a slab with a gold edge on two slim posts, over a paved apron */
    const steelL = frameM;
    const cw = Math.min(2.6, W * .5), cd = 1.6, cyc = lobby - .06;
    g.add(KIT.bbox(cw, .1, cd, dk, 0, cyc, dep / 2 + cd / 2, .012)); g.add(B(cw, .01, .01, frameM, 0, cyc + .052, dep / 2 + cd - .005), B(.01, .01, cd, frameM, -cw / 2 + .005, cyc + .052, dep / 2 + cd / 2), B(.01, .01, cd, frameM, cw / 2 - .005, cyc + .052, dep / 2 + cd / 2));
    g.add(B(cw + .01, .034, .034, gold, 0, cyc - .02, dep / 2 + cd));
    for (const s of [-1, 1]) g.add(B(.03, .034, cd, gold, s * (cw / 2 - .0), cyc - .02, dep / 2 + cd / 2));
    for (const dx of [-cw / 2 + .1, cw / 2 - .1]) { const c = KIT.cyl(.024, .024, cyc - .05, steelL, 20); c.position.set(dx, (cyc - .05) / 2 + .02, dep / 2 + cd - .1); g.add(c); const pl = KIT.cyl(.05, .05, .02, frameM, 24); pl.position.set(dx, .03, dep / 2 + cd - .1); g.add(pl); }
    { const ap = stoneBox(w, [50, 51, 56], 'apron', cw + .5, .03, cd + .45, 0, .015, dep / 2 + cd / 2 - .05); g.add(ap); }
    /* the revolving door: a glass drum, four wings, a steel head and sill */
    const dr = .34, dh = hg - .08, dc = new T.Group(); dc.position.set(0, 0, zg);
    const drum = new T.Mesh(new T.CylinderGeometry(dr, dr, dh, 48, 1, true), new T.MeshStandardMaterial({ color: 0x6d7681, transparent: true, opacity: .3, roughness: .1, metalness: .4, envMapIntensity: 1.3, side: T.DoubleSide, depthWrite: false })); drum.position.y = .04 + dh / 2; dc.add(drum);
    for (let i = 0; i < 4; i++) { const wing = B(dr * 1.9, dh - .02, .012, drum.material, 0, .04 + dh / 2, 0); wing.rotation.y = i * Math.PI / 2 + Math.PI / 5; wing.castShadow = false; dc.add(wing); const e = B(.014, dh - .02, .014, frameM, 0, .04 + dh / 2, 0); e.position.set(Math.cos(i * Math.PI / 2 + Math.PI / 5) * dr * .95, e.position.y, -Math.sin(i * Math.PI / 2 + Math.PI / 5) * dr * .95); dc.add(e); }
    const head = KIT.cyl(dr + .025, dr + .025, .03, frameM, 48); head.position.y = .04 + dh; dc.add(head);
    const sill = KIT.cyl(dr + .02, dr + .02, .026, frameM, 48); sill.position.y = .035; dc.add(sill);
    const post = KIT.cyl(.012, .012, dh, frameM, 12); post.position.y = .04 + dh / 2; dc.add(post);
    g.add(dc);
    g.add(KIT.bbox(W + .02, .03, dep + .02, dk, 0, .015, 0, .005));
    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, W, dep + cd, { k: .6, pad: .2 }); cs.position.set(0, .003, cd / 2); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const ord = order(panes.length, 11);
    const P = (x, y, z) => () => { const p = new T.Vector3(x, y, z); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; };
    const hd = { group: root, w: W, h: H, d: dep, lobby, s: { rise: o.rise ?? 1, lit: o.lit ?? 0 },
      door: P(0, 0, dep / 2 + cd + .2), top: P(0, H + .4, 0),
      apply() { const s = hd.s; g.position.y = -(H + .2) * (1 - s.rise); root.visible = s.rise > .001; cs.set(Math.max(0, (s.rise - .85) / .15));
        const k = Math.round(s.lit * panes.length); ord.forEach((pi, j) => { panes[pi].material = j < k ? w.mat.room : panes[pi].userData.gm; }); } };
    return w.add(hd);
  } };

  /* ================================================================ APARTMENT ================================================================ */
  /* v2 final: the line language. A near-black facade; every edge, frame and slab drawn as cream hairline (outlines full, secondary
     60%, fine 30%); lit flats the warm flat pane; gold only on the roof coping. */
  const CREAM = '#ece6d6';
  const renderCell = (g, W, H, side) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    speckle(g, W, H, 900, 9, .03);
    g.fillStyle = CREAM; g.fillRect(0, H - 5, W, 5);                                   /* the floor slab edge: full cream */
    g.fillStyle = 'rgba(236,230,214,.3)'; g.fillRect(0, H - 9, W, 2);
    if (side) return;
    g.strokeStyle = 'rgba(236,230,214,.6)'; g.lineWidth = 2.5; g.strokeRect(W * .165, H * .14, W * .67, H * .72);     /* the reveal */
  };
  const aptPane = (w, v) => once('apane' + v, () => S3.canvasTex(w.renderer, 220, 300, (g, W, H) => {
    g.fillStyle = '#16181d'; g.fillRect(0, 0, W, H);
    const sx = W * (.05 + v * .22); g.fillStyle = 'rgba(255,255,255,.035)'; g.beginPath(); g.moveTo(sx, 0); g.lineTo(sx + W * .3, 0); g.lineTo(sx + W * .3 - H * .35, H); g.lineTo(sx - H * .35, H); g.closePath(); g.fill();
    g.strokeStyle = CREAM; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);          /* the one cream frame line */
  }));
  const plinthBase = (w) => base(w, 'plinthink', 256, 256, (g, W, H) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    for (let c = 0; c < 4; c++) { const y = c * 64; g.fillStyle = 'rgba(236,230,214,.6)'; g.fillRect(0, y, W, 2.5); const off = (c % 2) * 64; for (let x = off; x < W + 64; x += 128) { g.fillStyle = 'rgba(236,230,214,.3)'; g.fillRect(x, y, 1.8, 64); } }
    speckle(g, W, H, 500, 4, .03);
  });
  const inkMat = (map, o = {}) => new T.MeshStandardMaterial(Object.assign({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .16, color: 0xffffff, roughness: .8, metalness: 0, envMapIntensity: .25 }, o));

  KIT.apartment = { create(w, o = {}) {
    const B = KIT.box, bays = o.bays ?? 6, floors = o.floors ?? 7, bw = o.bay ?? 1.1, fh = o.floorH ?? .9, dep = o.dep ?? 3.2;
    const W = bays * bw, H = floors * fh + .3, g = new T.Group(), panes = [], signs = [];
    const dark = KIT.M({ color: S3.col(0x15161a), roughness: .8, metalness: 0, envMapIntensity: .25 });
    const concrete = o.slab || dark;
    const cream = KIT.M({ color: S3.col(0xece6d6), roughness: .55, metalness: 0, emissive: S3.col(0xece6d6), emissiveIntensity: .16, envMapIntensity: .3 });
    const goldM = w.mat.trim;
    const bodyM = o.body || inkMat(rep(base(w, 'rcell2', 352, 288, renderCell), bays, floors));
    const sideM = o.body || inkMat(rep(base(w, 'rside2', 352, 288, (g, W, H) => renderCell(g, W, H, true)), Math.max(1, Math.round(dep / bw)), floors));
    g.add(B(W, floors * fh, dep, [sideM, sideM, dark, dark, bodyM, sideM], 0, .3 + floors * fh / 2, 0));
    const pl = (a, b) => inkMat(rep(plinthBase(w), a / .6, b / .6));
    g.add(B(W + .02, .3, dep + .02, [pl(dep, .3), pl(dep, .3), dark, dark, pl(W, .3), pl(W, .3)], 0, .15, 0));
    g.add(B(W + .02, .012, .012, cream, 0, .3, dep / 2 + .01));
    const gm = [0, 1, 2].map(v => KIT.M({ map: aptPane(w, v), color: 0xffffff, roughness: .25, metalness: .2, envMapIntensity: .5 }));
    const ei = Math.floor(bays / 2), pw = bw * .62, ph = fh * .66, mul = [], lines = [], bars = [];
    const balGlass = new T.MeshStandardMaterial({ color: 0x1a1c20, transparent: true, opacity: .35, roughness: .1, metalness: .1, envMapIntensity: .6, depthWrite: false });
    const ln = (x, y, z, sx, sy, sz) => lines.push(at4(x, y, z, sx, sy, sz));
    for (let f = 0; f < floors; f++) for (let b = 0; b < bays; b++) {
      const x = -W / 2 + (b + .5) * bw, y = .3 + f * fh, zf = dep / 2;
      if (f === 0 && b === ei) {
        /* the entrance: a cream-framed glazed door under a canopy with a cream edge, two steps */
        const dw = pw * 1.05, dy = .5;
        const dp = B(dw, .76, .016, gm[b % 3], x, dy, zf + .03); dp.userData.gm = gm[b % 3]; g.add(dp); panes.push(dp);
        ln(x - dw / 2, dy, zf + .04, .014, .78, .014); ln(x + dw / 2, dy, zf + .04, .014, .78, .014); ln(x, dy + .38, zf + .04, dw, .014, .014); ln(x, dy - .38, zf + .04, dw, .014, .014); ln(x, dy, zf + .04, .014, .76, .014);
        mul.push(at4(x, dy + .2, zf + .04, dw, .01, .01));
        for (const s of [-1, 1]) g.add(B(.012, .22, .02, cream, x + s * .06, .5, zf + .06));
        g.add(KIT.bbox(bw * 1.1, .05, .55, dark, x, 1.03, zf + .27, .008)); ln(x, 1.055, zf + .545, bw * 1.1, .012, .012); ln(x - bw * .55, 1.055, zf + .27, .012, .012, .55); ln(x + bw * .55, 1.055, zf + .27, .012, .012, .55);
        g.add(KIT.bbox(bw * .95, .05, .34, dark, x, .02, zf + .17, .006), KIT.bbox(bw * .85, .05, .2, dark, x, .055, zf + .1, .006));
        ln(x, .045, zf + .34, bw * .95, .01, .01); ln(x, .08, zf + .2, bw * .85, .01, .01);
        continue;
      }
      const cy = y + fh * .5;
      const p = B(pw, ph, .016, gm[(f * 5 + b * 2) % 3], x, cy, zf + .024); p.userData.gm = gm[(f * 5 + b * 2) % 3]; g.add(p); panes.push(p);
      ln(x - pw / 2, cy, zf + .036, .012, ph + .012, .012); ln(x + pw / 2, cy, zf + .036, .012, ph + .012, .012); ln(x, cy + ph / 2, zf + .036, pw, .012, .012); ln(x, cy - ph / 2, zf + .036, pw, .012, .012);
      mul.push(at4(x, cy, zf + .036, .01, ph, .01), at4(x, cy + ph * .22, zf + .036, pw, .01, .01));
      if (f > 0) {
        /* the balcony: a dark slab with a cream edge, cream balustrade rails, glass (even flats) or bars (odd) */
        const bwid = bw * .92, bz = zf + .33;
        g.add(KIT.bbox(bwid, .06, .36, concrete, x, y + .03, zf + .18, .008));
        ln(x, y + .062, zf + .355, bwid, .012, .012); ln(x - bwid / 2, y + .062, zf + .18, .012, .012, .36); ln(x + bwid / 2, y + .062, zf + .18, .012, .012, .36);
        ln(x, y + .06 + .3, bz, bwid, .012, .012); ln(x, y + .068, bz, bwid, .01, .01);
        for (const dx of [-1, 1]) { ln(x + dx * (bwid / 2 - .01), y + .06 + .15, bz, .014, .3, .014); ln(x + dx * (bwid / 2 - .01), y + .06 + .3, zf + .165, .01, .012, .33); }
        if (b % 2 === 0) { const gp = plane(bwid - .04, .28, balGlass); gp.position.set(x, y + .06 + .15, bz); g.add(gp); for (const dx of [-1, 1]) { const sp = plane(.32, .28, balGlass); sp.rotation.y = Math.PI / 2; sp.position.set(x + dx * (bwid / 2 - .01), y + .06 + .15, zf + .17); g.add(sp); } }
        else for (let i = 0; i <= 14; i++) bars.push(at4(x - bwid / 2 + .04 + i * (bwid - .08) / 14, y + .06 + .15, bz, .007, .29, .007));
      }
    }
    g.add(inst(cream, lines)); g.add(inst(cream, mul)); g.add(inst(cream, bars));
    /* the roof: a dark parapet with a gold coping, a lift overrun and vents */
    g.add(KIT.bbox(W + .1, .12, dep + .1, concrete, 0, H + .06, 0, .01));
    const ct = .02;
    g.add(B(W + .1, ct, ct * 1.3, goldM, 0, H + .12 + ct / 2, dep / 2 + .05), B(W + .1, ct, ct * 1.3, goldM, 0, H + .12 + ct / 2, -dep / 2 - .05));
    for (const s of [-1, 1]) g.add(B(ct * 1.3, ct, dep + .1, goldM, s * (W / 2 + .05), H + .12 + ct / 2, 0));
    g.add(B(W * .16, .2, dep * .22, dark, W * .22, H + .22, -dep * .12)); g.add(B(W * .16 + .01, .012, .012, cream, W * .22, H + .325, -dep * .12 + dep * .11));
    for (let i = 0; i < 3; i++) { const v = KIT.cyl(.05, .05, .1, dark, 16); v.position.set(-W * .25 + i * .5, H + .17, -dep * .2); g.add(v); const cap = KIT.cyl(.065, .065, .014, cream, 16); cap.position.set(-W * .25 + i * .5, H + .23, -dep * .2); g.add(cap); }
    /* the lease boards: agent boards fixed over the balcony rail by two hooks */
    (o.signs || []).forEach(sg => {
      const x = -W / 2 + (sg.bay + .5) * bw, y = .3 + sg.floor * fh, sw = bw * .62, sh = fh * .36;
      const board = new T.Group();
      const face = sg.text ? new T.MeshStandardMaterial({ map: KIT.textTex(w, sg.text, { px: 120, ink: '#0a0a0f', bg: '#F2EEE4', family: 'Inter' }), roughness: .8 }) : new T.MeshStandardMaterial({ map: once('blanksign', () => S3.canvasTex(w.renderer, 400, 200, (g, W, H) => { g.fillStyle = '#ECE8DC'; g.fillRect(0, 0, W, H); g.fillStyle = '#3a3b40'; g.fillRect(0, 0, W, 34); g.fillStyle = '#8a877e'; g.fillRect(36, 70, W * .62, 22); g.fillRect(36, 110, W * .46, 16); g.fillRect(W - 120, 120, 84, 52); g.fillStyle = '#b8b4a8'; g.fillRect(36, 150, W * .3, 12); })), roughness: .8 });
      board.add(B(sw + .03, sh + .03, .016, w.mat.alu, 0, 0, -.004));
      const fp = plane(sw, sh, face); fp.position.z = .006; board.add(fp);
      board.add(B(sw, sh * .12, .004, w.mat.facade, 0, sh / 2 - sh * .06, .0085));
      for (const dx of [-1, 1]) board.add(B(.018, .02, .05, w.mat.alu, dx * sw * .3, sh / 2 + .012, -.018));
      board.position.set(x, y + .22, dep / 2 + .35); g.add(board); signs.push({ m: board, y: y + .22 });
    });
    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, W, dep + .4, { k: .55, pad: .2 }); cs.position.set(0, .003, .2); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const ord = order(panes.length, 7);
    const hd = { group: root, w: W, h: H + .12, d: dep, s: { rise: o.rise ?? 1, lit: o.lit ?? 0, signs: o.signsIn ?? 1 },
      top: () => { const p = new T.Vector3(0, H + .5, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { const s = hd.s; g.position.y = -(H + .2) * (1 - s.rise); root.visible = s.rise > .001; cs.set(Math.max(0, (s.rise - .85) / .15));
        const k = Math.round(s.lit * panes.length); ord.forEach((pi, j) => { panes[pi].material = j < k ? w.mat.room : panes[pi].userData.gm; });
        signs.forEach((sg, i) => { const u = Math.min(1, Math.max(0, s.signs * signs.length - i)); sg.m.visible = u > .001; sg.m.position.y = sg.y + (1 - u) * .4; }); } };
    return w.add(hd);
  } };

  /* ==================================================================== DESK ================================================================= */
  const stoneTop = (w) => base(w, 'desktop', 512, 512, (g, W, H) => {
    g.fillStyle = '#47484d'; g.fillRect(0, 0, W, H);
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { g.strokeStyle = r() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.lineWidth = .6 + r() * 1.4; g.beginPath(); let x = r() * W, y = r() * H; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .35) * 120; y += (r() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
    speckle(g, W, H, 2500, 4, .05);
  });
  KIT.desk = { create(w, o = {}) {
    const T3 = T, B = KIT.box, W = o.w ?? 4, H = o.h ?? 1.1, D = o.d ?? 1.2, g = new T3.Group();
    const panels = Math.max(2, Math.round(W / .7)), vb = veneerBase(w);
    const vm = (rx, ry = 1) => texMat(rep(vb, rx, ry), { roughness: .55, metalness: .04, envMapIntensity: .5 });
    const bh = H - .06 - .08, bd = D * .92;
    g.add(B(W, bh, bd, [vm(2), vm(2), w.mat.facade, w.mat.facade, vm(panels), vm(panels)], 0, .08 + bh / 2, 0));
    g.add(KIT.bbox(W - .12, .08, bd - .1, w.mat.facadeGrey, 0, .08, 0, .008));
    g.add(B(W - .14, .06, .012, w.mat.alu, 0, .04, bd / 2 - .04));
    const stone = KIT.M({ color: S3.col(0x45464b), roughness: .5, metalness: .05, envMapIntensity: .6 });
    g.add(KIT.bbox(W + .12, .06, D, stone, 0, H - .03, 0, .014));
    const tp = plane(W + .09, D - .03, texMat(rep(stoneTop(w), (W + .09) / 1.2, (D - .03) / 1.2), { roughness: .42, metalness: .05, envMapIntensity: .7 })); tp.rotation.x = -Math.PI / 2; tp.position.y = H + .0008; g.add(tp);
    g.add(KIT.bbox(W + .02, .06, .2, stone, 0, H + .03, D / 2 - .1, .012));
    g.add(B(W + .02, .01, .01, w.mat.trim, 0, H + .055, D / 2 - .004));
    g.add(B(W + .125, .012, .01, w.mat.trim, 0, H - .045, D / 2 + .002));
    for (const s of [-1, 1]) g.add(B(.01, .012, D + .002, w.mat.trim, s * (W / 2 + .062), H - .045, 0));
    const root = new T3.Group(); root.add(g);
    const cs = KIT.contact(w, W + .2, D + .1, { k: .55, pad: .25 }); cs.position.set(0, .003, 0); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, w: W, h: H, d: D, s: { rise: o.rise ?? 1 },
      topAt: (u = .5, v = .5) => { const p = new T3.Vector3(-W / 2 + u * W, H, -D / 2 + v * D); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { g.position.y = -(H + .1) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; cs.set(Math.max(0, (hd.s.rise - .85) / .15)); } };
    return w.add(hd);
  } };

  /* ================================================================ SUITCASE ================================================================= */
  const ribTex = (w, back) => once('ribs' + back, () => S3.canvasTex(w.renderer, 512, 768, (g, W, H) => {
    g.fillStyle = '#4d4e55'; g.fillRect(0, 0, W, H);
    const n = 7, rw = (W - 56) / n;
    for (let i = 0; i < n; i++) {
      const x = 28 + i * rw, gr = g.createLinearGradient(x, 0, x + rw, 0);
      gr.addColorStop(0, '#34353a'); gr.addColorStop(.28, '#5a5b63'); gr.addColorStop(.5, '#63646c'); gr.addColorStop(.78, '#484950'); gr.addColorStop(1, '#2f3035');
      g.fillStyle = gr; g.fillRect(x + 2, 26, rw - 4, H - 52);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x + rw * .42, 26, 1.5, H - 52);
    }
    g.strokeStyle = '#2d2e33'; g.lineWidth = 6; g.strokeRect(12, 12, W - 24, H - 24); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.strokeRect(17, 17, W - 34, H - 34);
    if (back) { for (const cx of [W * .5 - W * .333, W * .5 + W * .333]) { g.fillStyle = '#34353a'; g.fillRect(cx - 16, 0, 32, H * .6); g.fillStyle = '#7b7c83'; g.fillRect(cx - 16, 0, 2, H * .6); g.fillRect(cx + 14, 0, 2, H * .6); } }
    speckle(g, W, H, 1800, 6, .04);
  }));
  KIT.suitcase = { create(w, o = {}) {
    const B = KIT.box, k = o.size || 1, W = .55 * k, H = .78 * k, D = .3 * k, g = new T.Group(), top = (.07 + .78) * k;
    const shellM = KIT.M({ color: S3.col(0x4a4b52), roughness: .38, metalness: .14, envMapIntensity: .9 });
    const rubber = KIT.M({ color: S3.col(0x3b3c42), roughness: .72, metalness: .05, envMapIntensity: .4 });
    const steel = KIT.M({ color: S3.col(0x8a8b92), roughness: .35, metalness: .7, envMapIntensity: .9 });
    const seam = KIT.M({ color: S3.col(0x25262a), roughness: .6, metalness: .1 });
    const shell = S3.block(W, H, D, shellM, .04 * k); shell.position.y = .07 * k; g.add(shell);
    /* the ribbed panels, front and back, inset in the shell */
    const pw = W - .16 * k, ph = H - .22 * k;
    for (const s of [1, -1]) {
      const pm = new T.MeshStandardMaterial({ map: ribTex(w, s < 0), roughness: .4, metalness: .12, envMapIntensity: .8, polygonOffset: true, polygonOffsetFactor: -1 });
      const p = plane(pw, ph, pm); p.position.set(0, .07 * k + H * .5, s * (D / 2 + .0015)); if (s < 0) p.rotation.y = Math.PI; g.add(p);
    }
    /* the zip seam round the sides and top, with its pull */
    g.add(B(.01 * k, H - .12 * k, .018 * k, seam, -W / 2 - .001 * k, .07 * k + H / 2, 0), B(.01 * k, H - .12 * k, .018 * k, seam, W / 2 + .001 * k, .07 * k + H / 2, 0), B(W - .1 * k, .01 * k, .018 * k, seam, 0, top + .001 * k, 0));
    g.add(B(.034 * k, .005 * k, .06 * k, steel, W / 2 - .09 * k, top + .007 * k, .02 * k));
    /* corner guards (top and bottom) and spinner wheel housings */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * (W / 2 - .04 * k), cz = sz * (D / 2 - .04 * k);
      g.add(KIT.bbox(.085 * k, .085 * k, .085 * k, rubber, cx, top - .03 * k, cz, .018 * k), KIT.bbox(.085 * k, .085 * k, .085 * k, rubber, cx, .07 * k + .04 * k, cz, .018 * k));
      g.add(B(.075 * k, .02 * k, .075 * k, steel, cx, .068 * k, cz));
      for (const d of [-1, 1]) { const wh = KIT.cyl(.034 * k, .034 * k, .016 * k, rubber, 24); wh.rotation.z = Math.PI / 2; wh.position.set(cx + d * .02 * k, .034 * k, cz); g.add(wh); const hub = KIT.cyl(.014 * k, .014 * k, .018 * k, steel, 12); hub.rotation.z = Math.PI / 2; hub.position.set(cx + d * .02 * k, .034 * k, cz); g.add(hub); g.add(B(.004 * k, .05 * k, .05 * k, steel, cx + d * .033 * k, .052 * k, cz)); }
    }
    /* the telescoping handle: sleeves, step collars, a grip bar with end caps */
    const hz = -D / 2 + .05 * k, o1 = top, o2 = top + .23 * k;
    for (const dx of [-.13 * k, .13 * k]) {
      const c1 = KIT.cyl(.0155 * k, .0155 * k, .23 * k, steel, 16); c1.position.set(dx, o1 + .115 * k, hz); g.add(c1);
      const col = KIT.cyl(.02 * k, .02 * k, .012 * k, rubber, 16); col.position.set(dx, o2, hz); g.add(col);
      const c2 = KIT.cyl(.0115 * k, .0115 * k, .32 * k, steel, 16); c2.position.set(dx, o2 + .16 * k, hz); g.add(c2);
    }
    const bar = KIT.cyl(.016 * k, .016 * k, .3 * k, steel, 16); bar.rotation.z = Math.PI / 2; bar.position.set(0, (.07 + .78 + .55) * k, hz); g.add(bar);
    const grip = KIT.cyl(.021 * k, .021 * k, .14 * k, rubber, 16); grip.rotation.z = Math.PI / 2; grip.position.set(0, (.07 + .78 + .55) * k, hz); g.add(grip);
    for (const dx of [-1, 1]) g.add(KIT.bbox(.04 * k, .04 * k, .05 * k, rubber, dx * .15 * k, (.07 + .78 + .55) * k + .008 * k, hz, .01 * k));
    /* a carry handle on top */
    g.add(KIT.bbox(.14 * k, .022 * k, .045 * k, rubber, 0, top + .03 * k, .02 * k, .008 * k));
    for (const dx of [-1, 1]) g.add(B(.02 * k, .02 * k, .045 * k, rubber, dx * .06 * k, top + .008 * k, .02 * k));
    if (o.mark) { const a = o.mark.image.width / o.mark.image.height, mw = W * .55; const d = KIT.decal(o.mark, mw, mw / a); d.position.set(0, .07 * k + H * .55, D / 2 + .004); g.add(d); }
    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, W * 1.05, D * 1.4, { k: .55, pad: .25 }); cs.position.set(0, .003, 0); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, h: (.07 + .78 + .58) * k, s: { rise: o.rise ?? 1, roll: 0 },
      apply() { g.position.y = -(H + .2) * (1 - hd.s.rise); g.position.z = hd.s.roll; cs.position.z = hd.s.roll; root.visible = hd.s.rise > .001; cs.set(Math.max(0, (hd.s.rise - .85) / .15)); } };
    return w.add(hd);
  } };
})();
