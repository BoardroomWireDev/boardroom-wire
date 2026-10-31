/* ============================================================
   BOARDROOM WIRE · SPACEX Q3 · CHAPTER 4, THE WORLD (Ive, 28 Oct 2026). Built on the stage kit (assets/stage/KIT.md); never
   forks a kit module. The verdict chapter is one world across three pages (80, 81, 82), so each page opens on the last one's
   frame: three small cities of data halls, each with the cash tower its halls earn (hall × tag = tower, sf2-3).

   One scale, every page: a hall is one gigawatt; one bundle is $10B (KIT.cash per 10000), stacked two to a layer, so every case
   lands on whole layers ($100B 5, $120B 6, $300B 15, $500B 25, $1T 50) and the heights are true to each other.

   C4.at(defaults)               step times; ?at=a,b,c re-times them in order from the real take (Davinci)
   C4.city(w, 'low'|'mid'|'high', { plots, n, plot })   20 (or fewer) hall slots; s.n = halls standing (tweened, fractional
                                 = the next one rising), s.plot 0..1 the hatched empty plots, s.dim 0..1 sunk to grey line, s.gone
                                 0..1 the whole city sinks. Halls fill from the front-right (beside the tower) leftward, then back.
   C4.tower(w, k, usd, o)        a KIT.cash tower at the city's tower spot; s.fill as the kit; s.dim 0..1 to grey (an "other"),
                                 s.sink 0..1 down through the floor
   C4.ghost(w, { at, h, ... })   a forecast as an empty frame: gold line edges and a hatched face (a plan is never solid);
                                 s.grow 0..1, s.op 0..1; o.alpha / o.pitch set the hatch's strength and spacing (default .38 / 26)
   C4.pool(w, x, z, o)           a pool of light on the floor from straight above (Wang's doors); s.I 0..1 of its full intensity
   C4.flag(w, at, o)             a survey flag on a thin pole (a forecast someone planted); s.rise 0..1
   C4.slot(k, i), C4.towerAt(k), C4.cityCentre(k)   world points
   Nothing glows, floats or drifts (rule 12): light is pools from above, every move is a tween on the one timeline.
   ============================================================ */
const C4 = (() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

  function at(defs) {
    const given = (Q.get('at') || '').split(',').filter(x => x.trim() !== '').map(Number);
    const o = {}; defs.forEach(([k, d], i) => { o[k] = i < given.length && !isNaN(given[i]) ? given[i] : d; });
    return o;
  }

  const HALL = { len: 2.2, wid: 1.1, hgt: .8 }, GX = .26, GZ = .5, COLS = 4, PX = HALL.len + GX, PZ = HALL.wid + GZ;
  const CASH = { per: 10000, cols: 2, rows: 1, size: 1.2 };
  const X0 = { low: -24, mid: -8, high: 8 }, YAW = -.3;
  const CITY_W = COLS * PX - GX, TZ = -.8, TW = 2 * CASH.size + .02;
  const towerAt = (k) => [X0[k] + CITY_W + 1.3 + TW / 2, 0, TZ];
  const slot = (k, i) => { const r = Math.floor(i / COLS), c = COLS - 1 - (i % COLS); return [X0[k] + c * PX, 0, -r * PZ]; };
  /* where a flag marks "n gigawatts" in a city: the left end of its n-th hall (the next one would stand to its left), front edge */
  const flagAt = (k, n) => { const p = slot(k, n - 1); return [p[0] - GX / 2, 0, p[2] + HALL.wid / 2]; };
  const cityCentre = (k, rows = 5) => [X0[k] + CITY_W / 2, 0, -(rows - 1) * PZ / 2];

  function city(w, k, o = {}) {
    const plots = o.plots ?? 20, foot = new T.Group();
    const halls = Array.from({ length: plots }, (_, i) => KIT.hall.create(w, Object.assign({}, HALL, { door: false, at: slot(k, i), rise: 0, line: o.line || 'gold' })));
    for (let i = 0; i < plots; i++) {
      const f = KIT.hall.footprint(w, HALL.len, HALL.wid, S3.css('--cream'), { hatch: .2, edge: .55 });
      f.position.set(...slot(k, i)); foot.add(f);
    }
    w.scene.add(foot);
    const hd = { k, halls, plots, s: { n: o.n ?? 0, plot: o.plot ?? 0, dim: o.dim ?? 0, gone: 0 },
      front: (i) => { const p = slot(k, i); return [p[0] + HALL.len / 2, HALL.hgt, p[2] + HALL.wid / 2]; },
      apply() {
        const s = hd.s;
        halls.forEach((h, i) => { h.s.rise = clamp(s.n - i) * (1 - s.gone); h.s.dim = s.dim; });
        foot.visible = s.plot * (1 - s.gone) > .002;
        foot.children.forEach(c => { c.children[0].material.opacity = s.plot * (1 - s.gone); });
      } };
    return w.add(hd);
  }

  function tower(w, k, usd, o = {}) {
    const p = o.at || towerAt(k);
    const t = KIT.cash.tower(w, { usd, per: CASH.per, cols: o.cols ?? CASH.cols, rows: CASH.rows, size: CASH.size, at: p, fill: o.fill ?? 0, yaw: o.yaw ?? YAW });
    const g = t.group.children[0], mats = g.children[0].material;
    const strap = w.mat.gold.clone(); g.children.forEach(b => b.children.forEach(m => { m.material = strap; }));
    const faceC = mats[2].color.clone(), edgeC = mats[0].color.clone(), goldC = strap.color.clone(), grey = S3.tok('--grey');
    Object.assign(t.s, { dim: o.dim ?? 0, sink: 0 });
    const ap = t.apply;
    t.apply = () => {
      ap(); const d = t.s.dim;
      mats[2].color.copy(faceC).lerp(grey, d * .8); mats[0].color.copy(edgeC).lerp(grey, d * .8); strap.color.copy(goldC).lerp(grey, d);
      t.group.position.y = -t.s.sink * (t.height + .4);
    };
    t.k = k; t.x = p[0]; t.z = p[2];
    return t;
  }

  /* the forecast frame: four gold-line edges and a hatched front and side (as the kit's plan footprints) */
  function ghost(w, o = {}) {
    const W = o.w ?? TW, D = o.d ?? (CASH.size / 2.35 + .02), H = o.h ?? 1, g = new T.Group(), colour = o.colour || S3.css('--gold');
    const edge = KIT.lineBox(W, 1, D, .03, (o.line === 'grey' ? w.mat.greyLine : w.mat.goldLine).clone()); g.add(edge);
    const hatch = (pw, ph) => S3.canvasTex(w.renderer, Math.round(pw * 120), Math.round(ph * 120), (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch); c.strokeStyle = colour; c.globalAlpha = o.alpha ?? .38; c.lineWidth = 4;
      for (let x = -ch; x < cw; x += (o.pitch ?? 26)) { c.beginPath(); c.moveTo(x, ch); c.lineTo(x + ch, 0); c.stroke(); }
    });
    const faceM = new T.MeshStandardMaterial({ map: hatch(W, H), transparent: true, depthWrite: false, roughness: .6, metalness: .2, side: T.DoubleSide });
    const sideM = new T.MeshStandardMaterial({ map: hatch(D, H), transparent: true, depthWrite: false, roughness: .6, metalness: .2, side: T.DoubleSide });
    const front = new T.Mesh(new T.PlaneGeometry(W, 1), faceM); front.position.set(0, .5, D / 2);
    const side = new T.Mesh(new T.PlaneGeometry(D, 1), sideM); side.rotation.y = Math.PI / 2; side.position.set(W / 2, .5, 0);
    g.add(front, side); g.position.set(...(o.at || [0, 0, 0])); g.rotation.y = o.yaw ?? YAW; w.scene.add(g);
    const lineMats = []; edge.traverse(m => { if (m.material && !lineMats.includes(m.material)) lineMats.push(m.material); });
    lineMats.forEach(m => { m.transparent = true; });
    const hd = { group: g, w: W, d: D, h: H, s: { grow: o.grow ?? 0, op: o.op ?? 1 },
      top: () => [g.position.x, H * hd.s.grow, g.position.z],
      apply() { const y = Math.max(.001, H * hd.s.grow); g.scale.y = y; g.visible = hd.s.grow > .001 && hd.s.op > .002;
        faceM.opacity = sideM.opacity = hd.s.op; lineMats.forEach(m => { m.opacity = hd.s.op; }); } };
    return w.add(hd);
  }

  function pool(w, x, z, o = {}) {
    const full = o.I ?? 1400, L = new T.SpotLight(0xfff0dc, 0, 0, o.angle ?? .26, o.pen ?? .75, 2);
    L.position.set(...(o.from || [x, o.y ?? 20, z + (o.dz ?? 3)])); L.target.position.set(...(o.target || [x, 0, z])); L.castShadow = false;
    w.scene.add(L, L.target);
    const hd = { light: L, s: { I: o.on ?? 0 }, apply() { L.intensity = full * hd.s.I; } };
    return w.add(hd);
  }

  function flag(w, p, o = {}) {
    const h = o.h ?? 2.1, root = new T.Group(), body = new T.Group();
    const pole = KIT.cyl(.022, .022, h, w.mat.graphite, 16); pole.position.y = h / 2;
    const pw = o.pw ?? .62, ph = o.ph ?? .4, pen = KIT.box(pw, ph, .012, o.mat || w.mat.gold, pw / 2 + .02, h - ph / 2 - .04, 0);
    const cap = KIT.cyl(.04, .04, .04, w.mat.gold, 16); cap.position.y = h + .02;
    body.add(pole, pen, cap); root.add(body); root.position.set(...p); w.scene.add(root);
    const hd = { group: root, h, s: { rise: o.rise ?? 0 },
      top: () => [p[0], p[1] + h, p[2]],
      apply() { body.position.y = -(h + .1) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  }

  /* a wash on the back wall behind x (the wall at z = -18): a soft upright pool, so a dark object stands against light */
  const wash = (w, x, o = {}) => pool(w, x, -18, Object.assign({ from: [x, o.y ?? 3, o.z ?? 14], target: [x, o.ty ?? 6, -18], angle: o.angle ?? .2, pen: .9, I: o.I ?? 3000 }, o));

  /* camera: a tweenable elevation; tl.to(w.cam, C4.cam(...), at) */
  const cam = (tx, ty, tz, D, pitch, fov) => Object.assign(KIT.elev(tx, ty, tz, D, pitch, fov), { duration: 1, ease: 'power2.inOut' });
  const move = (tl, w, c, at0, dur = 1.6, ease = 'power2.inOut') => tl.to(w.cam, Object.assign({}, KIT.elev(...c), { duration: dur, ease }), at0);

  return { at, city, tower, ghost, pool, wash, flag, flagAt, slot, towerAt, cityCentre, cam, move, clamp, HALL, CASH, X0, YAW, CITY_W, PX, PZ, TW, COLS };
})();
