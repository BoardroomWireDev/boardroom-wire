/* KIT.tag — the price tag. Card stock with chamfered top corners, a gold eyelet and a string; it hangs from a point (a hall's
   roof edge) and carries the price printed on it, from data.js.
   const t = KIT.tag.create(w, { anchor: [x, y, z], drop: .5, w: 1.5, h: 2.0, lines: [{ text: BW.val('k'), px: 300, y: .55 }, …] });
     lines: { text, px (on a 400 px-per-unit card), y (0 top … 1 bottom), x (default centred), ink, weight, family }
     every line's text is mirrored for `bw words`. Words: the figure and its unit only.
   t.s.drop 0..1  it drops in on its string from above the anchor     t.s.swing  radians of swing (a settle: 0.12 → 0)
   t.s.lean       radians the card leans out from the wall it hangs on (a card longer than the wall is tall rests its foot on the floor)
   t.centre()     world point of the card's centre (for a label beside it) */
KIT.tag = { create(w, o = {}) {
  const T = THREE, W = o.w ?? 1.5, H = o.h ?? 2.0, D = .025, cut = W * .26, PX = 400;
  const s = new T.Shape();
  s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, H / 2 - cut); s.lineTo(W / 2 - cut, H / 2); s.lineTo(-W / 2 + cut, H / 2); s.lineTo(-W / 2, H / 2 - cut); s.lineTo(-W / 2, -H / 2);
  const hy = H / 2 - cut * .7, hole = new T.Path(); hole.absarc(0, hy, W * .06, 0, Math.PI * 2, true); s.holes.push(hole);
  const tex = S3.canvasTex(w.renderer, Math.round(W * PX), Math.round(H * PX), (c, cw, ch) => {
    c.fillStyle = o.paper || '#F2EEE4'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = 'rgba(10,10,15,.18)'; c.lineWidth = 4; c.setLineDash([14, 10]); c.strokeRect(cw * .07, ch * .2, cw * .86, ch * .74);
    (o.lines || []).forEach(l => {
      c.fillStyle = l.ink || S3.css('--ink'); c.font = `${l.weight || 700} ${l.px || 200}px ${l.family || '"IBM Plex Mono"'}`;
      c.textAlign = l.x == null ? 'center' : 'left'; c.textBaseline = 'alphabetic';
      c.fillText(l.text, l.x == null ? cw / 2 : l.x * cw, (l.y ?? .6) * ch);
    });
  });
  S3.mirror(w.words, (o.lines || []).map(l => l.text));
  const geo = new T.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / W, (pos.getY(i) + H / 2) / H);
  const face = new T.MeshStandardMaterial({ map: tex, roughness: .85, envMapIntensity: .25 });
  const card = new T.Mesh(geo, [face, KIT.M({ color: S3.col(0xd8d2c4), roughness: .9 })]); card.castShadow = true; card.receiveShadow = true;
  const eye = new T.Mesh(new T.TorusGeometry(W * .07, W * .018, 10, 40), w.mat.gold); eye.position.set(0, hy, D + .002);
  const drop = o.drop ?? .5;
  const body = new T.Group(); body.add(card, eye); body.position.y = -drop - hy;   /* the eyelet hangs `drop` under the anchor */
  const str = new T.Mesh(new T.CylinderGeometry(.008, .008, drop, 8), KIT.M({ color: S3.col(0xd9d1bd), roughness: .9 })); str.position.y = -drop / 2; str.castShadow = true;
  const pivot = new T.Group(); pivot.add(body, str);
  const root = new T.Group(); root.add(pivot); root.position.set(...(o.anchor || [0, 3, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const hd = { group: root, w: W, h: H, s: { drop: o.dropIn ?? 1, swing: 0, lean: o.lean ?? 0 },
    centre: () => { const p = new T.Vector3(0, 0, 0); (root.updateMatrixWorld(true), body.localToWorld(p)); return [p.x, p.y, p.z]; },
    apply() { pivot.position.y = (1 - hd.s.drop) * (drop + H + 1.5); pivot.rotation.z = hd.s.swing; pivot.rotation.x = -hd.s.lean; root.visible = hd.s.drop > .001; } };
  return w.add(hd);
} };
