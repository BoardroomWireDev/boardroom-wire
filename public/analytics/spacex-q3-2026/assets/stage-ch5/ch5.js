/* ============================================================
   BOARDROOM WIRE · SPACEX Q3 · CH 5 OBJECTS (Ive, 28 Oct 2026), built in the kit's style for 85-guppies.html.
   The kit (assets/stage/KIT.md) lacks four things this chapter needs; they live here, never in the kit.

   KIT5.field(w, {n, cols, len, wid, hgt, gx, gz, at, keep:[i…]})
     The 200 neoclouds as small grey halls whose windows are lit: a warm flat pane on the front face (never a glow).
     s.dark 0..1: the lights go out hall by hall, in a fixed scattered order; the `keep` halls stay lit (some make it through).
     point(i), width, depth.
   KIT5.card(w, url, [sx, sy, sw, sh], {width, at, z, paint})
     A capture cropped to the post (no browser chrome), as a paper card pinned upright to the back wall. s.op, s.y (lands from
     above). card.pen(u0, u1, v) a gold underline; card.ring(uc, vc, ru, rv) a gold ring; both draw with p.s.p 0..1 and mark
     only what the capture prints.
   KIT5.chart(w, {x0, x1, y0, y1, z, days, lo, hi, series:[{pts:[[day, pct]], ink, width}], call, weekend:[d…]})
     Share prices as lines painted on the back wall, rebased to the first close (0%). s.axis, s.draw (days drawn), s.call,
     s.wk, s.op. X(day), Y(pct) give world points for the labels.
   KIT5.outline(w, {len, wid, hgt, at, mat, foot})
     A hall drawn in line only: contracted or planned capacity. foot: a hatched footprint under it (a plan). s.draw 0..1.
   ============================================================ */
const KIT5 = window.KIT5 || {};
window.KIT5 = KIT5;
(() => {
  const T = THREE;
  const hash = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

  /* ---------- the field of neoclouds, lit ---------- */
  KIT5.field = (w, o = {}) => {
    const n = o.n ?? 200, cols = o.cols ?? 20, len = o.len ?? 1, wid = o.wid ?? .6, hgt = o.hgt ?? .42, gx = o.gx ?? .34, gz = o.gz ?? .55, at = o.at || [0, 0, 0];
    const rows = Math.ceil(n / cols), width = cols * len + (cols - 1) * gx, depth = rows * wid + (rows - 1) * gz;
    const bodyM = KIT.M({ color: S3.col(S3.MAT.card), roughness: .62, metalness: .08, envMapIntensity: .5 });
    const winLit = KIT.M({ color: S3.col(KIT.STOCK.room), roughness: .9, emissive: S3.col(KIT.STOCK.room), emissiveIntensity: .32, envMapIntensity: .2 });
    const winOff = KIT.M({ color: S3.col(KIT.STOCK.glass), roughness: .2, metalness: .5, envMapIntensity: .9 });
    const mk = (geo, mat, shadow) => { const m = new T.InstancedMesh(geo, mat, n); m.castShadow = shadow; m.receiveShadow = true; w.scene.add(m); return m; };
    const body = mk(new T.BoxGeometry(len, hgt, wid), bodyM, true);
    const roof = mk(new T.BoxGeometry(len * 1.03, hgt * .09, wid * 1.03), w.mat.greyLine, true);
    const unit = mk(new T.BoxGeometry(len * .2, hgt * .2, wid * .42), bodyM, true);            /* one cooler on the roof */
    const lit = mk(new T.BoxGeometry(len * .8, hgt * .24, .012), winLit, false);
    const off = mk(new T.BoxGeometry(len * .8, hgt * .24, .012), winOff, false);
    const skyGeo = new T.BoxGeometry(len * .62, .012, wid * .56);                                 /* a lit roof light, seen from above */
    const skyLit = mk(skyGeo, winLit, false), skyOff = mk(skyGeo, winOff, false);
    const keep = new Set(o.keep || []), pos = [], order = [];
    const m4 = new T.Matrix4(), q = new T.Quaternion(), one = new T.Vector3(1, 1, 1), zero = new T.Vector3(0, 0, 0), v = new T.Vector3();
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      const x = at[0] - width / 2 + len / 2 + c * (len + gx), z = at[2] + depth / 2 - wid / 2 - r * (wid + gz);
      pos.push([x, z]);
      order.push(.06 + .86 * hash(i, 3) * .8 + .14 * (r / Math.max(1, rows - 1)));   /* scattered, a little back to front */
      v.set(x, at[1] + hgt / 2, z); m4.compose(v, q, one); body.setMatrixAt(i, m4);
      v.set(x, at[1] + hgt + hgt * .045, z); m4.compose(v, q, one); roof.setMatrixAt(i, m4);
      v.set(x + len * (hash(i, 7) > .5 ? .39 : -.39), at[1] + hgt * 1.19, z); m4.compose(v, q, one); unit.setMatrixAt(i, m4);
    }
    let last = -1;
    const hd = { width, depth, keep, s: { dark: o.dark ?? 0 },
      point: (i) => [pos[i][0], at[1] + hgt * 1.4, pos[i][1]],
      isLit: (i) => keep.has(i) || hd.s.dark < order[i],
      apply() {
        const d = Math.round(hd.s.dark * 2000); if (d === last) return; last = d;
        for (let i = 0; i < n; i++) {
          const on = hd.isLit(i);
          v.set(pos[i][0], at[1] + hgt * .56, pos[i][1] + wid / 2 + .007);
          m4.compose(v, q, on ? one : zero); lit.setMatrixAt(i, m4);
          m4.compose(v, q, on ? zero : one); off.setMatrixAt(i, m4);
          v.set(pos[i][0], at[1] + hgt * 1.09 + .007, pos[i][1]);
          m4.compose(v, q, on ? one : zero); skyLit.setMatrixAt(i, m4);
          m4.compose(v, q, on ? zero : one); skyOff.setMatrixAt(i, m4);
        }
        lit.instanceMatrix.needsUpdate = off.instanceMatrix.needsUpdate = skyLit.instanceMatrix.needsUpdate = skyOff.instanceMatrix.needsUpdate = true;
      } };
    return w.add(hd);
  };

  /* ---------- a capture as a card pinned upright to the wall ---------- */
  function ring(sheetMesh, uc, vc, ru, rv, o = {}) {
    const { w, h, zf } = sheetMesh.userData, N = 120, width = o.width || .03, seed = o.seed || 1;
    const g = new T.BufferGeometry(), pos = new Float32Array((N + 1) * 2 * 3), idx = [];
    for (let i = 0; i < N; i++) { const a = 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const cx = -w / 2 + uc * w, cy = h / 2 - vc * h, rx = ru * w, ry = rv * h, a0 = o.a0 ?? 2.5, sweep = Math.PI * 2 * 1.1;
    const m = new T.Mesh(g, o.material); m.renderOrder = 3; sheetMesh.add(m);
    m.set = (p) => {
      p = S3.clamp(p); m.visible = p > .001;
      for (let i = 0; i <= N; i++) {
        const s = i / N, a = a0 - sweep * p * s;                                 /* clockwise, like a hand */
        const k = 1 + .045 * Math.sin(s * 5.3 + seed) + .07 * s;                 /* the second lap rides a little wide */
        const taper = Math.min(1, s / .05, (1 - s) / .08 + .3) * .5 + .5, hw = width / 2 * taper;
        for (const [j, dd] of [[0, hw], [1, -hw]]) {
          const x = cx + Math.cos(a) * (rx * k + dd), y = cy + Math.sin(a) * (ry * k + dd), q = (2 * i + j) * 3;
          pos[q] = x; pos[q + 1] = y; pos[q + 2] = zf(x, y) + .003;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    };
    m.set(0); return m;
  }

  KIT5.card = async (w, url, crop, o = {}) => {
    const im = await S3.img(url), [sx, sy, sw, sh] = crop, k = o.k || 2;
    const tex = S3.canvasTex(w.renderer, sw * k, sh * k, (g, W, H) => {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(im, sx, sy, sw, sh, 0, 0, W, H);
      if (o.paint) o.paint(g, k);
    });
    const W = o.width || 6, H = W * sh / sw, pad = o.pad ?? .14;
    const g = new T.Group();
    const card = S3.sheet(tex, W, H, { curl: .0015, lift: .004, cup: .001 });
    const base = S3.sheet(null, W + pad * 2, H + pad * 2, { curl: .0015, lift: .002, cup: .001 });
    base.material = S3.mat.paper(null, {});
    [card, base].forEach(m => { m.material.transparent = true; });
    card.position.y = .004; g.add(base, card);
    g.rotation.x = Math.PI / 2;                                                    /* upright, its face to +z */
    const at = o.at || [0, 0, 0]; g.position.set(...at); w.scene.add(g);
    const ink = () => S3.mat.ink({ color: S3.tok('--gold') });
    const marks = [];
    const hd = { group: g, card, w: W, h: H, s: { op: o.op ?? 0, y: 0 },
      /* a world point on the card, from its own 0..1 coordinates */
      at: (u, v) => [at[0] - W / 2 + u * W, at[1] + hd.s.y + H / 2 - v * H, at[2] + .02],
      pen(u0, u1, v, po = {}) { const m = S3.pen(card, u0, u1, v, Object.assign({ width: po.width || .045, material: ink() }, po)); const p = { m, s: { p: 0 } }; marks.push(p); return p; },
      ring(uc, vc, ru, rv, po = {}) { const m = ring(card, uc, vc, ru, rv, Object.assign({ width: po.width || .04, material: ink() }, po)); const p = { m, s: { p: 0 } }; marks.push(p); return p; },
      apply() {
        const op = hd.s.op; g.visible = op > .002;
        card.material.opacity = base.material.opacity = op;
        g.position.y = at[1] + hd.s.y;
        marks.forEach(p => { p.m.set(p.s.p); p.m.material.transparent = true; p.m.material.opacity = op; });
      } };
    return w.add(hd);
  };

  /* ---------- share prices painted on the back wall ---------- */
  KIT5.chart = (w, o) => {
    const { x0, x1, y0, y1, z, days, lo, hi } = o, PX = 150;
    const CW = Math.round((x1 - x0) * PX), CH = Math.round((y1 - y0) * PX);
    const c = document.createElement('canvas'); c.width = CW; c.height = CH;
    const g = c.getContext('2d'), tex = new T.CanvasTexture(c);
    tex.encoding = T.sRGBEncoding; tex.anisotropy = w.renderer.capabilities.getMaxAnisotropy();
    const mesh = new T.Mesh(new T.PlaneGeometry(x1 - x0, y1 - y0), new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: .85, metalness: 0, envMapIntensity: .2 }));
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); mesh.renderOrder = 1; w.scene.add(mesh);
    const top = o.top ?? .06, bot = o.bot ?? .1;                                      /* plot area inside the panel, as fractions */
    const px = (d) => d / days * CW, py = (p) => CH * top + (hi - p) / (hi - lo) * CH * (1 - top - bot);
    const X = (d) => x0 + d / days * (x1 - x0), Y = (p) => y1 - (py(p) / CH) * (y1 - y0);
    const axisY = CH * (1 - bot * .5);
    let key = '';
    const hd = { mesh, X, Y, axisWorldY: y1 - (axisY / CH) * (y1 - y0), s: { axis: 0, draw: 0, call: 0, wk: 0, op: 1 },
      apply() {
        const s = hd.s, k = [s.axis, s.draw, s.call, s.wk, s.op].map(x => x.toFixed(4)).join();
        mesh.visible = s.op > .002; mesh.material.opacity = s.op;
        if (k === key) return; key = k;
        g.clearRect(0, 0, CW, CH); g.lineCap = 'round'; g.lineJoin = 'round';
        /* the axis: a date line from the first close to the weekend */
        g.strokeStyle = S3.css('--grey-bright'); g.globalAlpha = .7; g.lineWidth = 4;
        g.beginPath(); g.moveTo(0, axisY); g.lineTo(px(days) * s.axis, axisY); g.stroke();
        for (let d = 0; d <= days * s.axis; d++) { g.beginPath(); g.moveTo(px(d), axisY); g.lineTo(px(d), axisY - (d % 7 === 0 ? 22 : 12)); g.stroke(); }
        /* where the first close sits: 0%, dashed and faint */
        if (s.axis > 0) { g.setLineDash([18, 16]); g.globalAlpha = .38; g.lineWidth = 3; g.beginPath(); g.moveTo(0, py(0)); g.lineTo(px(days) * s.axis, py(0)); g.stroke(); g.setLineDash([]); }
        /* the call: a gold rule at its date */
        if (s.call > 0 && o.call != null) {
          g.globalAlpha = 1; g.strokeStyle = S3.css('--gold'); g.lineWidth = 5; g.setLineDash([16, 12]);
          g.beginPath(); g.moveTo(px(o.call), axisY); g.lineTo(px(o.call), axisY - (axisY - py(hi) - 8) * s.call); g.stroke(); g.setLineDash([]);
        }
        /* the weekend: two gold notches on the open axis */
        if (s.wk > 0) (o.weekend || []).forEach(d => { g.globalAlpha = s.wk; g.strokeStyle = S3.css('--gold'); g.lineWidth = 7; g.beginPath(); g.moveTo(px(d), axisY + 8); g.lineTo(px(d), axisY - 40); g.stroke(); });
        /* the lines, drawn to s.draw days (between closes the line is straight; no day is invented) */
        o.series.forEach(se => {
          const pts = se.pts.filter(p => p[0] <= s.draw); if (!pts.length || s.draw <= 0) return;
          const nx = se.pts[pts.length]; let end = null;
          if (nx) { const a = pts[pts.length - 1], u = (s.draw - a[0]) / (nx[0] - a[0]); end = [s.draw, a[1] + (nx[1] - a[1]) * u]; }
          g.globalAlpha = 1; g.strokeStyle = se.ink; g.lineWidth = se.width || 9;
          g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(px(p[0]), py(p[1])) : g.moveTo(px(p[0]), py(p[1]))); if (end) g.lineTo(px(end[0]), py(end[1])); g.stroke();
          const tip = end || pts[pts.length - 1]; g.fillStyle = se.ink; g.beginPath(); g.arc(px(tip[0]), py(tip[1]), (se.width || 9) * 1.15, 0, Math.PI * 2); g.fill();
        });
        g.globalAlpha = 1; tex.needsUpdate = true;
      } };
    return w.add(hd);
  };

  /* ---------- a mark printed dark on a coloured badge (Nebius): keep only its dark ink, tinted to one colour ---------- */
  KIT5.inkMark = async (w, url, colour, o = {}) => {
    const im = await S3.img(url), k = Math.max(1, 1600 / im.width), W = Math.round(im.width * k), H = Math.round(im.height * k);
    return S3.canvasTex(w.renderer, W, H, (g) => {
      g.drawImage(im, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H), p = d.data, cut = o.cut ?? 110;
      for (let i = 0; i < p.length; i += 4) { const L = .3 * p[i] + .59 * p[i + 1] + .11 * p[i + 2]; p[i + 3] = L < cut ? p[i + 3] : 0; }
      g.putImageData(d, 0, 0);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, W, H);
    });
  };

  /* ---------- diagonal hatch, one tile (repeat it to the face's size) ---------- */
  KIT5.hatchTex = (w, colour) => {
    const t = S3.canvasTex(w.renderer, 128, 128, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.strokeStyle = colour; g.lineWidth = 9; g.lineCap = 'square';
      for (let x = -W; x <= W * 2; x += W / 2) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };

  /* ---------- a hall in line only (contracted or planned) ---------- */
  KIT5.outline = (w, o = {}) => {
    const len = o.len ?? 4, wid = o.wid ?? 2, hgt = o.hgt ?? 1.2, t = o.t ?? .03, at = o.at || [0, 0, 0];
    const root = new T.Group(); root.position.set(...at);
    const box = KIT.lineBox(len, hgt, wid, t, o.mat || w.mat.goldLine); box.position.set(len / 2, 0, 0); root.add(box);
    let foot = null;
    if (o.foot) { foot = KIT.hall.footprint(w, len, wid, o.foot, { hatch: .34, edge: .8 }); root.add(foot); }
    /* o.hatch (a colour): the hall as a dark volume with hatched faces, Wang's plan monolith; s.hatch fades it in */
    let shell = null; const hm = [];
    if (o.hatch) {
      shell = new T.Group(); shell.position.set(len / 2, 0, 0);
      const bodyM = KIT.M({ color: S3.col(S3.MAT.graphite), roughness: .7, envMapIntensity: .4, transparent: true, opacity: 0 });
      const body = new T.Mesh(new T.BoxGeometry(len * .995, hgt * .995, wid * .995), bodyM); body.position.y = hgt / 2; body.castShadow = body.receiveShadow = true; shell.add(body);
      const face = (fw, fh, pos, rot) => {
        const tx = KIT5.hatchTex(w, o.hatch); tx.repeat.set(fw / .42, fh / .42);
        const m = new T.MeshStandardMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, roughness: .6, metalness: .3, envMapIntensity: .6, polygonOffset: true, polygonOffsetFactor: -2 });
        const p = new T.Mesh(new T.PlaneGeometry(fw, fh), m); p.position.set(...pos); p.rotation.set(...rot); p.renderOrder = 2; shell.add(p); hm.push(m);
      };
      face(len, hgt, [0, hgt / 2, wid / 2 + .004], [0, 0, 0]);
      face(len, wid, [0, hgt + .004, 0], [-Math.PI / 2, 0, 0]);
      face(wid, hgt, [len / 2 + .004, hgt / 2, 0], [0, Math.PI / 2, 0]);
      face(wid, hgt, [-len / 2 - .004, hgt / 2, 0], [0, -Math.PI / 2, 0]);
      hm.push(bodyM); root.add(shell);
    }
    w.scene.add(root);
    const hd = { group: root, len, wid, hgt, s: { draw: o.draw ?? 1, foot: o.foot ? 1 : 0, hatch: 0 },
      top: () => [at[0] + len / 2, at[1] + hgt * 1.3, at[2]],
      apply() {
        box.visible = hd.s.draw > .002; box.scale.y = Math.max(.002, hd.s.draw);
        if (foot) { foot.visible = hd.s.foot > .002; foot.children[0].material.opacity = hd.s.foot; }
        if (shell) { shell.visible = hd.s.hatch > .002; shell.scale.y = Math.max(.002, hd.s.draw); hm.forEach((m, i) => { m.opacity = hd.s.hatch * (i === hm.length - 1 ? .92 : .85); m.depthWrite = i === hm.length - 1 && hd.s.hatch > .98; }); }
      } };
    return w.add(hd);
  };
})();
