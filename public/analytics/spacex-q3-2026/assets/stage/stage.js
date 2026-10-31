/* ============================================================
   BOARDROOM WIRE · SPACEX Q3 · THE STAGE KIT: the stage (Ive, 28 Oct 2026). Read KIT.md first.
   The world every chapter builds on, to the Alexandr Wang standard (EF 19): one lit floor of dark honed stone, a key, a fill
   and a rim, a camera on long-lens elevations, type pinned to world points, and the receipt card lying on the stage.
   Nothing emits, glows, floats or drifts (rule 12). Built on stage3d.js (copied unedited from alexandr-wang).

   const w = KIT.stage({ fov, exposure, fog:[near,far], key:[x,y,z], keyTarget:[x,y,z], shadow, wall: -18 | false, pool:[x,y,z], poolI });
   w.scene / w.camera / w.renderer / w.mat (the kit's materials) / w.labels / w.words
   w.cam            the camera's state {px,py,pz,tx,ty,tz,fov}; tween it on the timeline; KIT.elev() makes a level elevation
   w.label(cls, html, at, o)   a word pinned to a world point (at: [x,y,z] or a function returning one); returns {e, s:{op}}
                    o: {ax, ay, dx, dy} anchor and offset in px. Tween s.op for its fade. Words come from data.js or are names.
   w.add(handle)    register a kit object so w.render() applies its state every frame (every create() does this for you)
   w.render()       apply every object's state, place the camera, pin the labels, draw. Pure function of the state: ?t= holds.
   KIT.run(w, { steps:[[name, secs], ...], end, build(tl) })   the capture contract: BW.run({play, rest}); build(tl) adds the tweens;
                    rest() is the timeline's end state (so ?final = the last frame of the build).
   KIT.receipt(w, url, o)  a capture as a flat card lying on the stage (one receipt style, rule 18); handle.pen(u0,u1,v) adds a gold
                    pen line in the card's own coordinates (0..1 from top-left), its s.p from 0 to 1 draws it. o.stand (radians) props the card up
                    toward the camera (a card lying flat under a low camera is unreadable).
   ============================================================ */
const KIT = window.KIT || {};
window.KIT = KIT;
(() => {
  const T = THREE;
  const M = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: .7, metalness: 0, envMapIntensity: .5 }, o));
  /* palette colours come from brand.css tokens; the physical stock (paint, rubber, glass, card) is named here */
  const STOCK = { paint: 0xe8e5dc, rubber: 0x0e0e11, glass: 0x0d0e12, wood: 0x2a2620, room: 0xc7a86c };
  function mats() {
    return {
      gold:     M({ color: S3.tok('--gold'), metalness: .55, roughness: .36, envMapIntensity: 1.0 }),
      goldLine: M({ color: S3.tok('--gold'), metalness: .5, roughness: .42, envMapIntensity: .9 }),
      goldDim:  M({ color: S3.tok('--gold', .45), metalness: .4, roughness: .5, envMapIntensity: .6 }),
      red:      M({ color: S3.tok('--red'), roughness: .5, metalness: .1 }),
      graphite: M({ color: S3.col(S3.MAT.graphite), roughness: .62, metalness: .12, envMapIntensity: .55 }),
      slab:     M({ color: S3.col(S3.MAT.slab), roughness: .72, envMapIntensity: .45 }),
      card:     M({ color: S3.col(S3.MAT.card), roughness: .66, metalness: .05, envMapIntensity: .5 }),
      grey:     M({ color: S3.tok('--grey'), roughness: .64, metalness: .05, envMapIntensity: .5 }),
      greyLine: M({ color: S3.tok('--grey-bright'), roughness: .6, metalness: .1, envMapIntensity: .5 }),
      cream:    M({ color: S3.tok('--cream'), roughness: .5 }),
      paint:    M({ color: S3.col(STOCK.paint), roughness: .38, envMapIntensity: .7 }),
      rubber:   M({ color: S3.col(STOCK.rubber), roughness: .55, metalness: .2 }),
      glass:    M({ color: S3.col(STOCK.glass), roughness: .14, metalness: .6, envMapIntensity: 1.1 }),
      wood:     M({ color: S3.col(STOCK.wood), roughness: .85 }),
      /* a lit room: a warm pane, flat (a little self-light so it reads in shadow; never bloom) */
      room:     M({ color: S3.col(STOCK.room), roughness: .9, emissive: S3.col(STOCK.room), emissiveIntensity: .22, envMapIntensity: .2 })
    };
  }
  KIT.STOCK = STOCK; KIT.M = M;

  /* ---------- primitives (every object module uses these) ---------- */
  KIT.box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };
  KIT.cyl = (rt, rb, h, mat, seg = 40) => { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };
  /* square beams on the 12 edges of a w × h × d box, base at y = 0: the gold-line drawing, in the round */
  KIT.lineBox = (w, h, d, t, mat) => {
    const g = new T.Group(), B = KIT.box;
    for (const y of [t / 2, h - t / 2]) {
      g.add(B(w, t, t, mat, 0, y, -d / 2 + t / 2), B(w, t, t, mat, 0, y, d / 2 - t / 2), B(t, t, d, mat, -w / 2 + t / 2, y, 0), B(t, t, d, mat, w / 2 - t / 2, y, 0));
    }
    for (const x of [-w / 2 + t / 2, w / 2 - t / 2]) for (const z of [-d / 2 + t / 2, d / 2 - t / 2]) g.add(B(t, h, t, mat, x, h / 2, z));
    return g;
  };
  /* a mark (a logo PNG, any colour on transparent) tinted to one colour, as a texture */
  KIT.markTex = async (w, url, colour) => {
    const im = await S3.img(url), k = Math.max(1, 1600 / im.width);          /* an SVG is drawn at 1,600 px wide, never upscaled */
    return S3.canvasTex(w.renderer, Math.round(im.width * k), Math.round(im.height * k), (g, W, H) => { g.drawImage(im, 0, 0, W, H); g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, W, H); });
  };
  /* a texture on a thin plane that lies on a face (+z); size w × h */
  KIT.decal = (tex, w, h, o = {}) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false,
      roughness: o.rough ?? .5, metalness: o.metal ?? 0, envMapIntensity: .4, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.renderOrder = 2; return m;
  };
  /* text painted on a canvas texture; the words are mirrored for `bw words` */
  KIT.textTex = (w, text, o = {}) => {
    const px = o.px || 200, font = `${o.weight || 600} ${px}px ${o.family || '"IBM Plex Mono"'}`;
    const c = document.createElement('canvas').getContext('2d'); c.font = font;
    const tw = Math.ceil(c.measureText(text).width) + px * .2, th = Math.ceil(px * 1.2);
    S3.mirror(w.words, [text]);
    const t = S3.canvasTex(w.renderer, tw, th, (g, W, H) => { if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); } g.font = font; g.fillStyle = o.ink || S3.css('--cream'); g.textBaseline = 'middle'; g.fillText(text, px * .1, H / 2 + px * .04); });
    t.userData = { aspect: tw / th }; return t;
  };

  /* every page awaits this before it paints a texture: canvas text drawn before the webfonts land falls back to a serif */
  KIT.ready = () => Promise.all(['500 64px "IBM Plex Mono"', '600 64px "IBM Plex Mono"', '700 64px "IBM Plex Mono"', '500 32px Inter', '600 32px Inter', '700 32px Inter']
    .map(f => document.fonts.load(f))).then(() => document.fonts.ready);

  /* ---------- the stage ---------- */
  KIT.stage = (o = {}) => {
    const w = S3.init({ fov: o.fov || 24, exposure: o.exposure || 1.0 });
    const { scene, renderer } = w;
    scene.fog = new T.Fog(S3.lin(S3.css('--bg')), o.fog ? o.fog[0] : 60, o.fog ? o.fog[1] : 160);
    w.floor = S3.floor(scene, { rough: .9, env: .2, base: o.floorBase ?? 24, amp: o.floorAmp ?? .7, repeat: 60, size: 500 }, renderer);
    /* a matte floor: no roughness map (its mottled reflection of the studio read as haze), one even roughness */
    w.floor.material.roughnessMap = null; w.floor.material.roughness = .94; w.floor.material.color.setRGB(1.04, .98, .9); w.floor.material.needsUpdate = true;   /* warm stone, as Wang's */
    /* the back wall (Wang's stone room, 42-the-offer): the same stone stood up behind the set, so the frame reads as a lit
       space, never a void. o.wall: its z (default -18); false for no wall. A pool of light from above warms the set. */
    if (o.wall !== false) {
      const wz = o.wall ?? -18, wall = S3.floor(scene, { rough: .95, env: .15, base: o.wallBase ?? 44, amp: .7, repeat: 60, size: 500 }, renderer);
      wall.material.roughnessMap = null; wall.material.roughness = .96; wall.material.color.setRGB(1.04, .98, .9); wall.rotation.x = 0; wall.position.set(0, 0, wz); w.wall = wall;
    }
    const pool = new T.SpotLight(0xfff1dc, o.poolI ?? 260, 0, .55, .9, 2);
    pool.position.set(...(o.pool || [0, 30, 8])); pool.target.position.set(...(o.poolTarget || o.keyTarget || [0, 0, 0]));
    pool.castShadow = false; scene.add(pool, pool.target); w.pool = pool;
    scene.add(new T.HemisphereLight(0xfff6e6, 0x080808, o.hemi ?? .34));
    const key = new T.DirectionalLight(0xffeedd, o.keyI ?? 1.8);
    key.position.set(...(o.key || [-14, 22, 18])); key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 3; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    const s = o.shadow || 30;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 160 });
    key.target.position.set(...(o.keyTarget || [0, 0, 0])); scene.add(key, key.target);
    const fill = new T.DirectionalLight(0xfff3e6, o.fillI ?? .5); fill.position.set(0, 8, 40); scene.add(fill);
    const rim = new T.DirectionalLight(0xdfe3ea, o.rimI ?? .55); rim.position.set(22, 14, -26); scene.add(rim);
    w.key = key; w.mat = mats();
    w.cam = { px: 0, py: 5, pz: 40, tx: 0, ty: 2, tz: 0, fov: o.fov || 24 };
    const objs = [], pins = [];
    w.add = (h) => { objs.push(h); return h; };
    w.label = (cls, html, at, po = {}) => {
      const e = S3.label(w.labels, cls, ''); e.innerHTML = html;
      const L = { e, at, o: po, s: { op: po.op ?? 1 } }; pins.push(L); return L;
    };
    w.look = (c) => { Object.assign(w.cam, c); };
    w.render = () => {
      for (let i = objs.length - 1; i >= 0; i--) objs[i].apply && objs[i].apply();   /* last added first: a row sets its halls before they apply */
      const c = w.cam, cam = w.camera;
      if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
      cam.position.set(c.px, c.py, c.pz); cam.lookAt(c.tx, c.ty, c.tz); cam.updateMatrixWorld();
      pins.forEach(L => {
        const p = typeof L.at === 'function' ? L.at() : L.at;
        S3.pin(cam, L.e, p, Object.assign({}, L.o, { op: L.s.op }));
        L.e.style.visibility = L.s.op > .002 ? 'visible' : 'hidden';
      });
      renderer.render(scene, cam);
    };
    return w;
  };

  /* a level elevation (Wang pass 6, rule 3): looking straight down -z at the target from distance D, pitched down `pitch`°,
     on a long lens; verticals stay upright and rows level. Returns a camera state for w.cam or a tween. */
  KIT.elev = (tx, ty, tz, D, pitch, fov) => { const a = pitch * Math.PI / 180; return { px: tx, py: ty + D * Math.sin(a), pz: tz + D * Math.cos(a), tx, ty, tz, fov }; };

  /* a handle's tween on the timeline: KIT.to(tl, handle, {prop: value}, at, dur, ease) */
  KIT.to = (tl, h, props, at, dur = .8, ease = 'power3.out') => tl.to(h.s, Object.assign({ duration: dur, ease }, props), at);

  /* ---------- the capture contract ---------- */
  KIT.run = (w, o) => {
    const play = () => {
      BW.chromeShow();
      const tl = gsap.timeline({ onUpdate: w.render });
      (o.steps || []).forEach(([n, t]) => BW.mark(tl, n, t));
      if (o.build) o.build(tl);
      tl.to({}, { duration: .01 }, Math.max(0, (o.end || tl.duration()) - .01));
      w.render();
      return tl;
    };
    const rest = () => { BW.chromeShow(); const tl = play(); tl.progress(1); tl.pause(); w.render(); };
    BW.run({ play, rest });
  };

  /* ---------- a block: a share or an amount as a solid on the floor (a bar only when the bar is the sentence) ----------
     const b = KIT.bar.create(w, { w: 1.6, d: 1.6, h: BW.fig(k).v * scale, at: [x, 0, z], tone: 'gold' | 'grey' | 'red' | 'hatch' });
     b.s.grow 0..1 (it rises from the floor; its base never leaves the floor line), b.top() the world point over it.
     tone 'hatch': a projection, drawn as a dashed gold frame with no fill (a plan is never solid). */
  KIT.bar = { create(w, o = {}) {
    const W = o.w ?? 1.6, D = o.d ?? W, H = o.h ?? 1, tone = o.tone || 'grey', g = new T.Group();
    let solid = null, edge = null;
    if (tone !== 'hatch') { solid = S3.block(W, 1, D, tone === 'gold' ? w.mat.gold : tone === 'red' ? w.mat.red : w.mat.slab, .03); g.add(solid); }
    if (tone === 'grey' || tone === 'hatch') { edge = KIT.lineBox(W + .01, 1, D + .01, .022, tone === 'hatch' ? w.mat.goldLine : w.mat.greyLine); g.add(edge); }
    g.position.set(...(o.at || [0, 0, 0])); w.scene.add(g);
    const hd = { group: g, w: W, d: D, h: H, s: { grow: o.grow ?? 1 },
      top: () => [g.position.x, g.position.y + H * hd.s.grow, g.position.z],
      apply() { const y = Math.max(.001, H * hd.s.grow); g.scale.y = y; g.visible = hd.s.grow > .001; } };
    return w.add(hd);
  } };

  /* ---------- the receipt on the stage: one flat card lying on the floor, cropped to its column, the gold pen marking only
     what the capture prints (rule 18). url: a capture (or a crop of one); o.width in world units; o.at [x,y,z]; o.tilt (yaw) ---------- */
  KIT.receipt = async (w, url, o = {}) => {
    const tex = await S3.tex(w.renderer, url);
    const W = o.width || 6, H = W * tex.image.height / tex.image.width, pad = o.pad ?? .12;
    const g = new T.Group();
    const card = S3.sheet(tex, W, H, { curl: .004, lift: .006, cup: .002 });
    const base = S3.sheet(null, W + pad * 2, H + pad * 2, { curl: .004, lift: .004, cup: .002 });   /* the card's white margin */
    base.material = S3.mat.paper(null, {});
    g.add(base, card);
    card.position.y = .002;
    g.position.set(...(o.at || [0, 0, 0])); g.rotation.y = o.tilt || 0;
    if (o.stand) { g.rotation.x = o.stand; g.position.y += (H / 2 + pad) * Math.sin(o.stand) + .01; }   /* propped: its far edge lifts toward the camera */
    w.scene.add(g);
    const pens = [];
    const h = { group: g, card, s: { rise: 1 }, w: W, h: H,
      pen(u0, u1, v, po = {}) { const p = S3.pen(card, u0, u1, v, Object.assign({ width: H * .03, material: S3.mat.ink({ color: S3.tok('--gold', .8) }) }, po)); const ph = { m: p, s: { p: 0 } }; pens.push(ph); return ph; },
      apply() { g.visible = h.s.rise > .001; pens.forEach(p => p.m.set(p.s.p)); } };
    return w.add(h);
  };
})();
