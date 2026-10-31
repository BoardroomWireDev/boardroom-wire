/* ============================================================
   BOARDROOM WIRE · SPACEX Q3 · CH 3A ADDITIONS TO THE STAGE KIT (Ive, 28 Oct 2026). Read ../stage/KIT.md first.
   Objects the kit lacks, built in its style for chapter 3a (boards 70–74). Same materials, same light, nothing glows.
   Ask Ive before reusing outside ch 3a; if another chapter wants one, it moves into the kit.

   KIT.c3a.pool(w, [x, z], r, o)      a pool of light on the floor (a spot from above; soft edge, no shadow). o: { I, h, colour }
                                      returns {light, s:{I}} so a pool can come up with its object (s.I 0..1 of o.I)
   KIT.c3a.ghost(w, { len, wid, hgt, at, dash, gap, hatch })   a hall that is a plan: dashed gold edges, hatched faces;
                                      hatch: 'calm' or { ink, w }, a calmer hatch (p2); else pass 1's
                                      s.op 0..1 (draws in), s.dim 0..1 (gold → grey); same left-end origin as KIT.hall
   KIT.c3a.slab(w, { mark, w, h, d, at })               a customer: a dark standing slab with its mark (Wang's doors)
                                      s.x (world offset along x: it walks in), s.rise
   KIT.c3a.rack(w, { at, k, yaw })    one GB300 NVL72 rack, true proportion (0.6 × 2.24 × 1.07 m at k = 1): power shelves,
                                      compute trays (gold bezels), NVLink switch trays; s.gold 0..1 (its trim lights), s.rise
   KIT.c3a.meter(w, { at, k, yaw })   an electricity meter on a post: glass dome, a dial with no numbers, the needle, the disc
                                      s.run 0..1 (the needle), s.spin (the disc, radians), s.rise
   KIT.c3a.cord(w, points, { r })     a power cord through world points; s.draw 0..1 (the plug-in)
   KIT.c3a.retag(tag, lines)          repaint a KIT.tag card's face (the words are mirrored for `bw words` by the caller); lines.hatch: a forecast
   KIT.c3a.spinner(w, tag)            a tag that turns a full turn to show a new price: s.flip 0..1; s.at (0 → face A, 1 → face B)
   ============================================================ */
(() => {
  const T = THREE, B = (...a) => KIT.box(...a);
  const C3 = KIT.c3a = {};

  /* ---------- a mark tinted by its ink: a black-on-white logo (the Grok mark's slash is white inside a black square) keeps its
     knock-outs, where KIT.markTex (source-in) would flood every opaque pixel ---------- */
  C3.markInk = async (w, url, colour) => {
    const im = await S3.img(url), k = Math.max(1, 1600 / im.width);
    return S3.canvasTex(w.renderer, Math.round(im.width * k), Math.round(im.height * k), (g, W, H) => {
      g.drawImage(im, 0, 0, W, H); const d = g.getImageData(0, 0, W, H), p = d.data;
      const c = new THREE.Color(colour), R = c.r * 255, G = c.g * 255, Bc = c.b * 255;
      for (let i = 0; i < p.length; i += 4) { const lum = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114) / 255; p[i + 3] = p[i + 3] * (1 - lum); p[i] = R; p[i + 1] = G; p[i + 2] = Bc; }
      g.putImageData(d, 0, 0);
    });
  };

  /* ---------- a pool of light on the floor ---------- */
  C3.pool = (w, at, r, o = {}) => {
    const h = o.h ?? 16, I = o.I ?? 120;
    const L = new T.SpotLight(o.colour ?? 0xffeedb, I, 0, Math.atan(r / h) * 1.35, 1, 2);
    L.position.set(at[0], h, at[1]); L.target.position.set(at[0], 0, at[1]); L.castShadow = false;
    w.scene.add(L, L.target);
    const hd = { light: L, s: { I: o.on ?? 1 }, apply() { L.intensity = I * hd.s.I; L.visible = hd.s.I > .001; } };
    return w.add(hd);
  };

  /* ---------- a ghost hall: the plan, dashed ---------- */
  C3.ghost = (w, o = {}) => {
    const len = o.len ?? 8, wid = o.wid ?? 3.2, hgt = o.hgt ?? 1.3, t = o.t ?? Math.max(.03, hgt * .034), dash = o.dash ?? hgt * .22, gap = o.gap ?? hgt * .14;
    const mat = w.mat.goldLine.clone(); mat.transparent = true; mat.depthWrite = false;
    const gold = mat.color.clone(), grey = w.mat.greyLine.color.clone();
    const g = new T.Group();
    const seg = (ax, x0, y0, z0, L) => {          /* a dashed beam from (x0,y0,z0) along axis ax for length L */
      for (let u = 0; u < L - 1e-3; u += dash + gap) {
        const l = Math.min(dash, L - u), c = u + l / 2;
        const m = ax === 'x' ? B(l, t, t, mat, x0 + c, y0, z0) : ax === 'y' ? B(t, l, t, mat, x0, y0 + c, z0) : B(t, t, l, mat, x0, y0, z0 + c);
        m.castShadow = false; g.add(m);
      }
    };
    for (const y of [t / 2, hgt - t / 2]) for (const z of [-wid / 2 + t / 2, wid / 2 - t / 2]) seg('x', 0, y, z, len);
    for (const y of [t / 2, hgt - t / 2]) for (const x of [t / 2, len - t / 2]) seg('z', x, y, -wid / 2, wid);
    for (const x of [t / 2, len - t / 2]) for (const z of [-wid / 2 + t / 2, wid / 2 - t / 2]) seg('y', x, 0, z, hgt);
    const fp = KIT.hall.footprint(w, len, wid, S3.css('--gold'), { hatch: .16, edge: 0 }); g.add(fp);
    const fm = fp.children[0].material;
    /* a solid body with hatched faces (Wang's doors and monoliths: a hypothetical is a hatched slab), so a plan has mass */
    /* o.hatch (p2, 28 Oct): { ink, w } a calmer hatch for a frame with many plan halls; the default is pass 1's */
    if (o.hatch === 'calm') o = Object.assign({}, o, { hatch: { ink: '#7d7560', w: 5 } });   /* 'calm': thirteen plan halls read as mass, not stripes */
    const hk = o.hatch ? o.hatch.ink + '/' + o.hatch.w : 'base';
    C3._hatches = C3._hatches || {};
    if (!C3._hatches[hk]) C3._hatches[hk] = S3.canvasTex(w.renderer, 256, 256, (c, W, H) => {
      c.fillStyle = '#16161b'; c.fillRect(0, 0, W, H); c.strokeStyle = o.hatch ? o.hatch.ink : '#b9ad8a'; c.lineWidth = o.hatch ? o.hatch.w : 9;
      for (let x = -H; x < W + H; x += 48) { c.beginPath(); c.moveTo(x, H); c.lineTo(x + H, 0); c.stroke(); }
    });
    const ht = C3._hatches[hk].clone(); ht.needsUpdate = true; ht.wrapS = ht.wrapT = THREE.RepeatWrapping; ht.repeat.set(Math.max(1, len / .8), Math.max(1, hgt / .8));
    const bm = new THREE.MeshStandardMaterial({ map: ht, color: gold.clone().multiplyScalar(.55), roughness: .75, metalness: .1, envMapIntensity: .4, transparent: true });
    if (o.body !== false) { const body = new THREE.Mesh(new THREE.BoxGeometry(len - t * 2, hgt - t, wid - t * 2), bm); body.position.set(len / 2, (hgt - t) / 2, 0); body.castShadow = true; body.receiveShadow = true; g.add(body); }
    const bGold = bm.color.clone(), bGrey = grey.clone().multiplyScalar(.45);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, len, wid, hgt, s: { op: o.op ?? 1, dim: 0 },
      top: () => { const p = new T.Vector3(len / 2, hgt * 1.3, 0); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      apply() { mat.opacity = hd.s.op * .95 * (1 - hd.s.dim * .45); fm.opacity = hd.s.op * (1 - hd.s.dim * .5); root.visible = hd.s.op > .002; mat.color.copy(gold).lerp(grey, hd.s.dim); bm.opacity = hd.s.op; bm.depthWrite = hd.s.op > .98; bm.color.copy(bGold).lerp(bGrey, hd.s.dim); fm.color.setRGB(1, 1, 1).lerp(new T.Color(.55, .55, .55), hd.s.dim); } };
    return w.add(hd);
  };

  /* ---------- a customer: a standing slab with its mark ---------- */
  C3.slab = (w, o = {}) => {
    const W = o.w ?? 2.2, H = o.h ?? 3.4, D = o.d ?? .32, g = new T.Group();
    const body = S3.block(W, H, D, w.mat.graphite, .03); g.add(body);
    if (o.mark) {
      const a = o.mark.image.width / o.mark.image.height, mw = Math.min(W * (o.markW ?? .7), H * .5 * a), mh = mw / a;
      const d = KIT.decal(o.mark, mw, mh); d.position.set(0, o.markY ?? H * .62, D / 2 + .006); g.add(d);
    }
    const root = new T.Group(); root.add(g); const at = o.at || [0, 0, 0]; root.position.set(...at); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, w: W, h: H, s: { x: o.x ?? 0, rise: o.rise ?? 1 },
      top: () => { const p = new T.Vector3(0, H + .25, 0); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      foot: () => { const p = new T.Vector3(0, 0, D / 2 + .4); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      apply() { root.position.x = at[0] + hd.s.x; g.position.y = -H * 1.02 * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  };

  /* ---------- one GB300 NVL72 rack, true proportion ---------- */
  C3.rack = (w, o = {}) => {
    const k = o.k ?? 1, RW = .6 * k, RH = 2.24 * k, RD = 1.07 * k, g = new T.Group();
    const trim = w.mat.goldLine.clone(), gold = trim.color.clone(), grey = w.mat.greyLine.color.clone().multiplyScalar(.42);
    g.add(B(RW, RH, RD, w.mat.rubber, 0, RH / 2, 0));
    const fz = RD / 2 + .004 * k, inner = RW * .9, U = RH / 48;   /* 48 slots up the front, as Nvidia's elevation */
    /* top to bottom: 4 power shelves, 10 compute trays, 9 NVLink switch trays, 8 compute trays, 4 power shelves (one slot each,
       compute trays one slot, the rest as gaps and cable management) */
    const plan = [['p', 4], ['g', 1], ['c', 10], ['g', 1], ['s', 9], ['g', 1], ['c', 8], ['g', 1], ['p', 4]];
    let y = RH - U * 3.5;
    const trims = [];
    for (const [kind, n] of plan) for (let i = 0; i < n; i++) {
      const h = U * .82, yc = y - U / 2;
      if (kind === 'c') { g.add(B(inner, h, .02 * k, w.mat.graphite, 0, yc, fz)); const b = B(inner * .96, h * .16, .012 * k, trim, 0, yc + h * .3, fz + .012 * k); g.add(b); trims.push(b); }
      if (kind === 's') g.add(B(inner, h, .02 * k, w.mat.card, 0, yc, fz), B(inner * .9, h * .1, .01 * k, w.mat.greyLine, 0, yc, fz + .011 * k));
      if (kind === 'p') g.add(B(inner, h, .02 * k, w.mat.slab, 0, yc, fz), B(inner * .3, h * .5, .01 * k, w.mat.greyLine, -inner * .3, yc, fz + .011 * k));
      y -= U;
    }
    /* the frame: posts and a cap */
    const cap = B(RW * 1.01, .03 * k, .04 * k, trim, 0, RH - .015 * k, fz); g.add(cap); trims.push(cap);   /* a lip on the front edge, not a lid */
    for (const x of [-RW / 2 + .015 * k, RW / 2 - .015 * k]) g.add(B(.03 * k, RH, .03 * k, trim, x, RH / 2, fz - .01 * k));
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, w: RW, h: RH, d: RD, s: { gold: o.gold ?? 1, rise: o.rise ?? 1 },
      top: () => { const p = new T.Vector3(0, RH + .2 * k, 0); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      back: () => { const p = new T.Vector3(0, .12 * k, -RD / 2); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      apply() { trim.color.copy(grey).lerp(gold, hd.s.gold); g.position.y = -RH * 1.02 * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  };

  /* ---------- an electricity meter on a post ---------- */
  C3.meter = (w, o = {}) => {
    const k = o.k ?? 1, g = new T.Group(), PH = (o.post ?? 1.1) * k;
    g.add(B(.09 * k, PH, .09 * k, w.mat.graphite, 0, PH / 2, 0));                                   /* the post */
    const head = new T.Group(); head.position.set(0, PH + .26 * k, .02 * k); g.add(head);
    head.add(B(.5 * k, .62 * k, .08 * k, w.mat.card, 0, 0, -.02 * k));                              /* the mounting plate */
    const collar = KIT.cyl(.2 * k, .2 * k, .07 * k, w.mat.graphite, 56); collar.rotation.x = Math.PI / 2; collar.position.z = .05 * k; head.add(collar);
    const ring = new T.Mesh(new T.TorusGeometry(.2 * k, .012 * k, 10, 64), w.mat.goldLine); ring.position.z = .085 * k; head.add(ring);
    /* the dial: ticks on an arc, no numbers (the figure, when there is one, is a label beside it) */
    const face = S3.canvasTex(w.renderer, 512, 512, (c, W, H) => {
      c.fillStyle = '#ECE7DA'; c.beginPath(); c.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(20,20,26,.85)'; c.lineCap = 'round';
      for (let i = 0; i <= 20; i++) { const a = Math.PI * (1.15 + .7 * i / 20); const r0 = i % 5 ? 170 : 150; c.lineWidth = i % 5 ? 5 : 9; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + 40 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * 200, H / 2 + 40 + Math.sin(a) * 200); c.stroke(); }
      c.fillStyle = 'rgba(20,20,26,.9)'; c.fillRect(W * .2, H * .72, W * .6, 14);                 /* the disc's window */
    });
    const dial = new T.Mesh(new T.CircleGeometry(.185 * k, 64), new T.MeshStandardMaterial({ map: face, roughness: .7, envMapIntensity: .3 })); dial.position.z = .086 * k; head.add(dial);
    const needle = new T.Group(); needle.position.set(0, -.0145 * k, .092 * k); head.add(needle);    /* pivot at the dial's arc centre */
    const nm = B(.012 * k, .15 * k, .006 * k, w.mat.gold, 0, .075 * k, 0); nm.castShadow = false; needle.add(nm);
    const hub = KIT.cyl(.016 * k, .016 * k, .01 * k, w.mat.gold, 24); hub.rotation.x = Math.PI / 2; needle.add(hub);
    /* the disc, seen through its window: a thin rim with one dark mark that runs past */
    const disc = new T.Group(); disc.position.set(0, -.104 * k, .08 * k); head.add(disc);
    const dm = KIT.cyl(.11 * k, .11 * k, .006 * k, KIT.M({ color: S3.col(0xb9b6ae), metalness: .7, roughness: .35 }), 64); disc.add(dm);
    const mark = B(.012 * k, .008 * k, .03 * k, w.mat.rubber, 0, 0, .095 * k); disc.add(mark);
    const dome = new T.Mesh(new T.SphereGeometry(.205 * k, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .1, roughness: .05, metalness: .2, envMapIntensity: 1.2, depthWrite: false }));
    dome.rotation.x = Math.PI / 2; dome.position.z = .085 * k; dome.scale.set(1, .35, 1); head.add(dome);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const hd = { group: root, s: { run: 0, spin: 0, rise: o.rise ?? 1 },
      face: () => { const p = new T.Vector3(.3 * k, PH + .26 * k, .1 * k); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      inlet: () => { const p = new T.Vector3(0, PH - .05 * k, .0); root.updateMatrixWorld(true); root.localToWorld(p); return [p.x, p.y, p.z]; },
      apply() { needle.rotation.z = Math.PI * .35 - hd.s.run * Math.PI * .7; disc.rotation.y = hd.s.spin; g.position.y = -(PH + .6 * k) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; } };
    return w.add(hd);
  };

  /* ---------- a power cord ---------- */
  C3.cord = (w, pts, o = {}) => {
    const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p)), false, 'centripetal');
    const m = new T.Mesh(new T.TubeGeometry(curve, 200, o.r ?? .025, 10, false), o.mat || w.mat.rubber); m.castShadow = true; m.receiveShadow = true;
    w.scene.add(m);
    const total = m.geometry.index.count;
    const hd = { group: m, s: { draw: o.draw ?? 1 }, apply() { m.geometry.setDrawRange(0, Math.floor(total * hd.s.draw / 6) * 6); m.visible = hd.s.draw > .001; } };
    return w.add(hd);
  };

  /* ---------- the tag, re-printed ---------- */
  C3.card = (tag) => tag.group.children[0].children.find(c => c.type === 'Group').children[0];
  C3.retag = (tag, lines) => {
    const card = C3.card(tag), tex = card.material[0].map, cv = tex.image, c = cv.getContext('2d'), cw = cv.width, ch = cv.height;
    c.fillStyle = '#F2EEE4'; c.fillRect(0, 0, cw, ch);
    c.save(); c.strokeStyle = 'rgba(10,10,15,.18)'; c.lineWidth = 4; c.setLineDash([14, 10]); c.strokeRect(cw * .07, ch * .2, cw * .86, ch * .74); c.restore();
    if (lines && lines.hatch) {   /* p2: a forecast's price is hatched, like every plan on the stage (faces[i].hatch = true) */
      c.save(); c.beginPath(); c.rect(cw * .07, ch * .2, cw * .86, ch * .74); c.clip(); c.strokeStyle = 'rgba(10,10,15,.2)'; c.lineWidth = 7;
      for (let x = -ch; x < cw + ch; x += 34) { c.beginPath(); c.moveTo(x, ch); c.lineTo(x + ch, 0); c.stroke(); } c.restore();
    }
    (lines || []).forEach(l => {
      c.fillStyle = l.ink || S3.css('--ink'); c.font = `${l.weight || 700} ${l.px || 200}px ${l.family || '"IBM Plex Mono"'}`;
      c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText(l.text, cw / 2, (l.y ?? .6) * ch);
    });
    tex.needsUpdate = true;
  };
  /* a blank back on the card (its back face would otherwise print the front's words mirrored) */
  C3.blankBack = (w, tag) => {
    const card = C3.card(tag), sh = card.geometry.parameters.shapes;
    const back = new T.Mesh(new T.ShapeGeometry(sh), KIT.M({ color: S3.col(0xEAE5D9), roughness: .88 }));
    back.rotation.y = Math.PI; back.position.z = -.002; card.add(back);
  };
  /* a full turn on the string; the face is re-printed while its back is to the camera */
  C3.spinner = (w, tag, faces) => {
    C3.blankBack(w, tag);
    let shown = -1;
    const hd = { s: { flip: 0, face: 0 }, apply() {
      tag.group.rotation.y = (tag._yaw0 ?? 0) + hd.s.flip * Math.PI * 2;
      const f = Math.round(hd.s.face); if (f !== shown && faces[f]) { C3.retag(tag, faces[f]); shown = f; }
    } };
    tag._yaw0 = tag.group.rotation.y;
    return w.add(hd);
  };
})();
