/* KIT v2 · the price tag (Ive, 28 Oct 2026, the polish pass). Same API as v1:
   KIT.tag.create(w, { anchor, drop, w, h, lines, lean, yaw, dropIn, paper }) -> { group, w, h, s: { drop, swing, lean }, centre() }.
   Real object: a shipping/price tag in card stock, about 1 mm thick, a rectangle with the two top corners clipped, a punched hole with
   a metal grommet (flange about 1.8 x the hole) and a twine loop through it. Here: the card is an extrusion with a small bevel and a
   slight bow across its width (a card is never dead flat), grain and a wear shade at the edge, a printed reinforcing ring and a
   dashed price field; the front carries the lines exactly as passed (2.4 x v1's texel density, so the figure is sharp at 4K), the back
   is blank. The grommet is a lathed brass-gold flange and barrel; the twine is a tube with a real thickness (about 1.6% of the card
   width), a loop through the eyelet, the two strands opening a little and bowed, a knot at the anchor.
   lines: { text, px (on a 400 px-per-unit card), y (0 top .. 1 bottom), x, ink, weight, family } (as v1); every text is mirrored for `bw words`. */
KIT.tag = { create(w, o = {}) {
  const T = THREE, W = o.w ?? 1.5, H = o.h ?? 2.0, D = Math.max(.014, W * .016), cut = W * .26, PX = (o.lines || []).length ? 960 / Math.max(W, 1) : 400, K = PX / 400;   /* a blank tag is re-printed later by KIT.c3a.retag at 400 px a unit: keep that density */
  const rb = W * .052, hy = H / 2 - cut * .7;
  const s = new T.Shape();
  s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, H / 2 - cut); s.lineTo(W / 2 - cut, H / 2); s.lineTo(-W / 2 + cut, H / 2); s.lineTo(-W / 2, H / 2 - cut); s.lineTo(-W / 2, -H / 2);
  const hole = new T.Path(); hole.absarc(0, hy, rb, 0, Math.PI * 2, true); s.holes.push(hole);
  const cw = Math.round(W * PX), ch = Math.round(H * PX);
  const tex = S3.canvasTex(w.renderer, cw, ch, (c) => {
    c.fillStyle = o.paper || '#efebdf'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = 'rgba(10,10,15,.2)'; c.lineWidth = 3 * K; c.setLineDash([14 * K, 10 * K]); c.strokeRect(cw * .07, ch * .2, cw * .86, ch * .74); c.setLineDash([]);
    (o.lines || []).forEach(l => {
      c.fillStyle = l.ink || S3.css('--ink'); c.font = `${l.weight || 700} ${(l.px || 200) * K}px ${l.family || '"IBM Plex Mono"'}`;
      c.textAlign = l.x == null ? 'center' : 'left'; c.textBaseline = 'alphabetic';
      c.fillText(l.text, l.x == null ? cw / 2 : l.x * cw, (l.y ?? .6) * ch);
    });
  });
  /* the card's finish lives on a transparent skin over the face, so a re-print of the face (KIT.c3a.retag) keeps it: paper fibre, wear at the edge,
     the printed reinforcing ring round the hole, a fine gold rule at the foot */
  const DX = Math.round(W * 640), DY = Math.round(H * 640), dk = 640 / 400;
  const skin = S3.canvasTex(w.renderer, DX, DY, (c) => {
    c.clearRect(0, 0, DX, DY);
    const X = (x) => (x + W / 2) / W * DX, Y = (y) => (H / 2 - y) / H * DY;
    c.beginPath(); c.moveTo(X(-W / 2), Y(-H / 2)); c.lineTo(X(W / 2), Y(-H / 2)); c.lineTo(X(W / 2), Y(H / 2 - cut)); c.lineTo(X(W / 2 - cut), Y(H / 2)); c.lineTo(X(-W / 2 + cut), Y(H / 2)); c.lineTo(X(-W / 2), Y(H / 2 - cut)); c.closePath();
    c.moveTo(X(rb) , Y(hy)); c.arc(X(0), Y(hy), rb * DX / W, 0, Math.PI * 2, true); c.clip('evenodd');
    for (let i = 0; i < 1600; i++) { const r = (n) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); }; c.fillStyle = r(1) > .5 ? 'rgba(110,100,76,.07)' : 'rgba(255,253,244,.1)'; c.fillRect(r(2) * DX, r(3) * DY, 1 + r(4) * 7, 1 + r(5) * 1.4); }
    const v = c.createRadialGradient(DX / 2, DY / 2, Math.min(DX, DY) * .35, DX / 2, DY / 2, Math.max(DX, DY) * .75); v.addColorStop(0, 'rgba(100,90,64,0)'); v.addColorStop(1, 'rgba(100,90,64,.2)'); c.fillStyle = v; c.fillRect(0, 0, DX, DY);
    const hx = DX / 2, hyy = DY * (.5 - hy / H), pxu = DX / W;
    c.strokeStyle = 'rgba(60,58,50,.38)'; c.lineWidth = 2.2 * dk; c.beginPath(); c.arc(hx, hyy, rb * 1.95 * pxu, 0, 7); c.stroke();
    c.lineWidth = 1.2 * dk; c.beginPath(); c.arc(hx, hyy, rb * 2.2 * pxu, 0, 7); c.stroke();
    c.fillStyle = S3.css('--gold') || '#d4a93a'; c.globalAlpha = .9; c.fillRect(DX * .07, DY * .955, DX * .86, 5 * dk); c.globalAlpha = 1;
  });
  S3.mirror(w.words, (o.lines || []).map(l => l.text));
  const bv = D * .22;
  const geo = new T.ExtrudeGeometry(s, { depth: D - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * .8, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, bv);
  const pos = geo.attributes.position, uv = geo.attributes.uv, bow = W * .014;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), back = pos.getZ(i) < D / 2;
    if (back) uv.setXY(i, .03, .985); else uv.setXY(i, (x + W / 2) / W, (y + H / 2) / H);        /* the back is a bare patch of paper */
    pos.setZ(i, pos.getZ(i) + bow * (1 - Math.pow(2 * x / W, 2)));
  }
  const face = new T.MeshStandardMaterial({ map: tex, roughness: .84, envMapIntensity: .3 });
  const rim = new T.MeshStandardMaterial({ color: S3.col(0xcdc7b5), roughness: .92, envMapIntensity: .2 });
  const card = new T.Mesh(geo, [face, rim]); card.castShadow = true; card.receiveShadow = true;
  const skinG = new T.PlaneGeometry(W * .998, H * .998, 24, 1), sp = skinG.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setZ(i, D + bow * (1 - Math.pow(2 * sp.getX(i) / W, 2)) + .0007);
  const skinM = new T.Mesh(skinG, new T.MeshBasicMaterial({ map: skin, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  skinM.renderOrder = 2; card.add(skinM);
  /* the grommet: a flanged brass ring, lathed (r, y) profile, axis turned to the card's thickness */
  const fl = rb * 1.7, hd2 = D / 2 + Math.max(.004, W * .006), ri = rb - Math.max(.004, W * .007), ed = Math.max(.003, W * .004);
  const prof = [[ri, -hd2], [fl - ed, -hd2], [fl, -hd2 + ed], [fl, -D / 2], [rb, -D / 2], [rb, D / 2], [fl, D / 2], [fl, hd2 - ed], [fl - ed, hd2], [ri, hd2], [ri, -hd2]].map(([r, y]) => new T.Vector2(r, y));
  const eye = new T.Mesh(new T.LatheGeometry(prof, 40), new T.MeshStandardMaterial({ color: w.mat.trim.color, metalness: .8, roughness: .3, envMapIntensity: 1.1, side: T.DoubleSide }));
  eye.rotation.x = Math.PI / 2; eye.position.set(0, hy, D / 2 + bow); eye.castShadow = true;
  const drop = o.drop ?? .5;
  const body = new T.Group(); body.add(card, eye); body.position.y = -drop - hy;     /* the eyelet hangs `drop` under the anchor */
  /* the twine: a loop through the eyelet, over its top edge; two strands bowed a little apart, a knot at the anchor */
  const sr = Math.max(.0045, W * .008), yEnd = Math.min(-drop + rb - sr * 1.1, -sr * 3), zc = D / 2 + bow, open = Math.min(rb * .9, Math.max(sr * 2, -yEnd * .22));
  const strand = (side) => new T.CatmullRomCurve3([0, .2, .4, .6, .8, .93, 1].map(t => new T.Vector3(side * open * Math.pow(t, 1.5), yEnd * t, zc + side * (D / 2 + sr * 1.2) * Math.sin(Math.PI * t))));
  const tw = KIT.M({ color: S3.col(0xc9bf9f), roughness: .95 });
  const front = new T.Mesh(new T.TubeGeometry(strand(1), 28, sr, 7), tw), back = new T.Mesh(new T.TubeGeometry(strand(-1), 28, sr, 7), tw);
  const knot = new T.Mesh(new T.SphereGeometry(sr * 2.2, 12, 8), tw); knot.scale.set(1, 1.3, 1); knot.position.set(0, -sr * 1.6, zc);
  [front, back, knot].forEach(m => { m.castShadow = true; });
  const str = new T.Group(); str.add(front, back, knot);
  const pivot = new T.Group(); pivot.add(body, str);
  const root = new T.Group(); root.add(pivot); root.position.set(...(o.anchor || [0, 3, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const hd = { group: root, w: W, h: H, s: { drop: o.dropIn ?? 1, swing: 0, lean: o.lean ?? 0 },
    centre: () => { const p = new T.Vector3(0, 0, 0); (root.updateMatrixWorld(true), body.localToWorld(p)); return [p.x, p.y, p.z]; },
    apply() { pivot.position.y = (1 - hd.s.drop) * (drop + H + 1.5); pivot.rotation.z = hd.s.swing; pivot.rotation.x = -hd.s.lean; root.visible = hd.s.drop > .001; } };
  return w.add(hd);
} };
