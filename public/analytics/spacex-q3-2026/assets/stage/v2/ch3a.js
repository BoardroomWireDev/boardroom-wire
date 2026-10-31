/* KIT v2 · chapter 3a overrides (Ive, 28 Oct 2026, the polish pass). Load AFTER assets/stage-ch3a/ch3a.js:
     <script src="assets/stage-ch3a/ch3a.js?v=1"></script>
     <script src="assets/stage/v2/ch3a.js?v=1"></script>
   Same API as ch3a.js; only what the polish pass changes is replaced here (every other KIT.c3a member is v1's).
   - C3.rack: the GB300 NVL72 rack at its true size, 600 × 2236 × 1068 mm (k = 1 is a metre), built as the real cabinet:
       a frame of two gold-trim front posts and a gold-trim cap (the trims still tied to s.gold, as v1), side panels with fine seams,
       fasteners, a vent bank and flush pulls, a top panel with its vents, a base on four casters (wheel, fork, plate) and a skirt;
       the 48U front with v1's tray plan (4 power shelves, 10 compute trays, 9 NVLink switch trays, 8 compute trays, 4 power shelves, a
       slot of cable management between the groups) as raised faceplates drawn in fine line: vents, drive bays and handles on the
       compute trays, two rows of OSFP cages on the switch trays, six PSU modules on each power shelf, U-hole rails down both sides;
       the back with the NVLink cable spine, the looms running into it from every tray, bus bars and the power whips.
     No words. Nothing glows: the front carries no lights. A contact shadow sits under the rack.
     const r = KIT.c3a.rack(w, { at, k, yaw, gold, rise });  r.s.gold 0..1, r.s.rise 0..1, r.top(), r.back(), r.w / r.h / r.d  (as v1) */
(() => {
  if (typeof KIT === 'undefined' || !KIT.c3a) return;
  const T = THREE, C3 = KIT.c3a, cache = {};
  const once = (k, f) => cache[k] || (cache[k] = f());
  const RW = .6, RH = 2.236, RD = 1.068, U = RH / 48, FZ = RD / 2 + .004, INNER = RW * .9;
  const std = (o) => new T.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: .55, metalness: .3, envMapIntensity: .7 }, o));
  /* v1's tray plan, top to bottom: [kind, count]; one slot each, a gap slot between the groups */
  const PLAN = [['p', 4], ['g', 1], ['c', 10], ['g', 1], ['s', 9], ['g', 1], ['c', 8], ['g', 1], ['p', 4]];
  const slots = (() => { const s = []; let y = RH - U * 3.5; for (const [kind, n] of PLAN) for (let i = 0; i < n; i++) { s.push({ kind, yc: y - U / 2, h: U * .82 }); y -= U; } return s; })();

  /* merge boxes [w,h,d,x,y,z] into one geometry; planar UVs over the front (u across the rack's width, v up its height) when `planar` */
  function merge(list, planar) {
    const pos = [], nor = [], uv = [], idx = []; let o = 0;
    for (const [bw, bh, bd, x, y, z] of list) {
      const g = new T.BoxGeometry(bw, bh, bd), p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i) + x, py = p.getY(i) + y, pz = p.getZ(i) + z; pos.push(px, py, pz); nor.push(n.getX(i), n.getY(i), n.getZ(i));
        if (planar) { if (Math.abs(n.getZ(i)) > .5) uv.push((px + RW / 2) / RW, py / RH); else uv.push(.5, .9995); }
      }
      for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + o);
      o += p.count;
    }
    const r = new T.BufferGeometry(); r.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); r.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    if (planar) r.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); r.setIndex(idx); return r;
  }

  /* the line language: near-black body, every seam, face and vent a cream hairline painted into the texture (full for outlines,
     ~60% for secondary lines, ~30% for fill), the same texture as an emissive map so the line holds in shadow */
  const cr = (a) => `rgba(236,230,214,${a})`;
  const ink = (map, o = {}) => std(Object.assign({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .16, roughness: .8, metalness: .05, envMapIntensity: .25 }, o));
  /* ---- the front: 1024 × 3822 px, 1706 px a metre ---- */
  const frontTex = (w) => once('front', () => S3.canvasTex(w.renderer, 1024, 3822, (g, W, H) => {
    const X = (u) => u * W, Y = (y) => (RH - y) / RH * H, px = W / RW, pu = U * px;
    g.fillStyle = '#0d0e10'; g.fillRect(0, 0, W, H);
    for (const x0 of [0, W * .95]) {                                  /* the rails: a line along the inner edge and the U-holes */
      g.fillStyle = cr(.8); g.fillRect(x0 + (x0 ? 0 : W * .05 - 4), 0, 4, H);
      g.fillStyle = cr(.4); for (let k = 0; k < 48 * 3; k++) { const y = H - (k + .5) * pu / 3 - pu * .05; g.fillRect(x0 + W * .019, y - 8, W * .012, 16); }
    }
    const panel = (y0, y1) => {                                       /* the header above the first shelf, the kick plate below the last */
      g.strokeStyle = cr(.95); g.lineWidth = 5; g.strokeRect(X(.05) + 2, y0 + 2, W * .9 - 4, y1 - y0 - 4);
      g.strokeStyle = cr(.3); g.lineWidth = 2.5; for (let x = X(.12); x < X(.9); x += 24) { g.beginPath(); g.moveTo(x, y0 + (y1 - y0) * .3); g.lineTo(x, y0 + (y1 - y0) * .7); g.stroke(); }
    };
    panel(0, Y(RH - U * 3.5) - 4); panel(Y(5.5 * U - 2 * U * .18) + 2, H);
    for (const s of slots) {
      const y0 = Y(s.yc + s.h / 2), y1 = Y(s.yc - s.h / 2), h = y1 - y0, x0 = X(.05), ww = W * .9;
      if (s.kind === 'g') {                                           /* a slot of cable management: looms and tie-wraps */
        const yg = Y(s.yc + U / 2), hg = pu;
        for (let k = 0; k < 6; k++) { const yy = yg + hg * (.14 + k * .14); g.strokeStyle = cr(k % 2 ? .3 : .55); g.lineWidth = 3;
          g.beginPath(); g.moveTo(x0, yy); g.bezierCurveTo(W * .3, yy + 9 * (k % 3 - 1), W * .65, yy - 9 * (k % 3 - 1), x0 + ww, yy); g.stroke(); }
        g.fillStyle = cr(.8); for (const u of [.18, .42, .66, .86]) g.fillRect(X(u), yg + hg * .08, 6, hg * .8);
        continue;
      }
      g.fillStyle = '#111215'; g.fillRect(x0, y0, ww, h);
      g.strokeStyle = cr(.95); g.lineWidth = 5; g.strokeRect(x0 + 2.5, y0 + 2.5, ww - 5, h - 5);
      g.fillStyle = cr(.6); for (const [sx, sy] of [[x0 + 14, y0 + 14], [x0 + ww - 14, y0 + 14], [x0 + 14, y1 - 14], [x0 + ww - 14, y1 - 14]]) { g.beginPath(); g.arc(sx, sy, 3.4, 0, 7); g.fill(); }
      g.strokeStyle = cr(.9); g.lineWidth = 3.4;
      if (s.kind === 'c') {
        g.fillStyle = cr(.32); for (let yy = y0 + 22; yy < y1 - 22; yy += 11) for (let xx = x0 + 70; xx < x0 + ww * .5; xx += 14) g.fillRect(xx, yy, 7, 5);    /* the vent field */
        for (let i = 0; i < 4; i++) { const bx = x0 + ww * .56 + i * 74; g.strokeRect(bx + 2, y0 + 20, 58, h - 40); g.fillStyle = cr(.6); g.fillRect(bx + 22, y1 - 34, 18, 5); }
        for (const hx of [x0 + 22, x0 + ww - 40]) g.strokeRect(hx, y0 + 18, 16, h - 36);
      } else if (s.kind === 's') {
        for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) { const bx = x0 + 52 + i * 88, by = y0 + 16 + r * (h - 32) / 2; g.strokeStyle = cr(.9); g.strokeRect(bx + 2, by + 2, 70, (h - 32) / 2 - 10); g.strokeStyle = cr(.45); g.lineWidth = 2.4; g.strokeRect(bx + 14, by + 10, 46, 8); g.lineWidth = 3.4; }
        g.strokeStyle = cr(.9); for (const hx of [x0 + 20, x0 + ww - 34]) g.strokeRect(hx, y0 + 20, 14, h - 40);
      } else {
        for (let i = 0; i < 6; i++) {
          const bx = x0 + 10 + i * (ww - 20) / 6, bw = (ww - 20) / 6 - 8; g.strokeStyle = cr(.8); g.strokeRect(bx, y0 + 10, bw, h - 20);
          g.fillStyle = cr(.3); for (let yy = y0 + 20; yy < y1 - 32; yy += 10) for (let xx = bx + 14; xx < bx + bw - 14; xx += 11) g.fillRect(xx, yy, 5, 4);
          g.fillStyle = cr(.9); g.fillRect(bx + bw * .3, y1 - 26, bw * .4, 6);
        }
      }
    }
  }));
  /* ---- the back: 768 × 2870 px ---- */
  const rearTex = (w) => once('rear', () => S3.canvasTex(w.renderer, 768, 2870, (g, W, H) => {
    const Y = (y) => (RH - y) / RH * H;
    g.fillStyle = '#0d0e10'; g.fillRect(0, 0, W, H);
    for (const x0 of [0, W * .95]) { g.fillStyle = cr(.8); g.fillRect(x0 + (x0 ? 0 : W * .05 - 4), 0, 4, H); g.fillStyle = cr(.4); for (let y = 14; y < H; y += 26) g.fillRect(x0 + W * .019, y, W * .012, 12); }
    for (const x0 of [W * .1, W * .84]) {                                          /* the bus bars */
      g.strokeStyle = cr(.9); g.lineWidth = 4; g.strokeRect(x0, Y(RH - .1), W * .06, H * .86);
      g.fillStyle = cr(.6); for (let y = Y(RH - .12); y < H * .9; y += 60) { g.beginPath(); g.arc(x0 + W * .03, y, 5, 0, 7); g.fill(); }
    }
    for (const s of slots) {                                                         /* the looms, from each tray into the spine */
      if (s.kind === 'g') continue; const y = Y(s.yc);
      for (let k = 0; k < 3; k++) for (const sd of [-1, 1]) {
        g.strokeStyle = cr(k === 1 ? .55 : .3); g.lineWidth = 3; g.beginPath();
        g.moveTo(sd < 0 ? W * .17 : W * .83, y + (k - 1) * 9); g.bezierCurveTo(sd < 0 ? W * .27 : W * .73, y + (k - 1) * 9, W * .3 + (sd > 0 ? W * .4 : 0), y + (k - 1) * 5, W * (sd < 0 ? .34 : .66), y + (k - 1) * 3); g.stroke();
      }
    }
    const sx0 = W * .34, sx1 = W * .66;                                              /* the NVLink spine: a cartridge of cables */
    for (let x = sx0; x < sx1; x += 6) { g.fillStyle = cr((x / 6) % 3 ? .26 : .5); g.fillRect(x, Y(RH - .18), 3, H * .77); }
    g.fillStyle = cr(.8); for (let y = Y(RH - .2); y < H * .92; y += 52) g.fillRect(sx0 - 6, y, sx1 - sx0 + 12, 4);                  /* the ties */
    g.strokeStyle = cr(.95); g.lineWidth = 5; g.strokeRect(sx0 - 5, Y(RH - .16), sx1 - sx0 + 10, H * .79);
    for (const x0 of [W * .22, W * .58]) { g.strokeStyle = cr(.95); g.lineWidth = 5; g.strokeRect(x0, 40, W * .2, 150);              /* the power whips */
      g.strokeStyle = cr(.5); g.lineWidth = 3; for (let k = 0; k < 4; k++) g.strokeRect(x0 + 14 + k * (W * .2 - 28) / 4, 56, (W * .2 - 28) / 4 - 8, 118); }
  }));
  /* ---- a side panel, symmetric front to back: 512 × 1100 ---- */
  const sideTex = (w) => once('side', () => S3.canvasTex(w.renderer, 512, 1100, (g, W, H) => {
    g.fillStyle = '#0f1013'; g.fillRect(0, 0, W, H);
    const line = (x0, y0, x1, y1, a, lw) => { g.strokeStyle = cr(a); g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    for (const y of [H * .05, H * .5, H * .95]) line(0, y, W, y, .6, 3);
    for (const x of [W * .07, W * .93]) line(x, 0, x, H, .6, 3);
    for (const y of [H * .1, H * .3, H * .5, H * .7, H * .9]) for (const x of [W * .1, W * .9]) { g.fillStyle = cr(.7); g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); }
    const vent = (x0, y0, x1, y1) => { g.strokeStyle = cr(.95); g.lineWidth = 4; g.strokeRect(x0, y0, x1 - x0, y1 - y0); for (let y = y0 + 8; y < y1 - 4; y += 9) line(x0 + 6, y, x1 - 6, y, .3, 2); };
    vent(W * .26, H * .14, W * .74, H * .34); vent(W * .26, H * .62, W * .74, H * .82);
    g.strokeStyle = cr(.95); g.lineWidth = 3.5; for (const x of [W * .17, W * .83]) g.strokeRect(x - 10, H * .46, 20, H * .08);      /* the flush pulls */
    g.strokeStyle = cr(.95); g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
  }));
  const topTex = (w) => once('top', () => S3.canvasTex(w.renderer, 256, 512, (g, W, H) => {
    g.fillStyle = '#0f1013'; g.fillRect(0, 0, W, H); g.strokeStyle = cr(.95); g.lineWidth = 5; g.strokeRect(4, 4, W - 8, H - 8);
    g.fillStyle = cr(.32); for (let y = 60; y < H * .55; y += 12) for (let x = 40; x < W - 40; x += 18) g.fillRect(x, y, 10, 4);
    g.strokeStyle = cr(.9); g.lineWidth = 3.5; g.strokeRect(W * .15, H * .7, W * .7, H * .16);
  }));

  C3.rack = (w, o = {}) => {
    const k = o.k ?? 1, g = new T.Group(), body = new T.Group(); g.add(body);
    const trim = w.mat.goldLine.clone(), gold = trim.color.clone(), grey = w.mat.greyLine.color.clone().multiplyScalar(.42);
    const B = KIT.box, dark = std({ color: 0x0f1013 });
    const fMat = ink(frontTex(w)), pMat = ink(sideTex(w)), tMat = ink(topTex(w));
    /* the carcass, the side panels, the top, the back */
    body.add(B(RW - .03, RH - .12, RD - .05, dark, 0, (RH + .07) / 2 - .02, 0));
    for (const sx of [-1, 1]) body.add(B(.014, RH - .075, RD - .02, [pMat, pMat, dark, dark, dark, dark], sx * (RW / 2 - .007), (RH + .075) / 2, 0));
    body.add(B(RW, .02, RD, [dark, dark, tMat, dark, dark, dark], 0, RH - .01, 0));
    const back = new T.Mesh(new T.PlaneGeometry(RW - .028, RH - .09), ink(rearTex(w))); back.rotation.y = Math.PI; back.position.set(0, .07 + (RH - .09) / 2, -RD / 2 - .002); back.receiveShadow = true; body.add(back);
    /* the front: a recessed backplane with the whole drawn face, then each tray's faceplate raised on it */
    const bp = new T.Mesh(merge([[RW, RH - .02, .004, 0, (RH + .02) / 2, FZ - .022]], true), fMat); bp.receiveShadow = true; body.add(bp);
    const bz = slots.filter(s => s.kind !== 'g').map(s => [INNER, s.h, .02, 0, s.yc, FZ]);
    const bez = new T.Mesh(merge(bz, true), fMat); bez.castShadow = bez.receiveShadow = true; body.add(bez);
    /* the gold trims: the front posts, the cap, and a strip on each compute tray (tied to s.gold) */
    const tr = [[.03, RH, .03, -RW / 2 + .015, RH / 2, FZ - .01], [.03, RH, .03, RW / 2 - .015, RH / 2, FZ - .01], [RW * 1.01, .03, .04, 0, RH - .015, FZ]];
    slots.filter(s => s.kind === 'c').forEach(s => tr.push([INNER * .96, s.h * .16, .012, 0, s.yc + s.h * .3, FZ + .012]));
    const tm = new T.Mesh(merge(tr), trim); tm.castShadow = tm.receiveShadow = true; body.add(tm);
    /* the base: a skirt and four casters (wheel, fork, plate) */
    body.add(B(RW - .04, .03, RD - .06, dark, 0, .085, 0));
    const wheelM = std({ color: 0x0d0e10 }), forkM = std({ color: 0x1c1d21, roughness: .6, metalness: .1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = sx * (RW / 2 - .07), cz = sz * (RD / 2 - .12);
      body.add(B(.07, .006, .07, forkM, cx, .068, cz));
      for (const q of [-1, 1]) body.add(B(.004, .05, .036, forkM, cx + q * .016, .043, cz));
      const wh = KIT.cyl(.03, .03, .022, wheelM, 24); wh.rotation.z = Math.PI / 2; wh.position.set(cx, .03, cz); body.add(wh);
      const hub = KIT.cyl(.009, .009, .03, forkM, 12); hub.rotation.z = Math.PI / 2; hub.position.set(cx, .03, cz); body.add(hub);
    }
    for (const sx of [-1, 1]) { const ft = KIT.cyl(.014, .016, .02, forkM, 14); ft.position.set(sx * (RW / 2 - .15), .06, RD / 2 - .24); body.add(ft); }   /* the levelling feet, front pair */
    g.scale.setScalar(k);
    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, RW * k, RD * k, { k: .5, pad: .12 }); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, w: RW * k, h: RH * k, d: RD * k, s: { gold: o.gold ?? 1, rise: o.rise ?? 1 },
      top: () => { const p = new T.Vector3(0, RH * k + .2 * k, 0); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      back: () => { const p = new T.Vector3(0, .12 * k, -RD * k / 2); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      apply() { trim.color.copy(grey).lerp(gold, hd.s.gold); g.position.y = -RH * k * 1.02 * (1 - hd.s.rise); root.visible = hd.s.rise > .001; cs.set(Math.max(0, (hd.s.rise - .85) / .15)); } };
    return w.add(hd);
  };
})();
