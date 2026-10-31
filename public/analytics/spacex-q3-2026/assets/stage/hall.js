/* KIT.hall — the gigawatt. One data hall = one gigawatt of compute, the unit the whole chapter counts in. A long low building
   drawn in gold line (its edges, the mullions of its long face, a roof of dry coolers), a roll-up door on its long face, and a
   cutaway that lifts the roof and lowers the front wall to show the rows of racks inside.

   const h = KIT.hall.create(w, { len: 8, wid: 3.2, hgt: 1.3, at: [x, 0, z], line: 'gold' | 'grey', door: true, mark: tex, markH: .26 });
     its left end sits at x; it runs along +x. `len` can be a fraction of the full hall (0.7 of a gigawatt = len × 0.7).
   h.s.rise 0..1   rises out of the floor        h.s.cut 0..1   the cutaway (roof up, front wall down, racks visible)
   h.s.dim 0..1    0 = its own colour, 1 = sunk to grey (a past or a neighbour)
   h.len, h.wid, h.hgt, h.top() world point over its middle (for a label)

   const r = KIT.hall.row(w, gw, { at, len, gap, line, plan, planColour, ...hall opts });
     gw halls end to end along +x, the last one cut to its fraction (1.7 → one hall and 0.7 of one). plan: a larger gw drawn as
     a hatched, dashed footprint beyond the built ones (a plan is never solid). r.halls, r.width, r.planWidth, r.s.rise (staggered),
     r.s.plan 0..1 (the footprint draws), r.top() a point over the row. gw comes from a data.js key: KIT.hall.row(w, BW.fig(k).v, …)

   KIT.hall.footprint(w, len, wid, colour) the hatched plan on the floor, on its own (left end at x = 0). */
KIT.hall = {
  create(w, o = {}) {
    const T = THREE, B = KIT.box, len = o.len ?? 8, wid = o.wid ?? 3.2, hgt = o.hgt ?? 1.3, t = o.t ?? Math.max(.025, hgt * .038);
    const grey = o.line === 'grey', line = (grey ? w.mat.greyLine : w.mat.goldLine).clone(), body = o.body || (grey ? w.mat.card : w.mat.graphite);
    const g = new T.Group(), roof = new T.Group(), front = new T.Group(), inside = new T.Group();
    /* the shell: floor slab, back and end walls stay; the front wall and the roof move for the cutaway */
    g.add(B(len, .04, wid, body, len / 2, .02, 0));
    g.add(B(len, hgt, .04, body, len / 2, hgt / 2, -wid / 2 + .02));
    g.add(B(.04, hgt, wid, body, .02, hgt / 2, 0), B(.04, hgt, wid, body, len - .02, hgt / 2, 0));
    front.add(B(len, hgt, .04, body, len / 2, hgt / 2, 0));
    const n = Math.max(1, Math.round(len / (hgt * .4)));
    for (let i = 1; i < n; i++) front.add(B(t * .55, hgt - t, t * .6, line, i * len / n, hgt / 2, .03));
    front.add(B(len, t * .55, t * .6, line, len / 2, hgt * .4, .03));
    if (o.door !== false && len > hgt * 1.4) {                                    /* a roll-up door, slatted, in a gold frame */
      const dw = hgt * .62, dh = hgt * .66, dx = Math.min(len - dw, hgt * .9);
      front.add(B(dw, dh, .02, w.mat.card, dx, dh / 2, .045));
      for (let y = dh * .1; y < dh; y += dh * .1) front.add(B(dw * .96, .006, .012, w.mat.greyLine, dx, y, .06));
      const df = KIT.lineBox(dw + t, dh + t * .5, .05, t * .6, line); df.position.set(dx, 0, .045); front.add(df);
    }
    front.position.z = wid / 2 - .02; g.add(front);
    if (o.mark) { const a = o.mark.image.width / o.mark.image.height, mh = Math.min(hgt * (o.markH ?? .26), (len * .55) / a), d = KIT.decal(o.mark, mh * a, mh); d.position.set(len - mh * a / 2 - hgt * .35, hgt * .72, .07); front.add(d); }
    /* the roof: a slab, two rows of dry coolers with their fans, the top edges of the frame */
    roof.add(B(len, .05, wid, body, len / 2, hgt - .025, 0));
    if (o.coolers !== false) {
      const cw = Math.min(.78, hgt * .6), cd = wid * .28, ch = hgt * .12, step = cw * 1.28;
      for (let x = cw * .8; x + cw / 2 <= len - cw * .3; x += step) for (const z of [-wid * .22, wid * .22]) {
        roof.add(B(cw, ch, cd, w.mat.card, x, hgt + ch / 2, z));
        for (const dz of [-cd * .24, cd * .24]) { const f = KIT.cyl(cw * .22, cw * .22, .015, w.mat.rubber, 28); f.position.set(x, hgt + ch + .008, z + dz); roof.add(f); }
        const e = KIT.lineBox(cw, ch, cd, t * .4, line); e.position.set(x, hgt, z); roof.add(e);
      }
    }
    for (const z of [-wid / 2 + t / 2, wid / 2 - t / 2]) roof.add(B(len, t, t, line, len / 2, hgt - t / 2, z));
    for (const x of [t / 2, len - t / 2]) roof.add(B(t, t, wid, line, x, hgt - t / 2, 0));
    g.add(roof);
    /* the frame's floor edges and posts */
    for (const z of [-wid / 2 + t / 2, wid / 2 - t / 2]) g.add(B(len, t, t, line, len / 2, t / 2, z));
    for (const x of [t / 2, len - t / 2]) { g.add(B(t, t, wid, line, x, t / 2, 0)); for (const z of [-wid / 2 + t / 2, wid / 2 - t / 2]) g.add(B(t, hgt, t, line, x, hgt / 2, z)); }
    /* inside: rows of racks (black, gold-capped), seen only in the cutaway */
    const rw = hgt * .26, rh = hgt * .72, rd = hgt * .4, rows = Math.max(2, Math.floor((wid - .4) / (rd * 2.2)));
    for (let r = 0; r < rows; r++) for (let x = rw; x + rw / 2 < len - .1; x += rw * 1.08) {
      const z = -wid / 2 + .3 + rd / 2 + r * (wid - .6 - rd) / Math.max(1, rows - 1);
      inside.add(B(rw, rh, rd, w.mat.rubber, x, rh / 2, z));
      inside.add(B(rw, .012, rd, line, x, rh + .006, z));
    }
    inside.visible = false; g.add(inside);
    const root = new T.Group(); root.add(g); root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const lineC = line.color.clone(), bodyC = body.color.clone(), dimC = w.mat.greyLine.color.clone();
    const hd = { group: root, len, wid, hgt, s: { rise: o.rise ?? 1, cut: 0, dim: 0 },
      top: () => { const p = new T.Vector3(len / 2, hgt + hgt * .3, 0); (root.updateMatrixWorld(true), root.localToWorld(p)); return [p.x, p.y, p.z]; },
      apply() {
        const s = hd.s;
        g.position.y = -(hgt * 1.25) * (1 - s.rise); root.visible = s.rise > .001;
        roof.position.y = s.cut * hgt * 1.3;
        front.scale.y = Math.max(.001, 1 - s.cut); front.visible = s.cut < .999;
        inside.visible = s.cut > .001;
        if (!grey) line.color.copy(lineC).lerp(dimC, s.dim);
      } };
    return w.add(hd);
  },
  footprint(w, len, wid, colour, o = {}) {
    const T = THREE, PX = 140;
    const tex = S3.canvasTex(w.renderer, Math.round(len * PX), Math.round(wid * PX), (g, W, H) => {
      g.clearRect(0, 0, W, H); g.strokeStyle = colour; g.globalAlpha = o.hatch ?? .42; g.lineWidth = 5;
      for (let x = -H; x < W; x += 30) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + H, 0); g.stroke(); }
      g.globalAlpha = o.edge ?? .95; g.lineWidth = 8; g.setLineDash([30, 20]); g.strokeRect(4, 4, W - 8, H - 8);
    });
    const m = new T.Mesh(new T.PlaneGeometry(len, wid), new T.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: .6, metalness: .2, envMapIntensity: .5, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(len / 2, .008, 0); m.renderOrder = 1;
    const g = new T.Group(); g.add(m); return g;
  },
  row(w, gw, o = {}) {
    const T = THREE, len = o.len ?? 8, gap = o.gap ?? .5, at = o.at || [0, 0, 0], full = Math.floor(gw + 1e-9), frac = gw - full, halls = [];
    const mk = (i, l) => KIT.hall.create(w, Object.assign({}, o, { len: l, at: [at[0] + i * (len + gap), at[1], at[2]] }));
    for (let i = 0; i < full; i++) halls.push(mk(i, len));
    if (frac > .01) halls.push(mk(full, len * frac));
    const width = full * (len + gap) + (frac > .01 ? len * frac : -gap);
    let plan = null, planWidth = width;
    if (o.plan && o.plan > gw) {
      const pg = new T.Group(), colour = o.planColour || S3.css('--gold'), wid = o.wid ?? 3.2;
      const x0 = at[0] + full * (len + gap) + len * frac, x1 = at[0] + Math.floor(o.plan) * (len + gap) + len * (o.plan % 1);
      /* the unbuilt rest of the partial hall, then any further halls, as footprints */
      let x = x0; const ends = [];
      if (frac > .01) { ends.push([x, at[0] + full * (len + gap) + len]); x = at[0] + (full + 1) * (len + gap); }
      while (x < x1 - .01) { const e = Math.min(x + len, x1); ends.push([x, e]); x += len + gap; }
      ends.forEach(([a, b]) => { const f = KIT.hall.footprint(w, b - a, wid, colour); f.position.set(a, 0, at[2]); pg.add(f); });
      planWidth = x1 - at[0]; w.scene.add(pg); plan = pg;
    }
    const hd = { halls, width, planWidth, plan, s: { rise: o.rise ?? 1, plan: o.plan ? 1 : 0 },
      top: () => [at[0] + width / 2, at[1] + (o.hgt ?? 1.3) * 1.3, at[2]],
      apply() { const n = halls.length; halls.forEach((h, i) => { h.s.rise = Math.min(1, Math.max(0, hd.s.rise * (n + 1) - i)); });
        if (plan) { plan.visible = hd.s.plan > .001; plan.children.forEach(c => { c.children[0].material.opacity = hd.s.plan; }); } } };
    return w.add(hd);
  }
};
