/* KIT v2 · chapter 1 overrides (Ive, 28 Oct 2026, the polish pass). Load AFTER assets/stage-ch1/ch1.js:
     <script src="assets/stage-ch1/ch1.js?v=1"></script>
     <script src="assets/stage/v2/ch1.js?v=1"></script>
   Same API as KIT1 in ch1.js; KIT1.view and KIT1.range are NOT redefined. Replaced here:
   - KIT1.spot   soft: the cone widened (x2.2, up to 1.1 rad), penumbra 1, intensity x .75, so the light is a gentle falloff, never a pool with an edge.
   - KIT1.flap   the per-character split-flap scoreboard to the rate board's standard (Solari module: housing, hairline split, axle hubs, falling
                 flap with thickness, bevelled cabinet with gold inset trim). Same API: { n, text, ink, cw, ch, at, yaw, px }, b.flipTo(tl, text, at, { ink, dur, stagger }),
                 b.w, b.h, b.left(), b.right(), b.centre(), b.top(), b.bottom(), s.rise. Each character carries its own ink as in v1.
   - KIT1.gantry the fixed service structure (as at SLC-40 / LC-39A): a square steel lattice tower, a floor about every 6 m with a grating
                 platform and railing, X-bracing on all four faces, angle-section corner legs, a ladder, the crew access arm near the top with its
                 white-room end cabin, and the lightning mast. Everything stays in gold line (v1 read) with real member sizes: angle legs and
                 slim diagonals, scaled by u = w / 1.5. Real scale used: floors 6 m = seg (1.75), tower ~ 85 m = h (28) incl. mast,
                 plan 1.5 ~ 5 m. Same API: { w, h, seg, at }, s.rise, h. No added options. */
(() => {
  if (typeof KIT1 === 'undefined') return;
  /* ---- the split-flap core (Solari type), shared in text by KIT.rateboard (v2/rateboard.js) and KIT1.flap (v2/ch1.js) ----
     v2 FINAL, the line language: every body is near-black and matte (flap faces #111215-#17181b, housings, cabinet, posts) and the
     detail is drawn in cream hairline (module frames, the split, the cabinet's outer and inner edges, rail edges, post edges, base
     plates, rivets), full cream for outlines, about 60% for seams. Textures are also the emissiveMap at .16 so a line holds in shadow
     (flat ink, no bloom). Gold stays the cabinet's inset trim. Grey boards (line:'grey') use #8b8b90 for the ink.
     One module = housing + back plate + side walls, two static half-faces (upper shows the new character, lower the old), the hairline
     split, the axle hubs and the falling flap: a slab with thickness carrying the old top on its front and the new bottom on its back.
     Real unit: a Solari module is ~ 40 mm wide x 62 mm tall; flaps drawn at 2% of the module height so the edge reads at 4K. */
  const SF = (() => {
    const T = THREE, tcache = {};
    const MS = (o) => new T.MeshStandardMaterial(Object.assign({ roughness: .8, metalness: .05, envMapIntensity: .2 }, o));
    const CREAM = () => S3.css('--cream'), GREY = '#8b8b90';
    const lcOf = (grey) => grey ? GREY : CREAM();
    const faceTex = (w, d, top) => {
      const key = [d.c, d.ink, d.family || '', d.weight || '', d.px || '', d.dy ?? '', d.grey ? 'g' : 'c', top ? 1 : 0].join('|');
      if (tcache[key]) return tcache[key];
      return (tcache[key] = S3.canvasTex(w.renderer, 384, 285, (x, W, H) => {
        const SC = W / 256, lc = lcOf(d.grey);
        const g = x.createLinearGradient(0, 0, 0, H);
        if (top) { g.addColorStop(0, '#17181b'); g.addColorStop(1, '#131417'); } else { g.addColorStop(0, '#141518'); g.addColorStop(1, '#111215'); }
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        if (d.c.trim()) {
          x.fillStyle = d.ink; x.font = `${d.weight || 600} ${(d.px || 300) * SC}px ${d.family || '"IBM Plex Mono"'}`;
          x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(d.c, W / 2, (top ? H : 0) + (d.dy ?? 16) * SC);
        }
        /* the module frame in cream hairline: left, right and the outer edge full; the split edge a fine line */
        x.fillStyle = lc; x.globalAlpha = .85;
        const t = 3.5 * SC / 1.5;
        x.fillRect(0, 0, t, H); x.fillRect(W - t, 0, t, H);
        if (top) x.fillRect(0, 0, W, t); else x.fillRect(0, H - t, W, t);
        x.globalAlpha = .9;
        if (top) { x.fillRect(0, H - 1.6 * SC, W, 1.6 * SC); } else { x.fillRect(0, 0, W, 1.6 * SC); }
        x.globalAlpha = 1;
        /* the dark gap of the split, inside the line */
        x.fillStyle = '#050506'; if (top) x.fillRect(0, H - 4.2 * SC, W, 2.4 * SC); else x.fillRect(0, 1.6 * SC, W, 2.6 * SC);
      }));
    };
    let mats = null;
    const M = () => mats || (mats = {
      hs:   MS({ color: 0x131417 }),
      edge: MS({ color: 0x16171a }),
      hub:  MS({ color: S3.tok('--cream', .85), roughness: .6, metalness: .1, envMapIntensity: .3 }),
      core: MS({ color: 0x15161a })
    });
    /* flat ink for a hairline strip: cream (or grey), a = alpha-like strength; the same emissive .16 as the textures */
    const inkc = {};
    const ink = (grey, a = 1) => { const k = (grey ? 'g' : 'c') + a; return inkc[k] || (inkc[k] = MS({ color: (grey ? S3.col(0x8b8b90).clone() : S3.tok('--cream')).multiplyScalar(a), emissive: (grey ? S3.col(0x8b8b90).clone() : S3.tok('--cream')).multiplyScalar(a), emissiveIntensity: .16, roughness: .8, metalness: 0, envMapIntensity: .1 })); };
    /* a rectangle of four strips lying on a front face (z), W x H centred on (x, y) */
    const outline = (g, x, y, z, W, H, t, mat) => {
      g.add(KIT.box(W, t, .006, mat, x, y + H / 2 - t / 2, z), KIT.box(W, t, .006, mat, x, y - H / 2 + t / 2, z),
        KIT.box(t, H - 2 * t, .006, mat, x - W / 2 + t / 2, y, z), KIT.box(t, H - 2 * t, .006, mat, x + W / 2 - t / 2, y, z));
    };
    /* a rectangle lying flat (a base plate's top edge), W x D centred on (x, z) at height y */
    const outlineFlat = (g, x, y, z, W, D, t, mat) => {
      g.add(KIT.box(W, .005, t, mat, x, y, z - D / 2 + t / 2), KIT.box(W, .005, t, mat, x, y, z + D / 2 - t / 2),
        KIT.box(t, .005, D - 2 * t, mat, x - W / 2 + t / 2, y, z), KIT.box(t, .005, D - 2 * t, mat, x + W / 2 - t / 2, y, z));
    };
    const LIT = 1.35;   /* the falling flap is unlit paint, the same near-black as the lit faces */

    /* one module; (x, y0) = centre-bottom of its window, z0 = its face plane. States as v1: m.from, m.to, m.s.p (0..1). */
    function mod(w, g, x, y0, cw, ch, z0) {
      const k = M(), B = KIT.bbox, ym = y0 + ch / 2;
      const m = { from: ' ', to: ' ', s: { p: 1 } };
      const mk = () => new T.MeshStandardMaterial({ color: 0x6a6a6a, roughness: .85, metalness: 0, envMapIntensity: .1, emissive: 0xffffff, emissiveIntensity: .42 });
      const hh = ch / 2 - .004;
      m.up = new T.Mesh(new T.PlaneGeometry(cw, hh), mk()); m.up.position.set(x, y0 + ch * .75 + .002, z0);
      m.lo = new T.Mesh(new T.PlaneGeometry(cw, hh), mk()); m.lo.position.set(x, y0 + ch * .25 - .002, z0);
      m.up.receiveShadow = m.lo.receiveShadow = true;
      g.add(B(cw + .05, ch + .05, .05, k.hs, x, ym, z0 - .045, .008));                       /* back plate */
      for (const sx of [-1, 1]) {
        g.add(B(.016, ch + .05, .11, k.hs, x + sx * (cw / 2 + .022), ym, z0 - .005, .004));  /* side walls */
        const hub = KIT.cyl(ch * .016, ch * .016, .022, k.hub, 16); hub.rotation.z = Math.PI / 2; hub.position.set(x + sx * (cw / 2 + .003), ym, z0 + .012); g.add(hub);   /* axle ends */
      }
      const th = Math.max(.012, ch * .018), fw = cw - .014, fh = hh - .004;
      const fl = new T.Group(); fl.position.set(x, ym, z0 + .016);
      const body = new T.Mesh(new T.BoxGeometry(fw, fh, th), k.core); body.position.y = fh / 2 + .002; body.castShadow = false; fl.add(body);
      const mkF = () => new T.MeshBasicMaterial({ toneMapped: true });
      m.fa = new T.Mesh(new T.PlaneGeometry(fw, fh), mkF()); m.fa.position.set(0, fh / 2 + .002, th / 2 + .0005);
      m.fb = new T.Mesh(new T.PlaneGeometry(fw, fh), mkF()); m.fb.position.set(0, fh / 2 + .002, -th / 2 - .0005); m.fb.rotation.x = Math.PI;
      fl.add(m.fa, m.fb); fl.visible = false; m.fl = fl;
      g.add(m.up, m.lo, fl);
      const set = (mesh, d, top) => { const t = faceTex(w, d, top); if (mesh.material.map !== t) { mesh.material.map = t; mesh.material.emissiveMap = t; mesh.material.needsUpdate = true; } };
      /* d(v) turns a stored value (string or {c,k}) into a descriptor { c, ink, family, weight, px, dy, grey } */
      m.render = (d) => {
        const p = m.s.p, flipping = p > 0 && p < 1;
        set(m.up, d(flipping || p >= 1 ? m.to : m.from), true);
        set(m.lo, d(flipping ? m.from : (p >= 1 ? m.to : m.from)), false);
        m.fl.visible = flipping;
        if (flipping) {
          set(m.fa, d(m.from), true); set(m.fb, d(m.to), false);
          const e = p * p * (3 - 2 * p), s = Math.sin(Math.PI * e);
          m.fl.rotation.x = Math.PI * e;
          const c = LIT * (1 - .1 * s); m.fa.material.color.setScalar(c); m.fb.material.color.setScalar(c);
          m.lo.material.color.setScalar(1 - .5 * s);   /* the falling flap shades the half beneath it */
        } else m.lo.material.color.setScalar(1);
      };
      return m;
    }

    /* the casing's front plate: near-black sheet, a seam line and rivet rings in cream hairline (1 unit = 512 px) */
    const plateTexs = {};
    const M2 = (w, W, H, grey) => {
      const kk = grey ? 'g' : 'c';
      if (!plateTexs[kk]) plateTexs[kk] = KIT.tile(w, 512, 512, (x, PW, PH) => {
        const lc = lcOf(grey);
        x.fillStyle = '#111215'; x.fillRect(0, 0, PW, PH);
        x.fillStyle = lc; x.globalAlpha = .6; x.fillRect(0, 254, PW, 3); x.fillRect(0, 0, 3, PH); x.globalAlpha = 1;
        x.strokeStyle = lc; x.lineWidth = 2.5; x.globalAlpha = .85;
        for (const px of [64, 192, 320, 448]) for (const py of [226, 288]) { x.beginPath(); x.arc(px, py, 6.5, 0, 7); x.stroke(); x.beginPath(); x.moveTo(px - 3, py); x.lineTo(px + 3, py); x.stroke(); }
        x.globalAlpha = 1;
      }, 1, 1);
      const t = plateTexs[kk].clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(W, H);
      return MS({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .16, color: 0xffffff, roughness: .8, metalness: 0, envMapIntensity: .15 });
    };
    /* the cabinet: casing + bezel + cream outlines + gold inset trim + corner screws. W x H, bottom at y0, centred on x = 0. Front of casing at zc + depth/2. */
    function frame(w, W, H, y0, zc, o = {}) {
      const k = M(), B = KIT.bbox, g = new T.Group(), bw = o.bar ?? .075, depth = o.depth ?? .26, grey = o.line === 'grey';
      const trim = grey ? w.mat.greyLine : w.mat.trim;
      g.add(B(W, H, depth, k.hs, 0, y0 + H / 2, zc, .015));
      const plate = new T.Mesh(new T.PlaneGeometry(W - .02, H - .02), M2(w, W, H, grey)); plate.position.set(0, y0 + H / 2, zc + depth / 2 + .002); plate.receiveShadow = true; g.add(plate);
      const db = .12, zb = zc + depth / 2 + .035;                                        /* bezel bars: front face at +.05 */
      g.add(B(W, bw, db, k.edge, 0, y0 + H - bw / 2, zb, .012), B(W, bw, db, k.edge, 0, y0 + bw / 2, zb, .012));
      for (const sx of [-1, 1]) g.add(B(bw, H - 2 * bw + .01, db, k.edge, sx * (W / 2 - bw / 2), y0 + H / 2, zb, .012));
      const zt = zb + db / 2 + .002, t = .012, ins = bw * .5;                              /* inset trim on the bezel face */
      outline(g, 0, y0 + H / 2, zt + .001, W - .004, H - .004, .010, ink(grey, 1));       /* the bezel's outer edge, cream hairline */
      outline(g, 0, y0 + H / 2, zt + .001, W - 2 * bw, H - 2 * bw, .008, ink(grey, 1));  /* and its inner edge */
      g.add(B(W - 2 * ins, t, .008, trim, 0, y0 + H - ins, zt, .002), B(W - 2 * ins, t, .008, trim, 0, y0 + ins, zt, .002));
      for (const sx of [-1, 1]) g.add(B(t, H - 2 * ins, .008, trim, sx * (W / 2 - ins), y0 + H / 2, zt, .002));
      for (const sx of [-1, 1]) for (const sy of [0, 1]) {                                 /* corner screws */
        const sc = KIT.cyl(.011, .011, .01, k.hub, 12); sc.rotation.x = Math.PI / 2;
        sc.position.set(sx * (W / 2 - bw * .5), y0 + (sy ? H - bw * .5 : bw * .5), zt + .008); g.add(sc);
      }
      return g;
    }
    /* a rail across a row, above and below the modules, its front edges drawn in cream hairline */
    const rails = (g, x, rw, y0, ch, z0, grey) => {
      const k = M(), im = ink(grey, .6);
      for (const y of [y0 - .03, y0 + ch + .03]) {
        g.add(KIT.bbox(rw + .09, .035, .12, k.edge, x, y, z0 - .01, .008));
        g.add(KIT.box(rw + .09, .006, .006, im, x, y + .0145, z0 + .052), KIT.box(rw + .09, .006, .006, im, x, y - .0145, z0 + .052));
      }
    };
    return { mod, frame, rails, M, faceTex, ink, outline, outlineFlat };
  })();
  const T = THREE;
  KIT1.spot = function spot(w, at, target, o = {}) {
    const s = new T.SpotLight(o.colour ?? 0xfff1dc, (o.i ?? 180) * .75, 0, Math.min(1.1, (o.angle ?? .3) * 2.2), 1, 2);
    s.position.set(...at); s.target.position.set(...target); s.castShadow = false;
    w.scene.add(s, s.target); return s;
  };

  KIT1.flap = function flap(w, o = {}) {
    const cw = o.cw ?? .62, ch = o.ch ?? .92, gap = o.gap ?? .06, n = o.n ?? 6, pad = ch * .3, px = o.px || 300;
    const width = n * (cw + gap) - gap + pad * 2, height = ch + pad * 2;
    const g = new T.Group();
    g.add(SF.frame(w, width, height, 0, -.13, { depth: .22 }));
    const y0 = pad, x0 = -width / 2 + pad, rw = n * (cw + gap) - gap;
    const mods = Array.from({ length: n }, (_, i) => { const m = SF.mod(w, g, x0 + i * (cw + gap) + cw / 2, y0, cw, ch, 0); m.from = m.to = { c: ' ', k: '#000' }; return m; });
    SF.rails(g, x0 + rw / 2, rw, y0, ch, 0);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const desc = (v) => ({ c: v.c, ink: v.k, px });
    const padTo = (text) => (' '.repeat(n) + text).slice(-n);
    const wp = (x, y) => { const p = new T.Vector3(x, y, 0); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; };
    const hd = { group: root, w: width, h: height, s: { rise: 1 },
      set(text, ink) { const s = padTo(text); S3.mirror(w.words, [text]); mods.forEach((m, i) => { m.from = m.to = { c: s[i], k: ink }; m.s.p = 1; }); },
      flipTo(tl, text, at, fo = {}) {
        const s = padTo(text), dur = fo.dur ?? .26, stg = fo.stagger ?? .05, ink = fo.ink || S3.css('--gold');
        S3.mirror(w.words, [text]);
        mods.forEach((m, i) => {
          const st = { p: 0 };
          tl.fromTo(st, { p: 0 }, { p: 1, duration: dur, ease: 'none', immediateRender: false,
            onStart: () => { m.from = m.cur || m.to; m.to = { c: s[i], k: ink }; },
            onUpdate: () => { m.s.p = st.p; },
            onReverseComplete: () => { m.to = m.from; m.s.p = 1; } }, at + i * stg);
        });
      },
      left: () => wp(-width / 2, height / 2), right: () => wp(width / 2, height / 2), centre: () => wp(0, height / 2),
      bottom: () => wp(0, 0), top: () => wp(0, height),
      apply() { root.visible = hd.s.rise > .001; if (!root.visible) return; mods.forEach(m => m.render(desc)); } };
    hd.set(o.text || '', o.ink || S3.css('--cream'));
    return w.add(hd);
  };

  /* ---- the launch tower ---- */
  let gratingTex = null;
  const grating = (w) => gratingTex || (gratingTex = S3.canvasTex(w.renderer, 256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H); g.strokeStyle = S3.css('--gold'); g.globalAlpha = .8; g.lineWidth = 3;
    for (let i = 0; i <= 16; i++) { const p = i * 16; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, H); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(W, p); g.stroke(); }
    g.globalAlpha = 1; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 2; i++) { g.moveTo(i * 128, 0); g.lineTo(i * 128, H); } g.stroke();
  }));
  const gratingPlane = (w, sx, sz) => {
    const t = grating(w).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(sx / .5, sz / .5);
    const m = new T.Mesh(new T.PlaneGeometry(sx, sz), new T.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, side: T.DoubleSide, roughness: .5, metalness: .4, envMapIntensity: .6 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m;
  };
  const BOX = new T.BoxGeometry(1, 1, 1);
  const inst = (list, mat) => {
    const im = new T.InstancedMesh(BOX, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3();
    list.forEach((a, i) => { p.set(a[0], a[1], a[2]); sc.set(a[3], a[4], a[5]); e.set(a[6] || 0, a[7] || 0, a[8] || 0); q.setFromEuler(e); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
  };
  KIT1.gantry = function gantry(w, o = {}) {
    const W = o.w ?? 1.4, Hh = o.h ?? 26, seg = o.seg ?? 1.6, u = W / 1.5, h2 = W / 2;
    const n = Math.max(2, Math.floor(Hh * .9 / seg)), top = n * seg, A = [], C = [], plats = [];
    /* angle-section corner legs (two plates at a right angle) on base plates */
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      C.push([sx * (h2 - .0375 * u), top / 2, sz * h2, .075 * u, top, .018 * u]);
      C.push([sx * h2, top / 2, sz * (h2 - .0375 * u), .018 * u, top, .075 * u]);
      C.push([sx * h2, .02, sz * h2, .2 * u, .04, .2 * u]);
    }
    const L = Math.hypot(W, seg), ang = Math.atan2(seg, W), e = .2 * u, P = W + 2 * e, rh = Math.min(seg * .2, .34);
    for (let i = 0; i <= n; i++) {
      const y = i * seg;
      for (const s of [-1, 1]) A.push([0, y, s * h2, W, .05 * u, .03 * u], [s * h2, y, 0, .03 * u, .05 * u, W]);   /* floor-level struts on four faces */
      if (i === 0) continue;
      plats.push(y + .012);
      for (const s of [-1, 1]) {
        C.push([0, y - .03, s * (h2 + e), P, .055 * u, .028 * u], [s * (h2 + e), y - .03, 0, .028 * u, .055 * u, P]);        /* platform edge beam */
        A.push([0, y + .02, s * (h2 + e), P, .03 * u, .014 * u], [s * (h2 + e), y + .02, 0, .014 * u, .03 * u, P]);          /* toe plate */
        for (const f of [rh, rh / 2]) A.push([0, y + f, s * (h2 + e), P, .016 * u, .016 * u], [s * (h2 + e), y + f, 0, .016 * u, .016 * u, P]);   /* handrails */
        for (const t of [-1, 0, 1]) A.push([t * (h2 + e), y + rh / 2, s * (h2 + e), .016 * u, rh, .016 * u], [s * (h2 + e), y + rh / 2, t * (h2 + e), .016 * u, rh, .016 * u]);
        for (const t of [-.5, .5]) A.push([t * W, y - .1 * u, s * (h2 + e / 2), .018 * u, .018 * u, e * 1.3, -s * .6, 0, 0], [s * (h2 + e / 2), y - .1 * u, t * W, e * 1.3, .018 * u, .018 * u, 0, 0, s * .6]);   /* cantilever brackets */
      }
    }
    for (let i = 0; i < n; i++) {
      const yc = i * seg + seg / 2;
      for (const s of [-1, 1]) for (const d of [1, -1]) {
        A.push([0, yc, s * h2 + d * .008 * u, L, .032 * u, .022 * u, 0, 0, d * ang]);              /* X-bracing, front and back */
        A.push([s * h2 + d * .008 * u, yc, 0, .022 * u, .032 * u, L, d * ang, 0, 0]);              /* and both sides */
      }
    }
    /* a ladder up the front face */
    const lx = W * .22, lz = h2 + .06 * u;
    for (const s of [-1, 1]) A.push([lx + s * .09 * u, top / 2, lz, .014 * u, top, .014 * u]);
    for (let y = .2; y < top; y += seg / 6) A.push([lx, y, lz, .18 * u, .01 * u, .01 * u]);
    /* the crew access arm: a truss out to the pad side (-x) near the top, ending in the white room */
    const ia = Math.max(1, n - 2), ya = ia * seg + .02, La = Math.min(2.2, W * 1.4), aw = .5 * u, ah = .44 * u, x1 = -h2, x2 = -h2 - La;
    const bays = Math.max(2, Math.round(La / (.4 * u))), bl = La / bays, dl = Math.hypot(bl, ah), da = Math.atan2(ah, bl);
    for (const s of [-1, 1]) {
      A.push([(x1 + x2) / 2, ya + .03, s * aw / 2, La, .036 * u, .036 * u], [(x1 + x2) / 2, ya + ah, s * aw / 2, La, .036 * u, .036 * u]);
      for (let b = 0; b <= bays; b++) A.push([x1 - b * bl, ya + ah / 2, s * aw / 2, .02 * u, ah, .02 * u]);
      for (let b = 0; b < bays; b++) A.push([x1 - b * bl - bl / 2, ya + ah / 2, s * aw / 2, dl, .02 * u, .02 * u, 0, 0, (b % 2 ? 1 : -1) * da]);
    }
    for (let b = 0; b <= bays; b++) A.push([x1 - b * bl, ya + .03, 0, .03 * u, .03 * u, aw]);
    const cx = x2 - .2 * u, cb = .46 * u, cwid = aw + .08 * u, chh = ah + .12 * u;                    /* the white room: a framed cabin on the arm's end */
    for (const yy of [ya - .02, ya - .02 + chh]) for (const s of [-1, 1]) A.push([cx, yy, s * cwid / 2, cb, .03 * u, .03 * u], [cx + s * cb / 2, yy, 0, .03 * u, .03 * u, cwid]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) A.push([cx + sx * cb / 2, ya - .02 + chh / 2, sz * cwid / 2, .03 * u, chh, .03 * u]);
    A.push([cx - cb / 2, ya - .02 + chh / 2, 0, .02 * u, chh * .8, .02 * u], [cx, ya - .02 + chh * .5, cwid / 2, .02 * u, chh * .8, .02 * u]);
    /* the lightning mast on the roof deck */
    const mh = Hh - top;
    C.push([0, top + .06, 0, .22 * u, .12, .22 * u]);
    A.push([0, top + mh / 2, 0, .05 * u, mh, .05 * u], [0, top + mh * .72, 0, .7 * u, .02 * u, .02 * u], [0, top + mh * .72, 0, .02 * u, .02 * u, .7 * u], [0, Hh - .08, 0, .09 * u, .16, .09 * u]);
    for (const s of [-1, 1]) A.push([s * .11 * u, top + .25, 0, .014 * u, .5, .014 * u, 0, 0, -s * .2], [0, top + .25, s * .11 * u, .014 * u, .5, .014 * u, s * .2, 0, 0]);
    const g = new T.Group();
    /* the tower's gold, muted: at this much surface the full trim reads as yellow paint (Ive's review) */
      const gA = new T.MeshStandardMaterial({ color: S3.tok('--gold', .58), metalness: .35, roughness: .55, envMapIntensity: .6 }), gC = new T.MeshStandardMaterial({ color: S3.tok('--gold', .78), metalness: .45, roughness: .48, envMapIntensity: .75 });
      g.add(inst(A, gA), inst(C, gC));
    for (const py of plats) { const m = gratingPlane(w, W + .02, W + .02); m.position.y = py; g.add(m); }
    { const m = gratingPlane(w, La, aw); m.position.set((x1 + x2) / 2, ya + .035, 0); g.add(m); }
    const root = new T.Group(); root.add(g);
    const cs = KIT.contact(w, W + .9, W + .9, { k: .55, pad: .3 }); root.add(cs);
    root.position.set(...(o.at || [0, 0, 0])); w.scene.add(root);
    const hd = { group: root, h: Hh, s: { rise: 1 }, apply() { g.position.y = -(Hh + .5) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; cs.set(Math.max(0, (hd.s.rise - .85) / .15)); } };
    return w.add(hd);
  };
})();
