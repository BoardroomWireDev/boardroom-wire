/* ============================================================
   KIT v2 (Ive, 28 Oct 2026, the polish pass): the same stage and the same API as v1, relit and re-detailed to the polish bar
   (Wang's Muse Secure VM, Anthropic IPO's bell and rocket). What changed from v1:
   - light: one broad soft key (soft shadow edge), a fill, a rim; the overhead "pool" is a wide, even gradient, never a disc
   - KIT.contact(w, sx, sz, o)  a soft contact shadow under an object (every v2 object lays its own), so things sit on the floor
   - KIT.bbox(w, h, d, mat, x, y, z, bevel)  a box with a real bevel (centred, like KIT.box): edges catch the key like a bezel
   - KIT.tile(w, pxW, pxH, paint, repX, repY)  a repeating surface texture (cladding seams, louvres, grilles) drawn in fine line
   - w.mat adds: trim (gold edge, brushed), alu (cooler housings), steel (dark metal), paintMatte, facade, facadeGrey, carbon
   v2.1 (same API): the floor and back wall are one seamless sweep (no floor-meets-wall edge); every lit material is clamped at
   first render (metals roughness ≥ .5, others ≥ .3) so nothing burns to a near-white hotspot. KIT.md, "v2.1".
   v2.2 (29 Oct, same API): a neutral room (floor tint, pool, sky and fill neutral-cool; the key stays warm) and the pool's cone ends
   at the wall, so the light sits on the floor and the wall is an even gradient. KIT.md, "v2.2".
   ============================================================
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
      room:     M({ color: S3.col(STOCK.room), roughness: .9, emissive: S3.col(STOCK.room), emissiveIntensity: .22, envMapIntensity: .2 }),
      /* v2 stock */
      trim:       M({ color: S3.tok('--gold'), metalness: .75, roughness: .32, envMapIntensity: 1.1 }),
      alu:        M({ color: S3.col(0x3a3b40), metalness: .55, roughness: .42, envMapIntensity: .8 }),
      steel:      M({ color: S3.col(0x1c1d21), metalness: .5, roughness: .5, envMapIntensity: .7 }),
      paintMatte: M({ color: S3.col(0xe9e6de), roughness: .52, envMapIntensity: .55 }),
      facade:     M({ color: S3.col(0x34353b), roughness: .74, metalness: .08, envMapIntensity: .5 }),
      facadeGrey: M({ color: S3.col(0x4a4b51), roughness: .74, metalness: .08, envMapIntensity: .5 }),
      roofing:    M({ color: S3.col(0x4c4d52), roughness: .9, envMapIntensity: .3 }),
      carbon:     M({ color: S3.col(0x101113), roughness: .46, metalness: .2, envMapIntensity: .6 })
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
  /* v2: a box with a real bevel, centred on (x, y, z) like KIT.box; the bevel catches the key the way a bezel does */
  KIT.bbox = (w, h, d, mat, x = 0, y = 0, z = 0, bevel = .02) => { const m = S3.block(w, h, d, mat, bevel); m.position.set(x, y - h / 2, z); return m; };
  /* v2: a repeating surface texture painted in fine line; repX/repY tiles across the face */
  KIT.tile = (w, pw, ph, paint, rx = 1, ry = 1) => { const t = S3.canvasTex(w.renderer, pw, ph, paint); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); return t; };
  /* v2: a soft contact shadow, sx × sz on the floor (centred), the darkness where an object meets the ground.
     Returns the mesh; m.set(k) sets its strength 0..1 (tie it to rise). o.round for a disc (a rocket, a dish's foot). */
  const contactCache = {};
  KIT.contact = (w, sx, sz, o = {}) => {
    const key = o.round ? 'r' : 'q';
    if (!contactCache[key]) contactCache[key] = S3.canvasTex(w.renderer, 256, 256, (g, W, H) => {
      const im = g.createImageData(W, H), d = im.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = Math.abs(x / (W - 1) * 2 - 1), v = Math.abs(y / (H - 1) * 2 - 1);
        const r = o.round ? Math.hypot(u, v) : Math.pow(Math.pow(u, 6) + Math.pow(v, 6), 1 / 6);
        const a = Math.max(0, Math.min(1, (1 - r) / .42)); const i = (y * W + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = Math.round(255 * a * a * (3 - 2 * a));
      }
      g.putImageData(im, 0, 0);
    });
    const pad = o.pad ?? .35;
    const m = new T.Mesh(new T.PlaneGeometry(sx * (1 + pad), sz * (1 + pad)), new T.MeshBasicMaterial({ map: contactCache[key], transparent: true, depthWrite: false, opacity: o.k ?? .55, color: 0x000000 }));
    m.rotation.x = -Math.PI / 2; m.position.y = .003; m.renderOrder = 1; m.castShadow = false; m.receiveShadow = false;
    const k0 = o.k ?? .55; m.set = (k) => { m.material.opacity = k0 * Math.max(0, Math.min(1, k)); m.visible = k > .001; };
    return m;
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
    /* v2.2 (29 Oct): neutral stone (was 1.04, .98, .9, which read olive-black beside Wang's 24/25/26). The tint leans a touch
       cool so the floor reads neutral under the warm key (measured on 13 boards: B−R from about −3 to about 0): the gold is the
       only warm thing in the frame */
    w.floor.material.roughnessMap = null; w.floor.material.roughness = .94; w.floor.material.color.setRGB(.96, 1, 1.12); w.floor.material.needsUpdate = true;
    /* the back wall (Wang's stone room, 42-the-offer): the same stone stood up behind the set, so the frame reads as a lit
       space, never a void. o.wall: its z (default -18); false for no wall. A pool of light from above warms the set. */
    /* v2.1: a seamless sweep (a cyclorama). The floor stays flat to the wall's z (where every object stands), then curves up
       behind it (radius 6) into the back wall: one mesh, one stone texture, no edge and no seam at any camera angle (the old
       floor-meets-wall line read as the picture being cropped). Its tone ramps from the floor's to the wall's along the curve
       (vertex shade), so the look is the same as v2. 600 wide, 250 tall, 300 deep: no board camera reaches an edge. */
    if (o.wall !== false) {
      const wz = o.wall ?? -18, R = 6, X = 300, Zf = 300, Ht = 250, wallK = (o.wallBase ?? 44) / (o.floorBase ?? 24);
      const prof = [];                                                   /* [z, y] from the front to the top of the wall */
      for (let i = 0; i <= 12; i++) prof.push([Zf - (Zf - wz) * i / 12, 0]);
      for (let i = 1; i <= 32; i++) { const a = (i / 32) * Math.PI / 2; prof.push([wz - R * Math.sin(a), R - R * Math.cos(a)]); }
      for (let i = 1; i <= 10; i++) prof.push([wz - R, R + (Ht - R) * i / 10]);
      let sAcc = 0; const sArr = prof.map((p, i) => (i ? (sAcc += Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1])) : 0));
      const sA = (Zf - wz), sB = sA + R * Math.PI / 2;                   /* where the curve starts and ends along the profile */
      const pos = [], uv = [], col = [], idx = [], nx = 2, np = prof.length;
      for (let j = 0; j < np; j++) for (let i = 0; i <= nx; i++) {
        const x = -X + 2 * X * i / nx, [z, y] = prof[j], s = sArr[j];
        pos.push(x, y, z); uv.push((x + 250) / 500, (s - sA + 250) / 500);
        const u = Math.min(1, Math.max(0, (s - sA) / (sB - sA))), k = 1 + (wallK - 1) * (u * u * (3 - 2 * u));
        col.push(k, k, k);
      }
      for (let j = 0; j < np - 1; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, a + 1, b, b, a + 1, b + 1);   /* wound to face up and forward (toward the camera) */ }
      const geo = new T.BufferGeometry(); geo.setIndex(idx);
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
      const mat = w.floor.material; mat.vertexColors = true; mat.needsUpdate = true;
      scene.remove(w.floor);
      const sweep = new T.Mesh(geo, mat); sweep.receiveShadow = true; scene.add(sweep);
      w.floor = sweep; w.wall = sweep;
    }
    /* v2: the pool is a broad overhead gradient (cone 1.05 rad, full penumbra), never a disc with an edge */
    /* v2.2: a neutral lamp (was 0xfff1dc), and its light stays on the floor: the cone ends where the floor meets the sweep, so
       the back wall takes only the key and the fill (an even gradient, never a lit disc behind the objects; 12:24 on the v6 cut) */
    const pool = new T.SpotLight(0xfffaf2, (o.poolI ?? 260) * .55, 0, 1.05, 1, 2);
    pool.position.set(...(o.pool || [0, 30, 8])); pool.target.position.set(...(o.poolTarget || o.keyTarget || [0, 0, 0]));
    if (o.wall !== false) {
      const wz = o.wall ?? -18, P = pool.position, A = pool.target.position;
      if (A.z > wz) {                                                    /* the lamp points at the floor in front of the wall */
        const axis = new T.Vector3().subVectors(A, P).normalize(), base = new T.Vector3(P.x, 0, wz).sub(P).normalize();
        pool.angle = Math.max(.3, Math.min(pool.angle, Math.acos(Math.min(1, axis.dot(base)))));
      }
    }
    pool.castShadow = false; scene.add(pool, pool.target); w.pool = pool;
    /* v2.2: the sky and the fill are neutral-cool (were 0xfff6e6, 0xfff3e6), the key stays warm: the shadows read as a room's
       charcoal (Wang 24/25/26) while the gold, which the key lights, keeps its colour */
    scene.add(new T.HemisphereLight(0xf3f6fb, 0x080808, o.hemi ?? .34));
    const key = new T.DirectionalLight(0xffeedd, o.keyI ?? 1.8);
    key.position.set(...(o.key || [-14, 22, 18])); key.castShadow = true;
    key.shadow.mapSize.set(4096, 4096); key.shadow.radius = 9; key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    const s = o.shadow || 30;
    Object.assign(key.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 160 });
    key.target.position.set(...(o.keyTarget || [0, 0, 0])); scene.add(key, key.target);
    const fill = new T.DirectionalLight(0xf3f6fb, o.fillI ?? .5); fill.position.set(0, 8, 40); scene.add(fill);
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
    /* v2: every spotlight a chapter file or a board adds with a hard edge (penumbra < 1) is softened in place, once: its cone
       widened and its penumbra made full, so no pool on the floor or the wall ever shows an edge. Lights already soft are left. */
    const soften = () => scene.traverse((L) => {
      if (!L.isSpotLight || L.userData.v2soft) return;
      L.userData.v2soft = true;
      if (L.penumbra < .99) { L.angle = Math.min(1.2, L.angle * 1.9); L.penumbra = 1; }
    });
    /* v2.1: no near-white hotspot on any surface. Every lit material any module, chapter file or board makes is clamped once, at
       first render: metals (gold) get a roughness floor of .5 and a lower reflection, so the key's highlight spreads into the
       gold instead of burning to white; everything else gets a floor of .3. Flat ink (MeshBasic) is untouched. */
    const tame = (m) => {
      if (!m || !m.isMeshStandardMaterial || m.userData.v21) return;
      m.userData.v21 = true;
      if (m.metalness >= .3) { m.roughness = Math.max(m.roughness, .5); m.envMapIntensity = Math.min(m.envMapIntensity, .8); }
      else m.roughness = Math.max(m.roughness, .3);
    };
    const clamp = () => scene.traverse((n) => { if (n.isMesh) (Array.isArray(n.material) ? n.material : [n.material]).forEach(tame); });
    w.render = () => {
      soften(); clamp();
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
