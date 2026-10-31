/* KIT v2 · chapter 6–7 overrides (Ive, 28 Oct 2026, the polish pass). Load AFTER assets/stage-ch6/ch6.js:
     <script src="assets/stage-ch6/ch6.js?v=1"></script>
     <script src="assets/stage/v2/ch6.js?v=1"></script>
   Same API as C6 in ch6.js; only what the polish pass changes is replaced here.
   - C6.spot: no pool with an edge. The same light, its cone widened and its penumbra full, so an object is lit from above by a
     soft overhead source and the floor falls off gently (Wang's stage), never a disc.
   - C6.wash: the wall light, wider and softer, so the back wall carries a gradient, never an oval.
   - C6.vault: see below (the polish pass rebuilds it; same API). */
(() => {
  if (typeof C6 === 'undefined') return;
  const T = THREE;
  C6.spot = function spot(w, p, o = {}) {
    const h = o.h ?? 14, r = (o.r ?? 3) * 2.1, ang = Math.min(1.2, Math.atan(r / h) * 1.15);
    const L = new T.SpotLight(0xfff0d8, (o.i ?? 900) * .72, 0, ang, 1, 2);
    L.position.set(p[0] + (o.x ?? 0) - h * .25, h, p[2] + (o.z ?? 2) + h * .2); L.target.position.set(p[0], 0, p[2]);
    L.castShadow = o.shadow !== false; L.shadow.mapSize.set(2048, 2048); L.shadow.bias = -.0004; L.shadow.radius = 10;
    L.shadow.camera.near = 1; L.shadow.camera.far = h * 3;
    w.scene.add(L, L.target);
    const I = L.intensity;
    const hd = { light: L, s: { on: o.on ?? 1 }, apply() { L.intensity = I * hd.s.on; L.visible = hd.s.on > .001; } };
    return w.add(hd);
  };
  C6.wash = function wash(w, p, o = {}) {
    const L = new T.SpotLight(0xfff0dc, (o.i ?? 700) * .6, 0, Math.min(1.1, (o.ang ?? .32) * 2.2), 1, 2);
    L.position.set(p[0], o.y ?? 10, (o.z ?? -5)); L.target.position.set(p[0], p[1], p[2]); L.castShadow = false;
    w.scene.add(L, L.target); const I = L.intensity;
    const hd = { light: L, s: { on: o.on ?? 1 }, apply() { L.intensity = I * hd.s.on; L.visible = hd.s.on > .001; } };
    return w.add(hd);
  };
  /* ---- C6.vault v2 (Ive, 28 Oct 2026, the polish pass) ----
     Same API as v1: C6.vault.create(w, { usd, per, cols, rows, size, at, w, d, h, plinth, rise }) -> { group, tower, w, h, s: { rise, fill }, top(), stackTop() }.
     A real strongroom read, to the v1 footprint (w 3.5 x d 1.7 x h 4.9, plinth .22): a two-course stone plinth with chamfered edges; a steel
     frame (four 140 mm posts, base and top rails, a gold coping, a header plate across the open front) closing the back and the left end with
     riveted 1.2 m steel plates 60 mm thick; the right end is a plate with a round opening and a stepped collar, and the round door stands open
     on its hinge: a thick plug door with a stepped rim, twelve gold locking bolts round its edge, an engraved dial face, a six-spoke handle
     wheel (gold ring and knobs), a hinge pin with knuckles and the arm. The front stays open so the cash is seen, as v1. The cash is
     KIT.cash.tower, unchanged: one bundle = per USD millions, the count is the figure. Nothing glows. */
  const vcache = {};
  const once = (k, f) => vcache[k] || (vcache[k] = f());
  const vr = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
  const planarUV = (geo, s) => {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / s, p.getZ(i) / s);
      else if (ax >= az) uv.setXY(i, p.getZ(i) / s, p.getY(i) / s);
      else uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
    }
    uv.needsUpdate = true; return geo;
  };
  const chamfer = (W, H, D, c, mat, s = 1.6) => {
    const sh = new T.Shape(), x = (W - 2 * c) / 2, z = (D - 2 * c) / 2;
    sh.moveTo(-x, -z); sh.lineTo(x, -z); sh.lineTo(x, z); sh.lineTo(-x, z); sh.lineTo(-x, -z);
    const g = new T.ExtrudeGeometry(sh, { depth: Math.max(.0001, H - 2 * c), bevelEnabled: true, bevelThickness: c, bevelSize: c, bevelSegments: 1, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, c, 0);
    const m = new T.Mesh(planarUV(g, s), mat); m.castShadow = m.receiveShadow = true; return m;
  };
  const stoneTex = (w) => once('stone', () => S3.canvasTex(w.renderer, 512, 512, (g, W, H) => {
    g.fillStyle = '#1a1a1d'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { const a = vr(i, 1) * .14; g.fillStyle = vr(i, 2) > .5 ? `rgba(0,0,0,${a})` : `rgba(236,230,214,${a * .35})`; g.fillRect(vr(i, 3) * W, vr(i, 4) * H, 1 + vr(i, 5) * 3, 1 + vr(i, 6) * 3); }
    g.strokeStyle = 'rgba(236,230,214,.12)'; g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); let x = vr(k, 8) * W, y = 0; g.moveTo(x, y); for (; y < H; y += 24) { x += (vr(y + k, 9) - .5) * 14; g.lineTo(x, y); } g.stroke(); }
  }));
  /* the plates: near-black, cream hairline. One 1.2 m panel: an outline, an inset, rivets. Lines are thick in the texture because the
     texture is minified about 4:1 on screen (a 1.2 m panel is about 200 px at 4K). */
  const CREAM = '#ece6d6';
  const plateTex = (w) => once('plate', () => S3.canvasTex(w.renderer, 1024, 1024, (g, W, H) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(236,230,214,.03)'; g.fillRect(vr(i, 13) * W, vr(i, 14) * H, 4 + vr(i, 15) * 60, 1.5); }
    g.strokeStyle = CREAM; g.globalAlpha = 1; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
    g.globalAlpha = .6; g.lineWidth = 8; g.strokeRect(78, 78, W - 156, H - 156);
    g.globalAlpha = .3; g.lineWidth = 4; g.beginPath(); g.moveTo(78, H / 2); g.lineTo(W - 78, H / 2); g.moveTo(W / 2, 78); g.lineTo(W / 2, H - 78); g.stroke();
    g.globalAlpha = 1; g.lineWidth = 6; const riv = (x, y) => { g.beginPath(); g.arc(x, y, 15, 0, 7); g.stroke(); g.fillStyle = 'rgba(236,230,214,.5)'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); };
    for (const t of [0, .25, .5, .75, 1]) for (const [x, y] of [[t * (W - 260) + 130, 42], [t * (W - 260) + 130, H - 42], [42, t * (H - 260) + 130], [W - 42, t * (H - 260) + 130]]) riv(x, y);
  }));
  const dialTex = (w) => once('dial', () => S3.canvasTex(w.renderer, 1024, 1024, (g, W, H) => {
    const c = W / 2; g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    g.strokeStyle = CREAM; g.lineWidth = 10; g.beginPath(); g.arc(c, c, 488, 0, 7); g.stroke();
    g.globalAlpha = .6; g.lineWidth = 6; g.beginPath(); g.arc(c, c, 470, 0, 7); g.stroke(); g.beginPath(); g.arc(c, c, 330, 0, 7); g.stroke();
    g.globalAlpha = .3; g.lineWidth = 3; for (const r of [120, 190, 250]) { g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); }
    g.globalAlpha = 1;
    for (let i = 0; i < 100; i++) { const a = i / 100 * 6.2832, big = i % 10 === 0; g.strokeStyle = CREAM; g.globalAlpha = big ? 1 : .6; g.lineWidth = big ? 9 : 4.5; const r0 = big ? 350 : 395; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 458, c + Math.sin(a) * 458); g.stroke(); }
    g.globalAlpha = .6; g.lineWidth = 5; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + .39; g.beginPath(); g.arc(c + Math.cos(a) * 295, c + Math.sin(a) * 295, 13, 0, 7); g.stroke(); }
  }));

  C6.vault = { create(w, o = {}) {
    const W = o.w ?? 3.6, D = o.d ?? 1.9, H = o.h ?? 4.2, pl = o.plinth ?? .22, at = o.at || [0, 0, 0];
    const root = new T.Group(), body = new T.Group(), B = KIT.box;
    const rep = (t, rx, ry) => { const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = T.RepeatWrapping; c.repeat.set(rx, ry); return c; };
    const plateMat = (rx, ry) => { const m = rep(plateTex(w), rx, ry); return new T.MeshStandardMaterial({ map: m, emissiveMap: m, emissive: 0xffffff, emissiveIntensity: .16, roughness: .8, metalness: .1, envMapIntensity: .3 }); };
    const steel = new T.MeshStandardMaterial({ color: S3.col(0x131417), roughness: .8, metalness: .1, envMapIntensity: .3 });
    const cream = new T.MeshStandardMaterial({ color: S3.col(0xece6d6), roughness: .6, emissive: S3.col(0xece6d6), emissiveIntensity: .16, envMapIntensity: .2 });
    const steelHi = new T.MeshStandardMaterial({ color: S3.col(0x17181b), roughness: .75, metalness: .1, envMapIntensity: .3 });
    const stone = new T.MeshStandardMaterial({ map: stoneTex(w), roughness: .85, metalness: 0, envMapIntensity: .25 });
    const gold = w.mat.trim;
    /* the plinth: two stone courses, chamfered */
    const c1 = chamfer(W + .5, pl * .55, D + .5, .03, stone), c2 = chamfer(W + .34, pl * .45, D + .34, .022, stone); c2.position.y = pl * .55; body.add(c1, c2);
    const ln = (len, x, y, z, ax, t = .012) => { const m = B(ax ? t : len, t, ax ? len : t, cream, x, y, z); m.castShadow = false; return m; };
    for (const [pw2, pd2, y] of [[W + .5, D + .5, pl * .55 + .002], [W + .34, D + .34, pl + .002]]) {
      const e = .03; body.add(ln(pw2 - 2 * e, 0, y, pd2 / 2 - e, 0), ln(pw2 - 2 * e, 0, y, -pd2 / 2 + e, 0), ln(pd2 - 2 * e, pw2 / 2 - e, y, 0, 1), ln(pd2 - 2 * e, -pw2 / 2 + e, y, 0, 1));
    }
    /* the frame */
    const cage = new T.Group(); cage.position.y = pl; body.add(cage);
    const pw = .14, tp = .06, yb = .14, yh = H - .26, xi = W - 2 * pw, zi = D - 2 * pw;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cage.add(KIT.bbox(pw, H, pw, steelHi, sx * (W / 2 - pw / 2), H / 2, sz * (D / 2 - pw / 2), .014));
    const rail = (len, x, y, z, ax) => cage.add(KIT.bbox(ax ? pw : len, .14, ax ? len : pw, steel, x, y, z, .012));
    rail(xi, 0, yb, D / 2 - pw / 2, 0); rail(xi, 0, yb, -D / 2 + pw / 2, 0); rail(zi, -W / 2 + pw / 2, yb, 0, 1); rail(zi, W / 2 - pw / 2, yb, 0, 1);
    rail(xi, 0, H, D / 2 - pw / 2, 0); rail(xi, 0, H, -D / 2 + pw / 2, 0); rail(zi, -W / 2 + pw / 2, H, 0, 1); rail(zi, W / 2 - pw / 2, H, 0, 1);
    /* cream hairlines: down the face of every post, along the face of every rail */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { cage.add(B(.012, H - .1, .006, cream, sx * (W / 2 - pw / 2), H / 2, sz * (D / 2) + (sz > 0 ? .004 : -.004))); cage.add(B(.006, H - .1, .012, cream, sx * (W / 2) + (sx > 0 ? .004 : -.004), H / 2, sz * (D / 2 - pw / 2))); }
    for (const y of [yb, H]) { cage.add(B(xi, .01, .006, cream, 0, y, D / 2 + .004)); cage.add(B(.006, .01, zi, cream, W / 2 + .004, y, 0)); }
    /* the gold coping along the top: the subject's line */
    for (const z of [-D / 2 + pw / 2, D / 2 - pw / 2]) cage.add(B(W, .026, pw * .5, gold, 0, H + .013, z));
    for (const x of [-W / 2 + pw / 2, W / 2 - pw / 2]) cage.add(B(pw * .5, .026, D - pw, gold, x, H + .013, 0));
    /* the roof beams (open: the cash stays in view from above) */
    for (const x of [-W / 4, W / 4]) cage.add(KIT.bbox(.1, .12, zi, steel, x, H - .01, 0, .01));
    /* the back wall and the left end: riveted plates; the header plate across the open front */
    cage.add(B(xi, yh - yb, tp, plateMat(xi / 1.2, (yh - yb) / 1.2), 0, (yh + yb) / 2, -D / 2 + pw - tp / 2 + .02));
    cage.add(B(tp, yh - yb, zi, plateMat(zi / 1.2, (yh - yb) / 1.2), -W / 2 + pw - tp / 2 + .02, (yh + yb) / 2, 0));
    cage.add(B(xi, .24, tp, plateMat(xi / 1.2, .2), 0, H - .13, D / 2 - pw / 2));
    /* the right end: a plate with the round opening, a stepped collar round it */
    const R = Math.min(H, D) * .36, zc = D / 2 - R - .02, yc = H * .42, xw = W / 2 - pw + .02;
    const sh = new T.Shape(); sh.moveTo(-zi / 2, yb + .07); sh.lineTo(zi / 2, yb + .07); sh.lineTo(zi / 2, yh); sh.lineTo(-zi / 2, yh); sh.lineTo(-zi / 2, yb + .07);
    const hole = new T.Path(); hole.absarc(-zc, yc, R * 1.03, 0, Math.PI * 2, true); sh.holes.push(hole);
    const pg = new T.ExtrudeGeometry(sh, { depth: tp, bevelEnabled: false, curveSegments: 48 });
    pg.rotateY(Math.PI / 2); pg.translate(xw - tp, 0, 0); planarUV(pg, 1.2);
    const rw = new T.Mesh(pg, plateMat(1, 1)); rw.castShadow = rw.receiveShadow = true; cage.add(rw);
    for (const [r0, r1, hh, m] of [[R * 1.03, R * 1.2, .07, steelHi], [R * 1.03, R * 1.1, .13, steel]]) {
      const sr = new T.Shape(); sr.absarc(0, 0, r1, 0, Math.PI * 2, false); const hr = new T.Path(); hr.absarc(0, 0, r0, 0, Math.PI * 2, true); sr.holes.push(hr);
      const rg = new T.ExtrudeGeometry(sr, { depth: hh, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1, curveSegments: 64 });
      rg.rotateY(Math.PI / 2); const rm = new T.Mesh(rg, m); rm.position.set(xw, yc, zc); rm.castShadow = rm.receiveShadow = true; cage.add(rm);
      const cr = new T.Mesh(new T.TorusGeometry(r1 - .004, .008, 6, 96), cream); cr.rotation.y = Math.PI / 2; cr.position.set(xw + hh + .012, yc, zc); cage.add(cr);
    }
    /* the door and its hinge: v1's transform chain, rebuilt. dd is built with its axis up (y), then laid over so the axis is z */
    const door = new T.Group(), dd = new T.Group();
    const doorSteel = new T.MeshStandardMaterial({ color: S3.col(0x15161a), roughness: .78, metalness: .1, envMapIntensity: .3 });
    const cyl = (rt, rb, h, y, m = doorSteel, seg = 64) => { const c = KIT.cyl(rt, rb, h, m, seg); c.position.y = y; dd.add(c); return c; };
    cyl(R * .88, R * .9, .07, -.125); cyl(R * .985, R, .14, -.02); cyl(R * .915, R * .93, .035, .0725); cyl(R * .765, R * .78, .03, .09);
    const hair = (r, y, t = .009) => { const m = new T.Mesh(new T.TorusGeometry(r, t, 6, 96), cream); m.rotation.x = Math.PI / 2; m.position.y = y; dd.add(m); return m; };
    hair(R * .99, .05); hair(R * .925, .091); hair(R * .77, .106); hair(R * .88, -.16, .007); hair(R * .985, -.09, .007);
    const face = new T.Mesh(new T.CircleGeometry(R * .76, 64), new T.MeshStandardMaterial({ map: dialTex(w), emissiveMap: dialTex(w), emissive: 0xffffff, emissiveIntensity: .16, roughness: .8, metalness: .1, envMapIntensity: .3, polygonOffset: true, polygonOffsetFactor: -2 }));
    face.rotation.x = -Math.PI / 2; face.position.y = .1055; face.receiveShadow = true; dd.add(face);
    for (let i = 0; i < 12; i++) {                                         /* the locking bolts, round the edge */
      const bg = new T.Group(); bg.rotation.y = i / 12 * Math.PI * 2;
      const blk = B(.09, .1, .1, steelHi, R + .005, -.03, 0), bolt = KIT.cyl(.032, .032, .15, gold, 20); bolt.rotation.z = Math.PI / 2; bolt.position.set(R + .06, -.03, 0);
      const tip = KIT.cyl(.026, .03, .02, gold, 20); tip.rotation.z = Math.PI / 2; tip.position.set(R + .14, -.03, 0);
      bg.add(blk, bolt, tip); dd.add(bg);
    }
    const hub = KIT.cyl(.13, .15, .08, steelHi, 40); hub.position.y = .14; dd.add(hub);
    const cap = KIT.cyl(.075, .075, .05, gold, 32); cap.position.y = .2; dd.add(cap);
    const wr = new T.Mesh(new T.TorusGeometry(R * .44, .024, 12, 72), gold); wr.rotation.x = Math.PI / 2; wr.position.y = .17; wr.castShadow = true; dd.add(wr);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, sp = B(R * .44, .036, .036, gold, Math.cos(a) * R * .22, .17, -Math.sin(a) * R * .22); sp.rotation.y = a; dd.add(sp);
      const kn = KIT.cyl(.04, .05, .11, gold, 20); kn.position.set(Math.cos(a) * R * .5, .17, -Math.sin(a) * R * .5); dd.add(kn);
    }
    dd.rotation.x = Math.PI / 2; door.add(dd);
    const hinge = new T.Group(); hinge.position.set(W / 2, pl + yc, D / 2); door.position.set(0, 0, -R - .02); door.rotation.y = Math.PI / 2;
    hinge.add(door);
    const pin = KIT.cyl(.04, .04, R * 1.9, steelHi, 20); hinge.add(pin);
    for (const s of [-1, 1]) { const k = KIT.cyl(.075, .075, .26, steel, 24); k.position.y = s * R * .55; hinge.add(k); hinge.add(B(.2, .14, .34, steel, 0, s * R * .55, -.18));
      for (const dy of [-.13, .13]) { const r = new T.Mesh(new T.TorusGeometry(.075, .006, 6, 32), cream); r.rotation.x = Math.PI / 2; r.position.y = s * R * .55 + dy; hinge.add(r); } }
    hinge.rotation.y = -1.25; body.add(hinge);
    const wallK = KIT.cyl(.075, .075, .2, steel, 24); wallK.position.set(W / 2, pl + yc + R * .2, D / 2); const wallK2 = wallK.clone(); wallK2.position.y = pl + yc - R * .2; body.add(wallK, wallK2);
    const cs = KIT.contact(w, W + .5, D + .5, { k: .6, pad: .2 });
    root.add(body, cs); root.position.set(...at); w.scene.add(root);
    const tower = KIT.cash.tower(w, { usd: o.usd, per: o.per ?? 10000, cols: o.cols ?? 1, rows: o.rows ?? 1, size: o.size ?? 3.0, at: [at[0], pl, at[2] + .05], fill: 0 });
    const hd = { group: root, tower, w: W, h: H + pl, s: { rise: o.rise ?? 1, fill: 0 },
      top: () => [root.position.x, root.position.y + pl + H, root.position.z],
      stackTop: () => tower.top(),
      apply() { body.position.y = -(H + pl + .2) * (1 - hd.s.rise); cs.set(Math.max(0, (hd.s.rise - .85) / .15)); root.visible = hd.s.rise > .001; tower.s.fill = hd.s.fill; tower.group.visible = hd.s.rise > .5; } };
    w.add(hd);
    return hd;
  } };
})();
