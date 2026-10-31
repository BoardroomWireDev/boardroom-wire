/* KIT v2 · cash (Ive, 28 Oct 2026, the polish pass). Same API as v1: KIT.cash.tower(w, {usd, per, cols, rows, size, at, red, fill, yaw}),
   KIT.cash.bundle(w, {size, red}) (a Mesh; userData {L, W, H}), c.s.fill, c.n, c.height, c.top(). The honest count is unchanged:
   one bundle = `per` USD millions, n = usd / per, the tower's count is the figure.
   Real object: a US $100 bundle (100 notes) is 156 x 66.3 mm a note (L : W = 2.353 : 1, as v1) and about 10.9 mm thick; the thickness
   is kept at v1's .13 x size (about 1.85 x the real .07) so a tower's height, which boards frame by, does not change. A paper strap
   (gold, for the house) runs round the middle, a seventh of the length. The top note is drawn in fine green-grey line on warm paper,
   desaturated for the black-and-gold look: a border of engraved guilloche, two seal rosettes, a plain oval frame for the portrait (no
   portrait), the 100 numerals only as engraved shapes (hatched outlines, never type). The long sides and ends show the paper layers
   as fine lines. A tower is two InstancedMeshes (notes, straps); each bundle is a hair off true, as a real stack is, and a shade
   different in paper. Nothing glows.
   Shape kept for chapter code that reaches in (stage-ch4 C4.tower): group.children[0] is a Group whose child 0 is the notes mesh with a
   six-material array ([0] edge, [2] face) and whose own children are the straps. */
(() => {
const T = THREE;
const cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
const rnd = (i, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

/* the engraved numeral shapes: a polygon or a ring, filled with fine hatching, outlined */
function engrave(c, path, ink, ang = -.6, gap = 3.4) {
  c.save(); path(); c.clip('evenodd');
  c.strokeStyle = ink; c.lineWidth = 1.1; c.globalAlpha = .75;
  c.translate(0, 0); const R = 900, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let k = -R; k < R; k += gap) { c.beginPath(); c.moveTo(600 + k * -sa - R * ca, 330 + k * ca - R * sa); c.lineTo(600 + k * -sa + R * ca, 330 + k * ca + R * sa); c.stroke(); }
  c.restore();
  c.globalAlpha = .9; c.lineWidth = 1.8; c.strokeStyle = ink; path(); c.stroke(); c.globalAlpha = 1;
}
function numeral100(c, x, y, h, ink) {
  const w = h * .5;
  const one = () => { const P = [[.12, .26], [.38, .0], [.64, .0], [.64, .86], [.88, .86], [.88, 1], [.12, 1], [.12, .86], [.36, .86], [.36, .2], [.12, .3]]; c.beginPath(); P.forEach(([u, v], i) => c[i ? 'lineTo' : 'moveTo'](x + u * w, y + v * h)); c.closePath(); };
  const zero = (ox) => () => { c.beginPath(); c.ellipse(x + ox + w * .5, y + h / 2, w * .5, h / 2, 0, 0, 7); c.moveTo(x + ox + w * .5 + w * .2, y + h / 2); c.ellipse(x + ox + w * .5, y + h / 2, w * .2, h * .3, 0, 0, 7); };
  engrave(c, one, ink, -.7); engrave(c, zero(w * 1.05), ink, -.7); engrave(c, zero(w * 2.1), ink, -.7);
}
function rosette(c, cx, cy, r, ink, n = 22, ring = true) {
  c.strokeStyle = ink; c.lineWidth = 1; c.globalAlpha = .7;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * r * .32, cy + Math.sin(a) * r * .32, r * .68, 0, 7); c.stroke(); }
  if (ring) { c.globalAlpha = .9; c.lineWidth = 1.6; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, r * 1.1, 0, 7); c.stroke(); }
  c.globalAlpha = 1;
}
function guilloche(c, x0, y0, len, thick, vert, ink) {
  c.save(); c.translate(x0, y0); if (vert) { c.rotate(Math.PI / 2); c.translate(0, -thick); } /* band runs along +x, `thick` across */
  c.strokeStyle = ink; c.lineWidth = 1; c.globalAlpha = .6;
  for (let k = 0; k < 7; k++) { c.beginPath(); for (let x = 0; x <= len; x += 3) { const y = thick / 2 + Math.sin(x / 11 + k * .9) * thick * .42 * Math.cos(x / 83 + k * .35); x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.globalAlpha = .9; c.lineWidth = 1.4; c.strokeRect(0, 0, len, thick); c.restore();
}
/* the top note, 156 x 66.3 mm at 10 px a mm */
function noteTex(w) {
  return once('note', () => S3.canvasTex(w.renderer, 1560, 663, (c, W, H) => {
    const ink = '#566759', inkLt = '#7e8a7c';
    const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#d6d3c0'); gr.addColorStop(1, '#cdcab6'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { c.strokeStyle = rnd(i, 2) > .5 ? 'rgba(120,112,90,.07)' : 'rgba(255,252,240,.09)'; c.lineWidth = 1; const x = rnd(i, 3) * W, y = rnd(i, 4) * H, l = 6 + rnd(i, 5) * 22, a = rnd(i, 6) * 6.28; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    /* the border: a guilloche band, a plain keyline outside and in */
    const m = 26, bt = 62;
    c.strokeStyle = ink; c.lineWidth = 2.2; c.strokeRect(m - 12, m - 12, W - 2 * m + 24, H - 2 * m + 24);
    guilloche(c, m, m, W - 2 * m, bt, false, ink); guilloche(c, m, H - m - bt, W - 2 * m, bt, false, ink);
    guilloche(c, m, m + bt, H - 2 * m - 2 * bt, bt, true, ink);
    c.save(); c.translate(W - m, 0); guilloche(c, 0, m + bt, H - 2 * m - 2 * bt, bt, true, ink); c.restore();
    c.strokeStyle = ink; c.lineWidth = 1.6; c.strokeRect(m + bt + 16, m + bt + 16, W - 2 * (m + bt + 16), H - 2 * (m + bt + 16));
    for (const [x, y] of [[m + bt / 2, m + bt / 2], [W - m - bt / 2, m + bt / 2], [m + bt / 2, H - m - bt / 2], [W - m - bt / 2, H - m - bt / 2]]) rosette(c, x, y, bt * .42, ink, 14, false);
    /* the field: fine engraved waves behind everything, lighter than the border */
    c.strokeStyle = inkLt; c.lineWidth = .9; c.globalAlpha = .5;
    for (let y = m + bt + 30; y < H - m - bt - 26; y += 6.5) { c.beginPath(); for (let x = m + bt + 30; x < W - m - bt - 30; x += 6) { const yy = y + Math.sin(x / 38 + y / 21) * 1.6; x === m + bt + 30 ? c.moveTo(x, yy) : c.lineTo(x, yy); } c.stroke(); }
    c.globalAlpha = 1;
    /* the portrait: a plain oval frame (a cleared field inside, two keylines), no portrait */
    const cx = W / 2, cy = H / 2, rx = 196, ry = 218;
    c.fillStyle = '#dedbc9'; c.beginPath(); c.ellipse(cx, cy, rx + 18, ry + 18, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(210,206,188,.9)'; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill();
    c.strokeStyle = ink; c.lineWidth = 2.4; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.stroke();
    c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx, cy, rx + 12, ry + 12, 0, 0, 7); c.stroke();
    c.lineWidth = 1; c.globalAlpha = .55; c.beginPath(); c.ellipse(cx, cy, rx - 12, ry - 12, 0, 0, 7); c.stroke(); c.globalAlpha = 1;
    /* the seals */
    for (const [x, y, r] of [[330, 236, 86], [W - 330, 236, 74]]) { c.fillStyle = '#dedbc9'; c.beginPath(); c.arc(x, y, r * 1.18, 0, 7); c.fill(); rosette(c, x, y, r, ink, 26); }
    /* the 100s, only as engraved shapes */
    numeral100(c, 200, 396, 150, ink); numeral100(c, W - 200 - 150 * 1.6 - 10, 400, 140, ink);
    for (const [x, y] of [[m + 12, m + 12], [W - m - 12 - 48, m + 12], [m + 12, H - m - 12 - 28], [W - m - 12 - 48, H - m - 12 - 28]]) { c.save(); c.translate(x, y); c.scale(.2, .2); numeral100(c, 0, 0, 140, ink); c.restore(); }
    /* a light wear at the edge */
    const v = c.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, W * .62); v.addColorStop(0, 'rgba(90,84,60,0)'); v.addColorStop(1, 'rgba(90,84,60,.16)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  }));
}
/* the paper layers seen on an edge: fine lines, every hundredth note a little darker */
function edgeTex(w, k) {
  return once('edge' + k, () => S3.canvasTex(w.renderer, 1024, 128, (c, W, H) => {
    c.fillStyle = '#d4d0bd'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 2) { const r = rnd(y, k); c.fillStyle = r > .55 ? 'rgba(255,252,238,.35)' : 'rgba(96,90,68,' + (.08 + r * .22) + ')'; c.fillRect(0, y, W, 1.2); }
    for (let i = 0; i < 260; i++) { c.fillStyle = 'rgba(100,92,70,.05)'; c.fillRect(rnd(i, 7 + k) * W, 0, 1 + rnd(i, 8) * 2, H); }
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,255,240,.1)'); g.addColorStop(1, 'rgba(40,36,24,.22)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }));
}
function strapTex(w) {
  return once('strap', () => S3.canvasTex(w.renderer, 128, 256, (c, W, H) => {
    const g = S3.css('--gold') || '#d4a93a'; c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { c.fillStyle = rnd(i, 9) > .5 ? 'rgba(80,56,10,.07)' : 'rgba(255,240,190,.09)'; c.fillRect(rnd(i, 10) * W, rnd(i, 11) * H, 1 + rnd(i, 12) * 8, 1); }
    c.fillStyle = 'rgba(138,128,104,.28)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(70,48,6,.55)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 2); c.lineTo(W, 2); c.moveTo(0, H - 2); c.lineTo(W, H - 2); c.stroke();
    c.strokeStyle = 'rgba(70,48,6,.28)'; c.lineWidth = 1.4; c.strokeRect(10, 14, W - 20, H - 28);
  }));
}
/* a box with a chamfered top and bottom perimeter (a real edge: the key catches a highlight along it). Groups follow BoxGeometry's material order
   [+x end, -x end, +y face, -y bottom, +z side, -z side]; the top chamfers take the face material, the bottom ones the bottom material. */
function bevBox(L, h, W, c, single) {
  const pos = [], nor = [], uv = [], grp = {};
  const hx = L / 2, hy = h / 2, hz = W / 2, V = (x, y, z) => new T.Vector3(x, y, z);
  const quad = (P, hint, mi) => {
    const n = new T.Vector3().crossVectors(P[1].clone().sub(P[0]), P[2].clone().sub(P[0])).normalize();
    if (n.dot(hint) < 0) { P = P.slice().reverse(); n.negate(); }
    const idx = [0, 1, 2, 0, 2, 3], start = pos.length / 3;
    for (const i of idx) {
      const p = P[i]; pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z);
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      if (ay >= ax && ay >= az) uv.push(p.x / L + .5, .5 - p.z / W);
      else if (ax >= az) uv.push(.5 + p.z / W, p.y / h + .5);
      else uv.push(p.x / L + .5, p.y / h + .5);
    }
    (grp[single ? 0 : mi] = grp[single ? 0 : mi] || []).push([start, 6]);
  };
  for (const sy of [1, -1]) {
    const mc = sy > 0 ? 2 : 3, Y = sy * hy, Yc = sy * (hy - c);
    quad([V(-hx + c, Y, -hz + c), V(hx - c, Y, -hz + c), V(hx - c, Y, hz - c), V(-hx + c, Y, hz - c)], V(0, sy, 0), mc);
    for (const sx of [1, -1]) quad([V(sx * hx, Yc, -hz), V(sx * hx, Yc, hz), V(sx * (hx - c), Y, hz - c), V(sx * (hx - c), Y, -hz + c)], V(sx, sy, 0), mc);
    for (const sz of [1, -1]) quad([V(-hx, Yc, sz * hz), V(hx, Yc, sz * hz), V(hx - c, Y, sz * (hz - c)), V(-hx + c, Y, sz * (hz - c))], V(0, sy, sz), mc);
  }
  for (const sx of [1, -1]) quad([V(sx * hx, -hy + c, -hz), V(sx * hx, -hy + c, hz), V(sx * hx, hy - c, hz), V(sx * hx, hy - c, -hz)], V(sx, 0, 0), sx > 0 ? 0 : 1);
  for (const sz of [1, -1]) quad([V(-hx, -hy + c, sz * hz), V(hx, -hy + c, sz * hz), V(hx, hy - c, sz * hz), V(-hx, hy - c, sz * hz)], V(0, 0, sz), sz > 0 ? 4 : 5);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (!single) { const order = [0, 1, 2, 3, 4, 5]; const idxs = []; /* regroup contiguous by material: rebuild the index list sorted by material */
    for (const m of order) for (const [st, n] of (grp[m] || [])) for (let i = 0; i < n; i++) idxs.push(st + i);
    g.setIndex(idxs); let at = 0; for (const m of order) { const n = (grp[m] || []).reduce((a, b) => a + b[1], 0); if (n) g.addGroup(at, n, m); at += n; } }
  return g;
}
function parts(w, o) {
  const k = o.size || 1, L = 1.0 * k, Wd = L / 2.35, Hh = .13 * k;
  const tint = o.red ? S3.tok('--red').lerp(new T.Color(1, 1, 1), .05) : new T.Color(1, 1, 1);
  const edgeTint = o.red ? S3.tok('--red').lerp(new T.Color(1, 1, 1), .18) : new T.Color(1, 1, 1);
  const face = new T.MeshStandardMaterial({ map: noteTex(w), roughness: .86, envMapIntensity: .3, color: tint });
  const sideL = new T.MeshStandardMaterial({ map: edgeTex(w, 1), roughness: .92, envMapIntensity: .2, color: edgeTint });
  const sideE = new T.MeshStandardMaterial({ map: edgeTex(w, 2), roughness: .92, envMapIntensity: .2, color: edgeTint });
  const bot = KIT.M({ color: o.red ? S3.tok('--red', .8) : S3.col(0xbdb8a6), roughness: .95 });
  let mats = [sideE, sideE, face, bot, sideL, sideL];
  /* a loss bundle (red): flat ink in exactly --red, unlit and outside the tone mapping, so it is the same red as the −$ figure
     beside it (lit, the red multiplied the warm paper and the key pushed it to salmon). The side planes sit a fixed shade darker,
     so the form still reads as flat ink does (Anthropic IPO's bills). */
  if (o.red) {
    const R = (k, map) => new T.MeshBasicMaterial({ map: map || null, color: S3.tok('--red', k), toneMapped: false });
    const rf = R(1, noteTex(w)), rl = R(1), re = R(.62), rb = R(.45);   /* the long sides exactly --red (the face the camera sees) */
    mats = [re, re, rf, rb, rl, rl];
  }
  const geo = bevBox(L, Hh, Wd, .012 * k);
  const sg = L * .14, sm = new T.MeshStandardMaterial({ map: strapTex(w), roughness: .58, metalness: .2, envMapIntensity: .6, color: 0xc8c0a8 });
  const sgeo = bevBox(sg, Hh + .008 * k, Wd + .008 * k, .005 * k, true);
  return { L, W: Wd, H: Hh, geo, mats, sgeo, sm };
}

KIT.cash = {
  bundle(w, o = {}) {
    const p = parts(w, o);
    const m = new T.Mesh(p.geo, p.mats); m.castShadow = m.receiveShadow = true;
    const s = new T.Mesh(p.sgeo, p.sm); s.castShadow = true; s.receiveShadow = true; m.add(s);
    m.userData = { L: p.L, W: p.W, H: p.H };
    return m;
  },
  tower(w, o = {}) {
    const n = Math.max(1, Math.round((o.usd || 0) / (o.per || 10000))), cols = o.cols ?? 2, rows = o.rows ?? 2, per = cols * rows;
    const p = parts(w, o), { L, W, H } = p, k = o.size || 1, gap = .015 * k;
    const notes = new T.InstancedMesh(p.geo, p.mats, n), straps = new T.InstancedMesh(p.sgeo, p.sm, n);
    for (const im of [notes, straps]) { im.castShadow = im.receiveShadow = true; im.frustumCulled = false; }
    const base = [];
    for (let i = 0; i < n; i++) {
      const layer = Math.floor(i / per), j = i % per, cx = j % cols, rz = Math.floor(j / cols);
      const rot = ((layer % 2) ? Math.PI : 0) + (rnd(i, 1) - .5) * .035;           /* every other layer turned, as a real stack is; each a hair off true */
      base.push({ x: (cx - (cols - 1) / 2) * (L + gap) + (rnd(i, 2) - .5) * .006 * k, y: H / 2 + layer * (H + gap * .3), z: (rz - (rows - 1) / 2) * (W + gap) + (rnd(i, 3) - .5) * .006 * k, r: rot });
      const sh = .93 + rnd(i, 4) * .1; notes.setColorAt(i, new T.Color(sh, sh, sh * .99));
    }
    const root = new T.Group(), gb = new T.Group(); notes.add(straps); gb.add(notes); root.add(gb);   /* root > group > notes > straps: ch4's C4.tower reaches in by this shape to dim a tower */ root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
    const cs = KIT.contact(w, cols * (L + gap), rows * (W + gap), { k: .5, pad: .16 }); if ((o.at || [0, 0, 0])[1] < .5 * H || o.floor) root.add(cs); /* only a tower on the floor or a plinth lays a shadow; one stacked on another does not */
    const height = Math.ceil(n / per) * (H + gap * .3);
    const M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
    let last = -1;
    const hd = { group: root, n, height, s: { fill: o.fill ?? 1 },
      top: () => { const q = new T.Vector3(0, height, 0); (root.updateMatrixWorld(true), root.localToWorld(q)); return [q.x, q.y, q.z]; },
      apply() {
        const shown = hd.s.fill * n; if (shown === last) return; last = shown;
        for (let i = 0; i < n; i++) {
          const u = Math.min(1, Math.max(0, shown - i)), b = base[i];
          V.set(b.x, b.y + (1 - u) * .6, b.z); Q.setFromAxisAngle(Y, b.r); S.setScalar(u > .001 ? 1 : 0);
          M.compose(V, Q, S); notes.setMatrixAt(i, M); straps.setMatrixAt(i, M);
        }
        notes.instanceMatrix.needsUpdate = straps.instanceMatrix.needsUpdate = true;
        cs.set(Math.min(1, shown / Math.max(1, Math.min(n, per))));
      } };
    return w.add(hd);
  }
};
})();
