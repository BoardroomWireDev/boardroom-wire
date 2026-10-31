/* KIT v2 · KIT.rateboard (Ive, 28 Oct 2026, the polish pass). The hotel's rate board as a real Solari-type split-flap sign.
   Same API as v1 (assets/stage/rateboard.js), same footprint and size for the same options:
   const r = KIT.rateboard.create(w, { rows: [{ text, n, ink, family, px, dy, weight }], cw, ch, gap, at: [x, 0, z], posts, yaw, line: 'grey' });
   r.flipTo(tl, row, text, at, { dur, stagger, turns, pool })   turns: 0 = straight to the text, no riffle
   r.set(row, text)   r.rows[i].mods[j].to / .from   r.w, r.h, r.top(), r.rowPoint(i, 'left' | 'right')
   Real proportions: a Solari module is ~ 40 mm × 62 mm (here cw : ch about 2 : 3), flap ~ 0.5 mm (drawn at 2% of the module height so its
   edge shows mid-flip); every module has a dark housing, side walls, a back plate, the hairline split, the axle hubs and a falling flap
   with thickness; the cabinet is a bevelled casing and bezel with an inset gold trim (v1's gold frame line) and corner screws; two
   steel posts with web ribs, bolted base plates and a clamp at the casing; a soft contact shadow. Character ink is exactly what is
   passed (words go through the same canvas path, mirrored for `bw words`). Nothing emits; the falling flap is unlit paint shaded by angle.
   Test mid-flip with a board's ?t=. */
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

KIT.rateboard = { create(w, o = {}) {
  const T = THREE, B = KIT.bbox, cw = o.cw ?? .62, ch = o.ch ?? .92, gap = o.gap ?? .06, rowGap = ch * .28, pad = ch * .3;
  const rows = (o.rows || []).map(r => Object.assign({ n: r.text.length }, r));
  const width = Math.max(...rows.map(r => r.n * (cw + gap) - gap)) + pad * 2;
  const height = rows.length * ch + (rows.length - 1) * rowGap + pad * 2;
  const g = new T.Group(), postH = o.posts ?? 1.2, zc = -.175, k = SF.M();
  g.userData.w = w;
  /* cabinet: bevelled casing, bezel and inset trim; v1's gold frame line is now the trim (grey with line:'grey') */
  g.add(SF.frame(w, width, height, postH, zc, { line: o.line }));
  /* two steel posts on base plates (v1: two legs at ±.32 of the width) */
  const grey = o.line === 'grey', i1 = SF.ink(grey, 1), i6 = SF.ink(grey, .6);
  if (postH > 0) for (const dx of [-width * .32, width * .32]) {
    g.add(B(.1, postH, .1, k.hs, dx, postH / 2, -.2, .012));
    for (const sx of [-1, 1]) g.add(KIT.box(.008, postH - .06, .008, i1, dx + sx * .046, postH / 2, -.2 + .052));      /* the post's front edges in cream hairline */
    g.add(KIT.box(.006, postH - .2, .006, i6, dx, postH / 2, -.2 + .052));                                              /* its web seam */
    g.add(B(.3, .035, .3, k.edge, dx, .0175, -.2, .01));                                                                /* base plate, near-black */
    SF.outlineFlat(g, dx, .0375, -.2, .3, .3, .01, i1);                                                                 /* its edge, outlined */
    for (const bx of [-1, 1]) for (const bz of [-1, 1]) { const b = KIT.cyl(.016, .016, .02, k.hub, 8); b.position.set(dx + bx * .11, .045, -.2 + bz * .11); g.add(b); }
    g.add(B(.18, .06, .16, k.edge, dx, postH - .05, -.2, .008));                                                        /* clamp where it meets the casing */
    g.add(KIT.box(.18, .006, .006, i1, dx, postH - .022, -.2 + .084));
  }
  rows.forEach((r, ri) => {
    const y0 = postH + height - pad - ri * (ch + rowGap) - ch;    /* bottom of this row */
    const rw = r.n * (cw + gap) - gap, x0 = width / 2 - pad - rw;  /* right-aligned */
    r.mods = Array.from({ length: r.n }, (_, i) => SF.mod(w, g, x0 + i * (cw + gap) + cw / 2, y0, cw, ch, 0));
    SF.rails(g, x0 + rw / 2, rw, y0, ch, 0, grey);
    r.y0 = y0;
    r.desc = (c) => ({ c, ink: r.ink, family: r.family, weight: r.weight, px: r.px, dy: r.dy, grey });
  });
  const root = new T.Group(); root.add(g);
  const cs = KIT.contact(w, width * .8, .9, { k: .6, pad: .3 }); cs.position.set(0, .003, -.1); root.add(cs);
  root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const pad0 = (r, text) => (' '.repeat(r.n) + text).slice(-r.n);
  const hd = { group: root, w: width, h: height + postH, rows, s: {},
    set(ri, text) { const r = rows[ri]; const s = pad0(r, text); S3.mirror(w.words, [text]); r.mods.forEach((m, i) => { m.from = m.to = s[i]; m.s.p = 1; m.seq = null; }); },
    flipTo(tl, ri, text, at, fo = {}) {
      const r = rows[ri], s = pad0(r, text), dur = fo.dur ?? .32, stg = fo.stagger ?? .09, turns = fo.turns ?? 2;
      const POOL = fo.pool || '0123456789';
      S3.mirror(w.words, [text]);
      r.mods.forEach((m, i) => {
        const start = m.to, seq = [start], tn = /\d/.test(s[i]) ? turns : 0;
        if (start === s[i] && tn === 0) return;
        for (let k = 0; k < tn; k++) seq.push(POOL[(POOL.indexOf(start) + 1 + k * 3 + i) % POOL.length] || POOL[k % POOL.length]);
        if (seq[seq.length - 1] !== s[i] || seq.length === 1) seq.push(s[i]);
        const st = { k: 0 }, n = seq.length - 1;
        tl.to(st, { k: n, duration: dur * n, ease: 'none', onUpdate: () => {
          const j = Math.min(n - 1, Math.floor(st.k)), p = st.k >= n ? 1 : st.k - j;
          m.from = seq[j]; m.to = seq[j + 1]; m.s.p = st.k >= n ? 1 : p; }, onComplete: () => { m.from = m.to = s[i]; m.s.p = 1; } }, at + i * stg);
      });
    },
    top: () => { const p = new T.Vector3(0, postH + height + .3, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
    rowPoint: (ri, side = 'left') => { const r = rows[ri], p = new T.Vector3(side === 'left' ? -width / 2 : width / 2, r.y0 + ch / 2, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
    apply() {
      cs.set(Math.max(0, Math.min(1, 1 + root.position.y / .5)));
      if (!root.visible) return;
      rows.forEach(r => r.mods.forEach(m => m.render(r.desc)));
    } };
  rows.forEach((r, i) => hd.set(i, r.text));
  return w.add(hd);
} };
