/* KIT v2 · KIT.neocloud and KIT.dots, fields of many (Ive, 28 Oct 2026, the polish pass). Same API as v1; instanced, so 200 halls
   or 100,000 people cost a handful of draws.

   const f = KIT.neocloud.field(w, { n: 200, cols: 20, at: [x, 0, z], len: .9, wid: .45, hgt: .2, gap: .25, gold: [i, …], red: [i, …] });
     each hall is a miniature of KIT.hall v2 (the same 14 m building, scaled): insulated cladding with panel seams, a reveal and
     a plinth, an intake louvre bank and two dock doors under a canopy on its long face, a parapet with a coping (gold for the gold
     picks, red for the red picks, bright grey for the rest), a membrane roof with seams and two rows of three dry coolers (fans
     drawn on their tops, coil on their sides) and a stair penthouse. The body of a gold pick is a shade darker (as v1's graphite).
     Four InstancedMeshes (body, coping, roof, coolers) of n each: one shared matrix per hall, shared cached textures.
     The coping is the only one with metalness > .3 and a per-instance colour (a board may recolour it: 92-the-city).
   f.s.rise 0..1   the rows rise from the front, staggered    f.s.fade 0..1  the grey ones sink toward the floor's ink
   f.width, f.depth, f.point(i) the world point over hall i (for a label)

   const d = KIT.dots.field(w, { n: 3600, cols: 60, pitch: .2, r: .07, at: [x, 0, z], colour: (i) => '#F5F1E5' | '#D4AF37' | … });
     people as dots on the floor: each a crisp, slightly domed disc with a soft contact shade on the floor; one dot is the unit the
     page names (e.g. a million people: the label says so, from data.js).
   d.s.fill 0..1   dots land in reading order (front-left first)   d.width, d.depth, d.mesh */
(() => {
  const T = THREE, cache = {};
  const once = (k, f) => cache[k] || (cache[k] = f());
  const M4 = () => new T.Matrix4();
  const std = (o) => new T.MeshStandardMaterial(Object.assign({ color: 0xffffff, roughness: .74, metalness: .08, envMapIntensity: .5 }, o));
  /* the line language (as hall.js v2 final): near-black bodies, the detail a cream hairline painted into the texture, the same texture
     as an emissive map so the line holds in shadow. Lines are drawn heavy because a hall is small on screen (the texture is minified
     20x or more at board distance): outlines about 8 px, secondary lines 4 px at 2048 wide. */
  const cr = (a) => `rgba(236,230,214,${a})`;
  const ink = (map, o = {}) => std(Object.assign({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .16, roughness: .8, metalness: .05, envMapIntensity: .25 }, o));
  /* the cladding of a hall's long face: bays, a parapet band, a reveal, a plinth, the louvre bank and two dock doors under a canopy */
  const cladTex = (w) => once('clad', () => S3.canvasTex(w.renderer, 2048, 512, (g, W, H) => {
    g.fillStyle = '#101114'; g.fillRect(0, 0, W, H);
    const bay = W / 14, hl = (y, a, lw) => { g.fillStyle = cr(a); g.fillRect(0, y - lw / 2, W, lw); };
    g.fillStyle = cr(.3); for (let x = bay; x < W; x += bay) g.fillRect(x - 2, 0, 4, H);              /* the panel seams */
    hl(H * .12, .9, 8); hl(H * .56, .5, 5); hl(H * .92, .9, 8);                                          /* parapet, reveal, plinth */
    const x0 = W * .52, x1 = W * .84, y0 = H * .3, y1 = H * .86;                                          /* the louvre bank */
    g.strokeStyle = cr(.95); g.lineWidth = 9; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = cr(.4); for (let y = y0 + 16; y < y1 - 8; y += 22) g.fillRect(x0 + 10, y, x1 - x0 - 20, 5);
    for (let i = 0; i < 2; i++) { const dx = W * (.07 + i * .065), dw = W * .05, dy = H * .55, dh = H * .35; g.strokeStyle = cr(.95); g.lineWidth = 8; g.strokeRect(dx, dy, dw, dh); }
    g.fillStyle = cr(.9); g.fillRect(W * .055, H * .5, W * .135, 9);                                      /* the canopy */
  }));
  const roofTex = (w) => once('roof', () => S3.canvasTex(w.renderer, 1024, 512, (g, W, H) => {
    g.fillStyle = '#0e0f12'; g.fillRect(0, 0, W, H);
    g.fillStyle = cr(.3); for (let y = H / 5; y < H; y += H / 5) g.fillRect(0, y - 2, W, 4);              /* the membrane's welded seams */
    for (const z of [.3, .7]) { g.fillStyle = cr(.5); g.fillRect(W * .08, H * z - 28, W * .84, 5); g.fillRect(W * .08, H * z + 23, W * .84, 5); }   /* the dunnage rails */
    g.strokeStyle = cr(.9); g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  }));
  /* the cooler atlas: the left half the coil's side (a frame and fine fins), the right half a top with two fans */
  const coolTex = (w) => once('cool', () => S3.canvasTex(w.renderer, 1024, 256, (g, W, H) => {
    g.fillStyle = '#0e0f12'; g.fillRect(0, 0, W, H);
    g.strokeStyle = cr(.95); g.lineWidth = 8; g.strokeRect(4, 4, W / 2 - 8, H - 8); g.strokeRect(W / 2 + 4, 4, W / 2 - 8, H - 8);
    g.fillStyle = cr(.35); for (let x = 16; x < W / 2 - 12; x += 12) g.fillRect(x, H * .22, 4, H * .56);
    for (let i = 0; i < 2; i++) {
      const cx = W / 2 + (W / 2) * (i + .5) / 2, cy = H / 2, R = H * .4;
      g.strokeStyle = cr(.55); g.lineWidth = 5; for (let q = R * .3; q < R; q += R / 3) { g.beginPath(); g.arc(cx, cy, q, 0, 7); g.stroke(); }
      g.strokeStyle = cr(.95); g.lineWidth = 9; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
    }
  }));
  /* merge boxes [w,h,d,x,y,z] into one geometry; with `atlas`, top faces take the right half of the u range, the rest the left */
  function merge(list, atlas) {
    const pos = [], nor = [], uv = [], idx = []; let o = 0;
    for (const [bw, bh, bd, x, y, z] of list) {
      const g = new T.BoxGeometry(bw, bh, bd), p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i) + x, p.getY(i) + y, p.getZ(i) + z); nor.push(n.getX(i), n.getY(i), n.getZ(i));
        const top = n.getY(i) > .5; uv.push(atlas ? (top ? .5 : 0) + u.getX(i) * .5 : u.getX(i), u.getY(i));
      }
      for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + o);
      o += p.count;
    }
    const r = new T.BufferGeometry(); r.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); r.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    r.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); r.setIndex(idx); return r;
  }
  KIT.neocloud = { field(w, o = {}) {
    const n = o.n ?? 200, cols = o.cols ?? 20, len = o.len ?? .9, wid = o.wid ?? .45, hgt = o.hgt ?? .2, gap = o.gap ?? .25;
    const rows = Math.ceil(n / cols), width = cols * len + (cols - 1) * gap, depth = rows * wid + (rows - 1) * gap * 1.4;
    const ct = Math.min(wid * .05, hgt * .12), ch = hgt * .08, ry = hgt + ch * .35;
    const bodyG = new T.BoxGeometry(len, hgt, wid); bodyG.translate(0, hgt / 2, 0);
    const copeG = merge([[len * 1.004, ch, ct, 0, hgt + ch / 2, -wid / 2 + ct / 2], [len * 1.004, ch, ct, 0, hgt + ch / 2, wid / 2 - ct / 2],
      [ct, ch, wid - 2 * ct, -len / 2 + ct / 2, hgt + ch / 2, 0], [ct, ch, wid - 2 * ct, len / 2 - ct / 2, hgt + ch / 2, 0]]);
    const roofG = new T.PlaneGeometry(len - 2 * ct, wid - 2 * ct); roofG.rotateX(-Math.PI / 2); roofG.translate(0, ry, 0);
    const cl = len * .27, cwd = wid * .21, chh = hgt * .15, gx = len * .04, cb = [];
    for (const z of [-wid * .2, wid * .2]) for (let i = -1; i <= 1; i++) cb.push([cl, chh, cwd, i * (cl + gx), ry + chh / 2, z]);
    cb.push([len * .07, hgt * .2, wid * .13, len * .4, ry + hgt * .1, -wid * .36]);
    const coolG = merge(cb, true);
    const body = new T.InstancedMesh(bodyG, ink(cladTex(w)), n);
    const cope = new T.InstancedMesh(copeG, std({ roughness: .42, metalness: .55, envMapIntensity: .9 }), n);
    const roof = new T.InstancedMesh(roofG, ink(roofTex(w)), n);
    const cool = new T.InstancedMesh(coolG, ink(coolTex(w)), n);
    for (const m of [body, cope, roof, cool]) { m.castShadow = true; m.receiveShadow = true; }
    roof.castShadow = false;
    const gold = new Set(o.gold || []), red = new Set(o.red || []), at = o.at || [0, 0, 0];
    const cGold = S3.tok('--gold'), cRed = S3.tok('--red'), cGrey = S3.col(0x8b8b90), cBody = S3.col(0xffffff), cBodyG = S3.col(0xffffff);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      pos.push([at[0] - width / 2 + len / 2 + c * (len + gap), at[2] + depth / 2 - wid / 2 - r * (wid + gap * 1.4)]);
      cope.setColorAt(i, gold.has(i) ? cGold : red.has(i) ? cRed : cGrey);
      body.setColorAt(i, gold.has(i) ? cBodyG : cBody);
    }
    w.scene.add(body, cope, roof, cool);
    const m = M4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), v = new T.Vector3();
    const hd = { width, depth, s: { rise: o.rise ?? 1, fade: 0 },
      point: (i) => [pos[i][0], at[1] + hgt * 1.6, pos[i][1]],
      apply() {
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / cols), u = Math.min(1, Math.max(0, hd.s.rise * (rows + 2) - r)), sink = (gold.has(i) || red.has(i)) ? 0 : hd.s.fade;
          v.set(pos[i][0], at[1] - hgt * 1.1 * (1 - u) - hgt * .85 * sink, pos[i][1]); m.compose(v, q, sc);
          body.setMatrixAt(i, m); cope.setMatrixAt(i, m); roof.setMatrixAt(i, m); cool.setMatrixAt(i, m);
        }
        for (const k of [body, cope, roof, cool]) k.instanceMatrix.needsUpdate = true;
      } };
    return w.add(hd);
  } };

  /* a dot: a disc with a slightly domed top, its edge rounded, on a soft contact shade */
  const shadeTex = (w) => once('shade', () => S3.canvasTex(w.renderer, 64, 64, (g, W, H) => {
    const r = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(.55, 'rgba(0,0,0,.3)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  }));
  KIT.dots = { field(w, o = {}) {
    const n = o.n ?? 1000, cols = o.cols ?? 40, pitch = o.pitch ?? .2, r = o.r ?? pitch * .34, at = o.at || [0, 0, 0];
    const rows = Math.ceil(n / cols), width = (cols - 1) * pitch, depth = (rows - 1) * pitch, hh = r * .5;
    const prof = [[0, 0], [r * .96, 0], [r, hh * .12], [r, hh * .5], [r * .94, hh * .8], [r * .74, hh * .95], [r * .4, hh * 1.0], [0, hh * 1.02]].map(([x, y]) => new T.Vector2(x, y));
    const mesh = new T.InstancedMesh(new T.LatheGeometry(prof, 28), new T.MeshStandardMaterial({ roughness: .5, metalness: .05, envMapIntensity: .5 }), n);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const shade = new T.InstancedMesh(new T.PlaneGeometry(r * 3.1, r * 3.1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: shadeTex(w), transparent: true, depthWrite: false, color: 0x000000, opacity: .7 }), n);
    shade.renderOrder = 1;
    for (let i = 0; i < n; i++) mesh.setColorAt(i, S3.lin(o.colour ? o.colour(i) : S3.css('--cream')));
    w.scene.add(shade, mesh);
    const m = M4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3();
    const hd = { mesh, width, depth, s: { fill: o.fill ?? 1 },
      apply() {
        const shown = hd.s.fill * n;
        for (let i = 0; i < n; i++) {
          const u = Math.min(1, Math.max(0, shown - i)), c = i % cols, rr = Math.floor(i / cols);
          sc.setScalar(u > .001 ? 1 : 0); v.set(at[0] - width / 2 + c * pitch, at[1], at[2] + depth / 2 - rr * pitch);
          m.compose(v, q, sc); mesh.setMatrixAt(i, m);
          v.y = at[1] + .003; m.compose(v, q, sc); shade.setMatrixAt(i, m);
        }
        mesh.instanceMatrix.needsUpdate = shade.instanceMatrix.needsUpdate = true;
      } };
    return w.add(hd);
  } };
})();
