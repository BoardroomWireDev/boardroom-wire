/* ============================================================
   BOARDROOM WIRE · SPACEX Q3 · ch 3b additions to the stage kit (Ive, 28 Oct 2026). Read assets/stage/KIT.md first.
   Objects the kit lacks, built in the kit's style for chapter 3b only (KIT.md: "build it in your own chapter folder").
   Same shape as every kit module: create(w, opts) puts it on the stage and returns a handle {group, s, apply}; tween s.

   C3.at(defs)                  step times [['name', secs], ...]; ?at=a,b,c re-times them in order (from the real VO)
   C3.cam(tl, w, state, at, dur, ease)   move the camera (a KIT.elev state) on the timeline
   C3.orbit(tx, ty, tz, D, pitch, yaw, fov)   KIT.elev turned yaw degrees about its target: a three-quarter view, for depth
   C3.pool(w, {from, to, I, angle, pen, colour, shadow})   a pool of light on the floor (a spot from above; never a glow).
                                s.I is its intensity (tween it to bring a pool up on its word)
   C3.plaque(w, {text, at, w, h, d, px})   a stone block with the words cut into it (the apartment's carved price)
   C3.rack(w, {at, w, h, d, trays})        one rack of GPUs: a cabinet in gold line, trays behind it; s.paid 0..1 turns the trays
                                gold from the floor up (paid back), s.rise
   C3.ruler(w, {at, len, ticks})            a ruler on the floor, ticks every unit; s.draw 0..1 draws it, s.t 0..ticks walks a
                                gold cursor along it; point(i) world point at tick i
   C3.rail(w, {at, h, max, rungs:[v...]})   a price rail: a stone post with cream rungs at the given prices and a gold pointer;
                                s.v moves the pointer (in the rail's own units), s.op fades it in; rungAt(v) world point
   C3.outline(w, {at, w, h, d, floors, hatch})  an empty building in gold line, a floor line per `floors`; s.rise. hatch: true
                                (a goal) hatches its front and right faces from s.floor (0..1, the fill's top) to the roof; s.hop fades it
   ============================================================ */
const C3 = (() => {
  const T = THREE, Q = new URLSearchParams(location.search);
  const at = (defs) => {
    const g = (Q.get('at') || '').split(',').filter(x => x.trim() !== '').map(Number), o = {};
    defs.forEach(([k, d], i) => { o[k] = i < g.length && !isNaN(g[i]) ? g[i] : d; });
    return o;
  };
  /* a camera on a three-quarter angle: KIT.elev turned `yaw` degrees about the target (positive: from the right), for depth */
  const orbit = (tx, ty, tz, D, pitch, yaw, fov = 24) => { const a = pitch * Math.PI / 180, y = yaw * Math.PI / 180;
    return { px: tx + D * Math.cos(a) * Math.sin(y), py: ty + D * Math.sin(a), pz: tz + D * Math.cos(a) * Math.cos(y), tx, ty, tz, fov }; };
  const cam = (tl, w, c, t, dur = 1.6, ease = 'power2.inOut') => tl.to(w.cam, Object.assign({ duration: dur, ease }, c), t);

  function pool(w, o = {}) {
    const s = new T.SpotLight(o.colour || 0xffe8c8, o.I ?? 60, 0, o.angle ?? .38, o.pen ?? .85, 2);
    s.position.set(...(o.from || [0, 8, 0])); s.target.position.set(...(o.to || [0, 0, 0]));
    s.castShadow = !!o.shadow;
    if (o.shadow) { s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -.0004; s.shadow.normalBias = .02; s.shadow.radius = 3; }
    w.scene.add(s, s.target);
    const h = { light: s, s: { I: o.I ?? 60 }, apply() { s.intensity = h.s.I; s.visible = h.s.I > .001; } };
    return w.add(h);
  }

  function plaque(w, o = {}) {
    const W = o.w ?? 2.6, H = o.h ?? 1.0, D = o.d ?? .5, PX = 400;
    const tex = S3.canvasTex(w.renderer, Math.round(W * PX), Math.round(H * PX), (c, cw, ch) => {
      c.fillStyle = '#34322e'; c.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${i % 2 ? '255,250,240' : '0,0,0'},${.025 + (i % 7) * .004})`; c.fillRect((i * 97) % cw, (i * 61) % ch, 2 + (i % 3), 2 + (i % 2)); }
      const font = `600 ${o.px || 230}px Inter`; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(255,248,232,.16)'; c.fillText(o.text, cw / 2 + 3, ch / 2 + 5);        /* the lit lower lip of the cut */
      c.fillStyle = '#121110'; c.fillText(o.text, cw / 2, ch / 2);                               /* the cut itself, in shadow */
      c.strokeStyle = 'rgba(255,248,232,.08)'; c.lineWidth = 6; c.strokeRect(14, 14, cw - 28, ch - 28);
    });
    S3.mirror(w.words, [o.text]);
    const stone = KIT.M({ color: S3.col(0x3a3833), roughness: .92 });
    const face = new T.MeshStandardMaterial({ map: tex, roughness: .9, envMapIntensity: .2 });
    const m = new T.Mesh(new T.BoxGeometry(W, H, D), [stone, stone, stone, stone, face, stone]);
    m.castShadow = m.receiveShadow = true; m.position.y = H / 2;
    const root = new T.Group(); root.add(m); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const h = { group: root, w: W, h: H, s: { rise: o.rise ?? 1 },
      top: () => { const p = new T.Vector3(0, H + .1, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { m.position.y = H / 2 - (H + .05) * (1 - h.s.rise); root.visible = h.s.rise > .001; } };
    return w.add(h);
  }

  function rack(w, o = {}) {
    const B = KIT.box, W = o.w ?? 1.5, H = o.h ?? 4.2, D = o.d ?? 1.7, n = o.trays ?? 16, g = new T.Group();
    g.add(B(W, .16, D, w.mat.graphite, 0, .08, 0));                          /* plinth */
    g.add(B(W, H - .16, .05, w.mat.graphite, 0, H / 2 + .08, -D / 2 + .025));  /* back */
    for (const x of [-W / 2 + .03, W / 2 - .03]) g.add(B(.06, H - .16, D, w.mat.graphite, x, H / 2 + .08, 0));
    g.add(B(W, .08, D, w.mat.graphite, 0, H - .04, 0));
    g.add(KIT.lineBox(W + .02, H, D + .02, .035, w.mat.goldLine));
    const pitch = (H - .5) / n, trays = [];
    for (let i = 0; i < n; i++) {
      const y = .3 + i * pitch + pitch * .5;
      const t = B(W - .2, pitch * .7, D * .86, w.mat.slab, 0, y, .02); g.add(t); trays.push(t);
      g.add(B(W - .24, .018, .02, w.mat.greyLine, 0, y + pitch * .2, D * .45));   /* the tray's handle line */
    }
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const h = { group: root, w: W, h: H, d: D, n, s: { rise: o.rise ?? 1, paid: 0 },
      top: () => { const p = new T.Vector3(0, H + .2, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { g.position.y = -(H + .2) * (1 - h.s.rise); root.visible = h.s.rise > .001;
        const k = h.s.paid * n; trays.forEach((t, i) => { t.material = i < Math.floor(k + 1e-6) ? w.mat.gold : w.mat.slab; }); } };
    return w.add(h);
  }

  function ruler(w, o = {}) {
    const B = KIT.box, L = o.len ?? 8, n = o.ticks ?? 12, g = new T.Group(), line = KIT.M({ color: S3.tok('--cream', .7), roughness: .6 });
    const base = B(L, .012, .035, line, L / 2, .006, 0); g.add(base);
    const ticks = Array.from({ length: n + 1 }, (_, i) => { const t = B(.03, .012, i === n ? .5 : .28, line, i * L / n, .006, 0); g.add(t); return t; });
    const done = B(L, .016, .05, w.mat.gold, L / 2, .008, 0); g.add(done);
    const cur = B(.05, .7, .05, w.mat.gold, 0, .35, 0); g.add(cur);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); w.scene.add(root);
    const h = { group: root, len: L, n, s: { draw: o.draw ?? 1, t: 0 },
      point: (i, y = 0) => { const p = new T.Vector3(i * L / n, y, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() { const d = Math.max(.0001, h.s.draw); base.scale.x = d; base.position.x = L * d / 2; root.visible = h.s.draw > .001;
        ticks.forEach((t, i) => { t.visible = i / n <= d + 1e-4; });
        const f = Math.max(.0001, h.s.t / n); done.scale.x = f; done.position.x = L * f / 2; done.visible = cur.visible = h.s.t > .001; cur.position.x = L * f; } };
    return w.add(h);
  }

  function rail(w, o = {}) {
    const B = KIT.box, H = o.h ?? 5.6, max = o.max ?? 60, y = (v) => .3 + (H - .5) * v / max, g = new T.Group();
    g.add(B(.34, H, .34, w.mat.graphite, 0, H / 2, 0));
    g.add(KIT.lineBox(.36, H, .36, .02, w.mat.greyLine));
    const cream = KIT.M({ color: S3.tok('--cream', .85), roughness: .55 });
    (o.rungs || []).forEach(v => g.add(B(1.1, .04, .1, cream, -.4, y(v), .2)));
    if (o.band) {                                    /* the guessed range: a hatched gold plate between two prices (a guess is hatched) */
      const [a, b] = o.band, hh = y(b) - y(a);
      const tex = S3.canvasTex(w.renderer, 256, Math.round(256 * hh / .7), (c, cw, ch) => { c.strokeStyle = S3.css('--gold'); c.lineWidth = 5; c.globalAlpha = .75; for (let k = -ch; k < cw + ch; k += 34) { c.beginPath(); c.moveTo(k, ch); c.lineTo(k + ch, 0); c.stroke(); } });
      const m = new T.Mesh(new T.PlaneGeometry(.7, hh), new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: .5, metalness: .3 }));
      m.position.set(-.55, y(a) + hh / 2, .18); g.add(m);
    }
    const ptr = new T.Group();
    const wedge = new T.Mesh(new T.ConeGeometry(.22, .5, 3), w.mat.gold); wedge.rotation.z = Math.PI / 2; wedge.position.x = .5; wedge.castShadow = true;
    ptr.add(wedge, B(.5, .06, .42, w.mat.gold, .18, 0, 0)); ptr.position.z = .05; g.add(ptr);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); w.scene.add(root);
    const P = (x, yy) => { const p = new T.Vector3(x, yy, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; };
    const h = { group: root, h: H, s: { v: o.v ?? 0, op: o.op ?? 1, rise: o.rise ?? 1 },
      rungAt: (v, side = 'left') => P(side === 'left' ? -.95 : .4, y(v)), pointer: () => P(.8, y(h.s.v)),
      apply() { ptr.position.y = y(h.s.v); ptr.visible = h.s.op > .01; g.position.y = -(H + .2) * (1 - h.s.rise); root.visible = h.s.rise > .001; } };
    return w.add(h);
  }

  function outline(w, o = {}) {
    const B = KIT.box, W = o.w ?? 4, H = o.h ?? 9, D = o.d ?? 3, n = o.floors ?? 10, t = .05, g = new T.Group();
    g.add(KIT.lineBox(W, H, D, t, w.mat.goldLine));
    for (let i = 1; i < n; i++) {
      const yy = i * H / n;
      g.add(B(W, .022, .022, w.mat.goldDim, 0, yy, D / 2), B(.022, .022, D, w.mat.goldDim, W / 2, yy, 0), B(.022, .022, D, w.mat.goldDim, -W / 2, yy, 0));
    }
    /* o.hatch: a goal or plan is hatched (KIT.md, honest scale). Gold diagonals, flat and unlit (never a glow), on the front and the
       right face, from s.floor (0..1 of the height: the top of whatever fills it) up to the roof, so only the unmet part is hatched */
    const hatch = [];
    if (o.hatch) {
      const PX = 160, tex = S3.canvasTex(w.renderer, 256, 256, (c, cw, ch) => {
        c.clearRect(0, 0, cw, ch); c.strokeStyle = S3.css('--gold'); c.globalAlpha = .55; c.lineWidth = 7;
        for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * cw / 2 - 20, ch + 20); c.lineTo(k * cw / 2 + cw + 20, -20); c.stroke(); }
      });
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      const face = (fw, rotY, x, z) => {
        const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping;
        const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
        m.rotation.y = rotY; m.userData = { fw, x, z, t }; g.add(m); hatch.push(m);
      };
      face(W, 0, 0, D / 2 + .004); face(D, Math.PI / 2, W / 2 + .004, 0);
      hatch.PX = PX;
    }
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); w.scene.add(root);
    const P = (x, yy, z) => { const p = new T.Vector3(x, yy, z); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; };
    const h = { group: root, w: W, h: H, d: D, s: { rise: o.rise ?? 1, floor: 0, hop: o.hatch ? 1 : 0 }, at: P,
      apply() { const r = Math.max(.001, h.s.rise); g.scale.y = r; root.visible = h.s.rise > .001;
        const y0 = H * h.s.floor, hh = Math.max(.001, H - y0);
        hatch.forEach(m => { const u = m.userData; m.scale.set(u.fw, hh, 1); m.position.set(u.x, y0 + hh / 2, u.z);
          u.t.repeat.set(u.fw / 1.1, hh / 1.1); m.material.opacity = h.s.hop; m.visible = h.s.hop > .01 && hh > .01; }); } };
    return w.add(h);
  }

  return { at, cam, orbit, pool, plaque, rack, ruler, rail, outline };
})();
