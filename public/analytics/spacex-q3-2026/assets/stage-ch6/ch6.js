/* ============================================================
   BOARDROOM WIRE · SPACEX Q3 · CH 6–7 STAGE ADDITIONS (Ive, 28 Oct 2026). Built in the kit's style (assets/stage/KIT.md);
   the kit itself is not edited. What the kit lacked for "How He Pays for It" and "Not Just a Rocket Company":

   C6.at(defs)                 step times [['name', secs], …]; ?at=a,b,c re-times them in order (Davinci, from the real take)
   C6.light(w, o)              the Wang room: a darker fill and a pool of light on the floor under each hero object
                               (a narrow spot from above, soft edge, casting shadow). o.key/hemi/fill scale the kit's lights.
   C6.spot(w, at, o)           one pool: {r: radius on the floor, i: intensity, h: height, x/z lean}; s.on 0..1 fades it
   C6.vault.create(w, o)       SpaceX's vault: a stone plinth, a gold-line strongroom on it, the cash stacked inside
                               (KIT.cash.tower; o.per, o.cols, o.rows, o.size as the page's one scale). s.rise, s.fill; top()
   C6.plan.create(w, o)        money that is a plan (Q4 guidance): the outline of the cash stack it would be at the top of
                               its range, hatched, a gold ring where the range starts (o.lo, o.hi). s.grow 0..1; top()
   C6.wash(w, p, o)            a soft wash of light on the back wall behind a point. s.on
   C6.dateline.create(w, o)    a real date line inlaid in the floor: one tick a day, a long tick on the days that are named;
                               s.draw 0..1. x(day) is a day's world x.
   C6.strip(w, len, wid, o)    a dashed gold strip lying on the floor (the lease line); s.draw 0..1
   C6.mover(h)                 slides any kit handle's group: s.x, s.y, s.z, s.ry (absolute world position)
   C6.card(w, url, o)          KIT.receipt with a rise from the floor (s.rise) and a sink (s.out)
   Nothing glows: the pools are light on a matte floor (Wang's doors, 0:27), never haze.
   ============================================================ */
const C6 = (() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  function at(defs) {
    const given = (Q.get('at') || '').split(',').filter(x => x.trim() !== '').map(Number);
    const o = {}; defs.forEach(([k, d], i) => { o[k] = i < given.length && !isNaN(given[i]) ? given[i] : d; }); return o;
  }

  function light(w, o = {}) {
    w.scene.children.forEach(c => {
      if (c.isHemisphereLight) c.intensity *= o.hemi ?? .55;
      if (c.isDirectionalLight && c !== w.key) c.intensity *= o.fill ?? .6;
    });
    w.key.intensity *= o.key ?? .7;
    if (w.pool) w.pool.intensity *= o.pool ?? .5;
  }
  function spot(w, p, o = {}) {
    const h = o.h ?? 14, r = o.r ?? 3, ang = Math.atan(r / h) * 1.15;
    const L = new T.SpotLight(0xfff0d8, o.i ?? 900, 0, ang, o.pen ?? .55, 2);
    L.position.set(p[0] + (o.x ?? 0), h, p[2] + (o.z ?? 2)); L.target.position.set(p[0], 0, p[2]);
    L.castShadow = o.shadow !== false; L.shadow.mapSize.set(2048, 2048); L.shadow.bias = -.0004; L.shadow.radius = 4;
    L.shadow.camera.near = 1; L.shadow.camera.far = h * 3;
    w.scene.add(L, L.target);
    const I = L.intensity;
    const hd = { light: L, s: { on: o.on ?? 1 }, apply() { L.intensity = I * hd.s.on; L.visible = hd.s.on > .001; } };
    return w.add(hd);
  }

  /* a kit handle's group, slid in the world (its own apply still runs: rise, open…) */
  function mover(h, p0) {
    const g = h.group, s = { x: g.position.x, y: g.position.y, z: g.position.z, ry: g.rotation.y };
    const m = { s, apply() { g.position.set(s.x, s.y, s.z); g.rotation.y = s.ry; } };
    return m;
  }

  const vault = { create(w, o = {}) {
    const W = o.w ?? 3.6, D = o.d ?? 1.9, H = o.h ?? 4.2, pl = o.plinth ?? .22, at = o.at || [0, 0, 0];
    const root = new T.Group(), body = new T.Group();
    const plinth = S3.block(W + .5, pl, D + .5, w.mat.slab, .03); body.add(plinth);
    const cage = KIT.lineBox(W, H, D, .055, w.mat.goldLine); cage.position.y = pl; body.add(cage);
    /* a round door on the right face, open (swung back), gold rim and spokes: the mark of a vault */
    const door = new T.Group(), R = Math.min(H, D) * .36;
    const disc = KIT.cyl(R, R, .12, w.mat.graphite, 64); disc.rotation.x = Math.PI / 2; door.add(disc);
    const rim = new T.Mesh(new T.TorusGeometry(R, .045, 12, 64), w.mat.gold); rim.position.z = .07; rim.castShadow = true; door.add(rim);
    for (let i = 0; i < 3; i++) { const sp = KIT.box(R * 1.3, .05, .05, w.mat.gold, 0, 0, .1); sp.rotation.z = i * Math.PI / 3; door.add(sp); }
    const hub = KIT.cyl(.09, .09, .1, w.mat.gold, 24); hub.rotation.x = Math.PI / 2; hub.position.z = .1; door.add(hub);
    const hinge = new T.Group(); hinge.position.set(W / 2, pl + H * .42, D / 2); door.position.set(0, 0, -R - .02); door.rotation.y = Math.PI / 2;
    hinge.add(door); hinge.rotation.y = -1.25; body.add(hinge);
    root.add(body); root.position.set(...at); w.scene.add(root);
    const tower = KIT.cash.tower(w, { usd: o.usd, per: o.per ?? 10000, cols: o.cols ?? 1, rows: o.rows ?? 1, size: o.size ?? 3.0, at: [at[0], pl, at[2] + .05], fill: 0 });
    const hd = { group: root, tower, w: W, h: H + pl, s: { rise: o.rise ?? 1, fill: 0 },
      top: () => [root.position.x, root.position.y + pl + H, root.position.z],
      stackTop: () => tower.top(),
      apply() { body.position.y = -(H + pl + .2) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; tower.s.fill = hd.s.fill; tower.group.visible = hd.s.rise > .5; } };
    w.add(hd);
    return hd;
  } };

  /* a plan stack: the outline of a cash stack (cols × rows bundles a layer, `per` USD millions a bundle) at the top of the range,
     hatched faces, and a gold ring where the range starts (lo). o.lo/o.hi in USD millions; s.grow 0..1 */
  const plan = { create(w, o = {}) {
    const k = o.size ?? 1, L = 1.0 * k, Wd = L / 2.35, Hh = .13 * k, gap = .015 * k, cols = o.cols ?? 2, rows = o.rows ?? 2, per = o.per ?? 1000;
    const layer = Hh + gap * .3, X = cols * (L + gap) - gap, Z = rows * (Wd + gap) - gap;
    const H = Math.ceil(o.hi / per / (cols * rows)) * layer, Hlo = (o.lo / per / (cols * rows)) * layer, at = o.at || [0, 0, 0];
    const hatchTex = (Wp, Hp) => { const t = S3.canvasTex(w.renderer, 512, Math.max(64, Math.round(512 * Hp / Wp)), (c, Wc, Hc) => { c.clearRect(0, 0, Wc, Hc); c.strokeStyle = S3.css('--gold'); c.globalAlpha = .5; c.lineWidth = 6; for (let x = -Hc; x < Wc; x += 30) { c.beginPath(); c.moveTo(x, Hc); c.lineTo(x + Hc, 0); c.stroke(); } }); return t; };
    const g = new T.Group();
    const e = KIT.lineBox(X, H, Z, .03 * k, w.mat.goldLine); g.add(e);
    const face = (Wp, Hp, x, z, ry) => { const m = new T.Mesh(new T.PlaneGeometry(Wp, Hp), new T.MeshStandardMaterial({ map: hatchTex(Wp, Hp), transparent: true, depthWrite: false, roughness: .6, metalness: .3, side: T.DoubleSide })); m.position.set(x, Hp / 2, z); m.rotation.y = ry; g.add(m); return m; };
    face(X * .99, H * .995, 0, Z / 2 + .003, 0); face(Z * .99, H * .995, X / 2 + .003, 0, Math.PI / 2); face(Z * .99, H * .995, -X / 2 - .003, 0, -Math.PI / 2);
    const ring = KIT.lineBox(X + .06, .001, Z + .06, .035 * k, w.mat.gold); ring.position.y = Hlo; g.add(ring);
    const root = new T.Group(); root.add(g); root.position.set(...at); w.scene.add(root);
    const hd = { group: root, height: H, lo: Hlo, s: { grow: o.grow ?? 1 },
      top: () => [root.position.x, root.position.y + H * hd.s.grow, root.position.z],
      apply() { g.scale.y = Math.max(.001, hd.s.grow); root.visible = hd.s.grow > .001; } };
    return w.add(hd);
  } };

  /* a wash of light on the back wall behind a point (Wang 7:42: the tower in front of its own soft light) */
  function wash(w, p, o = {}) {
    const L = new T.SpotLight(0xfff0dc, o.i ?? 700, 0, o.ang ?? .32, .9, 2);
    L.position.set(p[0], o.y ?? 10, (o.z ?? -5)); L.target.position.set(p[0], p[1], p[2]); L.castShadow = false;
    w.scene.add(L, L.target); const I = L.intensity;
    const hd = { light: L, s: { on: o.on ?? 1 }, apply() { L.intensity = I * hd.s.on; L.visible = hd.s.on > .001; } };
    return w.add(hd);
  }

  const dateline = { create(w, o = {}) {
    const d0 = o.d0 ?? 6, d1 = o.d1 ?? 26, per = o.per ?? 1.2, x0 = o.x0 ?? 0, z = o.z ?? 0, named = new Set(o.named || []);
    const len = (d1 - d0) * per, g = new T.Group();
    const line = KIT.box(len + .02, .012, .05, w.mat.cream, x0 + len / 2, .006, z); line.castShadow = false; g.add(line);
    const ticks = [];
    for (let d = d0; d <= d1; d++) {
      const big = named.has(d), t = KIT.box(.035, .012, big ? .7 : .26, big ? w.mat.goldLine : w.mat.greyLine, x0 + (d - d0) * per, .007, z + (big ? .35 : .13));
      t.castShadow = false; g.add(t); ticks.push(t);
    }
    w.scene.add(g);
    const hd = { group: g, x: (d) => x0 + (d - d0) * per, z, s: { draw: o.draw ?? 1 },
      apply() { const u = hd.s.draw; line.scale.x = Math.max(.001, u); line.position.x = x0 + len * u / 2; ticks.forEach((t, i) => { t.visible = i / (ticks.length - 1) <= u + .001 && u > .001; }); line.visible = u > .001; } };
    return w.add(hd);
  } };

  function strip(w, len, wid, o = {}) {
    const PX = 120;
    const tex = S3.canvasTex(w.renderer, Math.round(len * PX), Math.max(8, Math.round(wid * PX)), (c, Wc, Hc) => { c.clearRect(0, 0, Wc, Hc); c.fillStyle = S3.css('--gold'); for (let x = 0; x < Wc; x += 60) c.fillRect(x, 0, 36, Hc); });
    const m = new T.Mesh(new T.PlaneGeometry(len, wid), new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: .5, metalness: .4, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
    const g = new T.Group(); g.add(m); g.position.set(...(o.at || [0, .01, 0])); g.rotation.y = o.yaw || 0; w.scene.add(g);
    const hd = { group: g, s: { draw: o.draw ?? 1 }, apply() { const u = hd.s.draw; m.scale.x = Math.max(.001, u); m.position.x = (u - 1) * len / 2; m.visible = u > .001; } };
    return w.add(hd);
  }

  async function card(w, url, o = {}) {
    const r = await KIT.receipt(w, url, o);
    const g = r.group, y0 = g.position.y, rx0 = g.rotation.x, base = r.apply;
    r.s.out = 0; r.s.lift = o.lift0 ?? 1;
    r.apply = () => { base(); const u = r.s.lift, v = r.s.out; g.position.y = y0 - (r.h * .9 + .3) * u - (r.h + .5) * v; g.visible = u < .999 && v < .999; };
    return r;
  }

  return { at, light, spot, wash, mover, vault, plan, dateline, strip, card };
})();
