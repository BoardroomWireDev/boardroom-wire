/* KIT.neocloud and KIT.dots — fields of many: instanced, so 200 halls or 100,000 people cost one draw each.

   const f = KIT.neocloud.field(w, { n: 200, cols: 20, at: [x, 0, z], len: .9, wid: .45, hgt: .2, gap: .25, gold: [i, …], red: [i, …] });
     a small grey neocloud hall each (body and a gold or grey roof line); gold: indices drawn as the subject; red: indices lost.
   f.s.rise 0..1   the rows rise from the front, staggered    f.s.fade 0..1  the grey ones sink toward the floor's ink
   f.width, f.depth, f.point(i) the world point over hall i (for a label)

   const d = KIT.dots.field(w, { n: 3600, cols: 60, pitch: .2, r: .07, at: [x, 0, z], colour: (i) => '#F5F1E5' | '#D4AF37' | … });
     people as dots on the floor; one dot is the unit the page names (e.g. a million people: the label says so, from data.js).
   d.s.fill 0..1   dots land in reading order (front-left first)   d.width, d.depth */
(() => {
  const M4 = () => new THREE.Matrix4();
  KIT.neocloud = { field(w, o = {}) {
    const T = THREE, n = o.n ?? 200, cols = o.cols ?? 20, len = o.len ?? .9, wid = o.wid ?? .45, hgt = o.hgt ?? .2, gap = o.gap ?? .25;
    const rows = Math.ceil(n / cols), width = cols * len + (cols - 1) * gap, depth = rows * wid + (rows - 1) * gap * 1.4;
    const body = new T.InstancedMesh(new T.BoxGeometry(len, hgt, wid), w.mat.card, n);
    const roof = new T.InstancedMesh(new T.BoxGeometry(len * 1.002, hgt * .12, wid * 1.002), new T.MeshStandardMaterial({ roughness: .5, metalness: .4, envMapIntensity: .7 }), n);
    body.castShadow = body.receiveShadow = roof.castShadow = true;
    const gold = new Set(o.gold || []), red = new Set(o.red || []), at = o.at || [0, 0, 0];
    const cGold = S3.tok('--gold'), cRed = S3.tok('--red'), cGrey = S3.tok('--grey-bright'), cBody = S3.col(S3.MAT.card), cBodyG = S3.col(S3.MAT.graphite);
    const pos = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      pos.push([at[0] - width / 2 + len / 2 + c * (len + gap), at[2] + depth / 2 - wid / 2 - r * (wid + gap * 1.4)]);
      roof.setColorAt(i, gold.has(i) ? cGold : red.has(i) ? cRed : cGrey);
      body.setColorAt(i, gold.has(i) ? cBodyG : cBody);
    }
    w.scene.add(body, roof);
    const m = M4(), q = new T.Quaternion(), sc = new T.Vector3(1, 1, 1), v = new T.Vector3();
    const hd = { width, depth, s: { rise: o.rise ?? 1, fade: 0 },
      point: (i) => [pos[i][0], at[1] + hgt * 1.6, pos[i][1]],
      apply() {
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / cols), u = Math.min(1, Math.max(0, hd.s.rise * (rows + 2) - r)), sink = (gold.has(i) || red.has(i)) ? 0 : hd.s.fade;
          const y = at[1] - hgt * 1.1 * (1 - u) - hgt * .85 * sink;
          v.set(pos[i][0], y + hgt / 2, pos[i][1]); m.compose(v, q, sc); body.setMatrixAt(i, m);
          v.set(pos[i][0], y + hgt + hgt * .06, pos[i][1]); m.compose(v, q, sc); roof.setMatrixAt(i, m);
        }
        body.instanceMatrix.needsUpdate = roof.instanceMatrix.needsUpdate = true;
      } };
    return w.add(hd);
  } };

  KIT.dots = { field(w, o = {}) {
    const T = THREE, n = o.n ?? 1000, cols = o.cols ?? 40, pitch = o.pitch ?? .2, r = o.r ?? pitch * .34, at = o.at || [0, 0, 0];
    const rows = Math.ceil(n / cols), width = (cols - 1) * pitch, depth = (rows - 1) * pitch;
    const mesh = new T.InstancedMesh(new T.CylinderGeometry(r, r, r * .5, 20), new T.MeshStandardMaterial({ roughness: .6, envMapIntensity: .4 }), n);
    mesh.castShadow = true; mesh.receiveShadow = true;
    for (let i = 0; i < n; i++) mesh.setColorAt(i, S3.lin(o.colour ? o.colour(i) : S3.css('--cream')));
    w.scene.add(mesh);
    const m = M4(), q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3();
    const hd = { mesh, width, depth, s: { fill: o.fill ?? 1 },
      apply() {
        const shown = hd.s.fill * n;
        for (let i = 0; i < n; i++) {
          const u = Math.min(1, Math.max(0, shown - i)), c = i % cols, rr = Math.floor(i / cols);
          v.set(at[0] - width / 2 + c * pitch, at[1] + r * .25, at[2] + depth / 2 - rr * pitch); sc.setScalar(u > .001 ? 1 : 0);
          m.compose(v, q, sc); mesh.setMatrixAt(i, m);
        }
        mesh.instanceMatrix.needsUpdate = true;
      } };
    return w.add(hd);
  } };
})();
