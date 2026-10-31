/* ============================================================
   BOARDROOM WIRE · THE OUTRO (Ive, 28 Oct 2026). Shared by outro-a/-b/-c.html (three options for the writer).
   The brand outro that carries YouTube's end-screen elements. YouTube overlays up to four elements on the last 5–20 s
   (support.google.com/youtube/answer/6388789); the creator drags them into place in Studio. So the design leaves fixed,
   clean slots for them and never draws a button:
     OUT.SLOT.sub   the subscribe element (a circle, the channel icon). Our bust stands under it, a touch smaller (270 px
                    tall inside the 298 px circle), so the element always covers it: when YouTube's icon appears it is the
                    bust coming alive, and anywhere without end screens the bust is simply there.
     OUT.SLOT.v1/v2 two video elements (16:9, 613 × 343 at 1920 × 1080), on clean floor or ink with a 24 px margin.
   Everything is in the 1920 × 1080 page's CSS px (×2 at 4K). Everything lands by second 5 and then holds still in the slots.
   ?guide draws YouTube's elements over the frame as a placement guide (never rendered into the outro itself).
   ============================================================ */
const OUT = (() => {
  const Q = new URLSearchParams(location.search);
  const SLOT = {
    sub: { cx: 464, cy: 290, d: 298 },
    v1: { x: 315, y: 520, w: 613, h: 343 },
    v2: { x: 992, y: 520, w: 613, h: 343 },
    bustH: 270,                                   /* the bust's height on screen, centred on sub */
    markR: 1605                                   /* the wordmark's right edge = the right tile's right edge */
  };
  const BUST = 'assets/outro/bw-bust.png', RING = window.BW_BUST_RING || { u: .5, v: .53, r: .5, ar: 1414 / 1517 }, BUST_AR = RING.ar;
  /* the bust's box on screen: its ring centred on the subscribe circle (the head breaks the ring at the top, still inside it) */
  const bustBox = () => { const h = SLOT.bustH, w = h * BUST_AR; return { x: SLOT.sub.cx - RING.u * w, y: SLOT.sub.cy - RING.v * h, w, h }; };

  /* the guide: YouTube's elements drawn as outlines, the inner 80% safe area, and the player-controls band */
  function guide() {
    if (!Q.has('guide')) return;
    const st = document.querySelector('.stage');
    const ns = 'http://www.w3.org/2000/svg', s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 1920 1080'); s.setAttribute('class', 'out-guide');
    s.style.cssText = 'position:absolute;inset:0;width:1920px;height:1080px;z-index:90;pointer-events:none';
    const C = '#3ea6ff', add = (tag, a) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); s.appendChild(e); return e; };
    const txt = (x, y, t, anchor = 'start') => { const e = add('text', { x, y, fill: C, 'font-family': 'Inter, sans-serif', 'font-size': 22, 'font-weight': 600, 'text-anchor': anchor }); e.textContent = t; };
    add('rect', { x: 192, y: 108, width: 1536, height: 864, fill: 'none', stroke: C, 'stroke-width': 1.5, 'stroke-dasharray': '6 8', opacity: .55 });
    add('rect', { x: 0, y: 1008, width: 1920, height: 72, fill: C, opacity: .12 });
    txt(24, 1050, 'player controls', 'start');
    for (const k of ['v1', 'v2']) { const v = SLOT[k];
      add('rect', { x: v.x, y: v.y, width: v.w, height: v.h, rx: 8, fill: 'rgba(62,166,255,.16)', stroke: C, 'stroke-width': 3 });
      txt(v.x + v.w / 2, v.y + v.h / 2 + 8, 'video element 613 × 343', 'middle'); }
    const c = SLOT.sub;
    add('circle', { cx: c.cx, cy: c.cy, r: c.d / 2, fill: 'rgba(62,166,255,.16)', stroke: C, 'stroke-width': 3 });
    txt(c.cx, c.cy + c.d / 2 + 30, 'subscribe 298', 'middle');
    txt(1728, 100, 'inner 80%', 'end');
    st.appendChild(s);
  }

  /* ---------- 3D: a level camera with a shifted lens (verticals stay upright, the horizon sits where the frame needs it) ----------
     cam at (cx, hc, zc) looking down -z; the principal point at screen y = p. toWorld(sx, sy, D): the point at distance D in front. */
  function lens(w, o) {
    const f = 540 / Math.tan(o.fov * Math.PI / 360);
    const st = { p: o.p };
    w.add({ s: st, apply() { const cam = w.camera; cam.setViewOffset(1920, 1080, 0, 540 - st.p, 1920, 1080); } });
    const rest = { px: o.cx, py: o.hc, pz: o.zc, tx: o.cx, ty: o.hc, tz: o.zc - 10, fov: o.fov };
    const toWorld = (sx, sy, D) => [o.cx + (sx - 960) * D / f, o.hc + (o.p - sy) * D / f, o.zc - D];
    return { f, st, rest, toWorld, px: (worldLen, D) => worldLen * f / D, wl: (px, D) => px * D / f };
  }

  /* the bust as a medallion: its true silhouette (bust-outline.js) extruded, gold edge, ink back, the bust inlaid on the face.
     h = height in world units; at = bottom-centre [x, y, z]; returns a handle with s.rise (0 below the floor, 1 standing) */
  async function medallion(w, o) {
    const T = THREE, H = o.h, W = H * BUST_AR, D = o.depth ?? H * .07;
    const sh = new T.Shape(); (window.BW_BUST_OUTLINE || []).forEach(([u, v], i) => { const x = (u - .5) * W, y = (.5 - v) * H; i ? sh.lineTo(x, y) : sh.moveTo(x, y); });
    const geo = new T.ExtrudeGeometry(sh, { depth: D, bevelEnabled: true, bevelThickness: D * .18, bevelSize: D * .14, bevelSegments: 3, curveSegments: 4 });
    const ink = new T.MeshStandardMaterial({ color: 0x0c0d0f, roughness: .86, metalness: .05, envMapIntensity: .25 });
    const body = new T.Mesh(geo, [ink, w.mat.trim]); body.castShadow = true; body.receiveShadow = true; body.position.z = -D / 2;
    const tex = await S3.tex(w.renderer, BUST);
    const face = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .45,
      metalness: .6, roughness: .42, envMapIntensity: 1.0, color: 0xffffff, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: o.self ?? .05 }));
    face.position.z = D / 2 + D * .18 + .002; face.renderOrder = 2;
    /* the back: the kit's line language, a cream hairline ring inset from the edge and a gold boss at the axle */
    const backTex = S3.canvasTex(w.renderer, 1024, Math.round(1024 / BUST_AR), (x, PW, PH) => {
      x.clearRect(0, 0, PW, PH); const cx = RING.u * PW, cy = RING.v * PH, R = RING.r * PW;
      x.strokeStyle = 'rgba(236,230,214,.85)'; x.lineWidth = 7; x.beginPath(); x.arc(cx, cy, R * .9, 0, 7); x.stroke();
      x.strokeStyle = 'rgba(236,230,214,.45)'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, R * .86, 0, 7); x.stroke();
      x.lineWidth = 3; x.beginPath(); x.moveTo(cx - R * .9, cy); x.lineTo(cx + R * .9, cy); x.stroke();
    });
    const back = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshStandardMaterial({ map: backTex, transparent: true, depthWrite: false, roughness: .8,
      emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: .16, polygonOffset: true, polygonOffsetFactor: -2 }));
    back.rotation.y = Math.PI; back.position.z = -D / 2 - D * .18 - .002; back.renderOrder = 2;
    const boss = KIT.cyl(H * .045, H * .045, D * .5, w.mat.trim, 32); boss.rotation.x = Math.PI / 2; boss.position.set(0, (RING.v - .5) * -H + 0, -D / 2 - D * .18 - D * .2);
    const g = new T.Group(), inner = new T.Group(), spin = new T.Group(); inner.add(body, face, back); boss.position.y = (.5 - RING.v) * H; inner.add(boss); g.add(spin); spin.add(inner);
    /* o.mount: the group's origin is the ring's centre and the medallion turns about a horizontal axle there (s.flip 0..1) */
    if (o.mount) { inner.position.y = (RING.v - .5) * H; spin.position.y = 0; }
    else inner.position.y = H / 2;
    if (o.foot !== false && !o.mount) {                                     /* a low gold-edged foot so it stands, not leans */
      const ft = KIT.bbox(W * .62, H * .035, D * 3.2, ink, 0, H * .035, 0, .01); g.add(ft);
      const ed = KIT.box(W * .62, H * .006, .006, w.mat.trim, 0, H * .03, D * 1.6 + .004); g.add(ed);
    }
    const cs = o.mount ? null : KIT.contact(w, W * .9, D * 6, { k: .7 }); if (cs) g.add(cs);
    g.position.set(...o.at); if (o.yaw) g.rotation.y = o.yaw; w.scene.add(g);
    const base = o.at[1];
    const hd = { group: g, spin, W, H, D, ringR: RING.r * W, s: { rise: o.rise ?? 1, flip: o.flip ?? 1 }, apply() {
      const r = hd.s.rise; spin.rotation.x = -Math.PI * (1 - hd.s.flip);
      if (o.mount) return;
      g.position.y = base - (H * 1.08) * (1 - r); g.visible = r > .001; cs.set(r); } };
    return w.add(hd);
  }

  /* the wordmark in Inter Black, read from the font file (opentype.js), every letter its own solid.
     o: { capH, x0, x1 (fit between), base:[y, z], depth, face: [cream, gold] }; returns { letters:[{group, s:{rise}}], width } */
  const FONT_URL = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-900-normal.woff';
  let fontP = null;
  const font = () => fontP || (fontP = new Promise((res, rej) => opentype.load(FONT_URL, (e, f) => e ? rej(e) : res(f))));
  async function wordmark3d(w, o) {
    const T = THREE, F = await font(), text = 'BOARDROOMWIRE', gold = 9;
    const capEm = (F.tables.os2 && F.tables.os2.sCapHeight ? F.tables.os2.sCapHeight : .727 * F.unitsPerEm) / F.unitsPerEm;
    /* lay out at 1 unit = 1 em, with the site's -0.02 em tracking, then scale to fit x0..x1 */
    /* each letter's x from the browser's own shaping of the word (kerning and the -0.02 em tracking included), in em */
    const glyphs = F.stringToGlyphs(text), cx2 = document.createElement('canvas').getContext('2d');
    await document.fonts.load('900 100px Inter'); cx2.font = '900 1000px Inter'; try { cx2.letterSpacing = '-20px'; } catch (e) {}
    const pos = glyphs.map((g, i) => cx2.measureText(text.slice(0, i)).width / 1000);
    const lastG = glyphs[glyphs.length - 1], bb = lastG.getBoundingBox(), totalEm = pos[pos.length - 1] + bb.x2 / F.unitsPerEm;
    const firstX = glyphs[0].getBoundingBox().x1 / F.unitsPerEm;
    const em = o.x1 != null ? (o.x1 - o.x0) / (totalEm - firstX) : o.capH / capEm;
    const D = o.depth ?? em * .16;
    const faceM = [KIT.M({ color: S3.tok('--cream'), roughness: .55, metalness: 0, envMapIntensity: .5, emissive: S3.tok('--cream'), emissiveIntensity: o.self ?? .06 }),
                   KIT.M({ color: S3.tok('--gold-bright'), roughness: .5, metalness: .45, envMapIntensity: .9, emissive: S3.tok('--gold'), emissiveIntensity: o.self ?? .06 })];
    const side = new T.MeshStandardMaterial({ color: 0x141518, roughness: .7, metalness: .1, envMapIntensity: .35 });
    const letters = glyphs.map((g, i) => {
      const p = g.getPath(0, 0, F.unitsPerEm), sp = new T.ShapePath();
      p.commands.forEach(c => { const Y = (v) => -v;
        if (c.type === 'M') sp.moveTo(c.x, Y(c.y)); else if (c.type === 'L') sp.lineTo(c.x, Y(c.y));
        else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, Y(c.y1), c.x, Y(c.y));
        else if (c.type === 'C') sp.bezierCurveTo(c.x1, Y(c.y1), c.x2, Y(c.y2), c.x, Y(c.y));
        else if (c.type === 'Z') sp.currentPath && sp.currentPath.closePath && sp.currentPath.closePath(); });
      const shapes = sp.toShapes(o.ccw ?? false);
      const k = em / F.unitsPerEm;
      const geo = new T.ExtrudeGeometry(shapes, { depth: D / k, bevelEnabled: true, bevelThickness: D * .06 / k, bevelSize: D * .05 / k, bevelSegments: 2, curveSegments: 10 });
      const m = new T.Mesh(geo, [i >= gold ? faceM[1] : faceM[0], side]); m.castShadow = true; m.receiveShadow = true;
      m.scale.setScalar(k); m.position.set(0, 0, -D / 2);
      const grp = new T.Group(); grp.add(m);
      grp.position.set(o.x0 + (pos[i] - firstX) * em, o.base[0], o.base[1]); w.scene.add(grp);
      const capH = capEm * em, b = o.base[0];
      const hd = { group: grp, capH, s: { rise: o.rise ?? 1 }, apply() { const r = hd.s.rise; grp.position.y = b - capH * 1.1 * (1 - r); grp.visible = r > .001; } };
      return w.add(hd);
    });
    S3.mirror(w.words, ['BOARDROOM WIRE']);
    return { letters, em, capH: capEm * em, width: (totalEm - firstX) * em };
  }

  return { Q, SLOT, BUST, BUST_AR, RING, bustBox, guide, lens, medallion, wordmark3d, font };
})();
