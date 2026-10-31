/* KIT v2 . the Starlink dish (Ive, 28 Oct 2026, the polish pass; the line-language pass). The Standard kit dish, same API as v1.
   Real object: a 594 x 383 mm plate, about 40 mm thick, 40 mm corner radius, on a slim mast that plugs into a flat splayed kickstand foot.
   What is built (k = width / .594, so 1 k = 1 m of the real dish):
     - the face: warm matte white with a 4 mm edge chamfer, a rounded inner panel edge, a very fine micro-dimple (seen only in a 4K crop);
     - the perimeter seam (a V groove with a dark core) between face and back shell;
     - the back shell: near-black moulded plastic with its edge and ribs as cream hairline; a ball collar where the mast plugs in;
     - the mast: a 30 mm cylinder, near-black, with cream ring lines; the kickstand foot: a flat X of two 300 mm bars on a hub, rubber tips;
     - the cable port at the bottom edge of the back, a black cable to the floor and its plug lying on the floor.
   Dark parts are near-black (#15161a) with cream hairline (texture + a faint emissive map, flat ink, no glow; edges are cream lines).
   The gold is nowhere: the dish is not the subject. A contact shadow sits under it.

   const d = KIT.dish.create(w, { width: 1.4, at: [x, 0, z], yaw: .3, rise });
   d.s.rise 0..1  rises out of the floor        d.w, d.h  plate width and standing height   (all as v1) */
(() => {
const T = THREE, cache = {};
const once = (k, f) => cache[k] || (cache[k] = f());
/* a seeded random, so the grain is the same on every render */
const rnd = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

function rrShape(W, H, r) {
  const s = new T.Shape();
  s.moveTo(-W / 2 + r, -H / 2); s.lineTo(W / 2 - r, -H / 2); s.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + r);
  s.lineTo(W / 2, H / 2 - r); s.quadraticCurveTo(W / 2, H / 2, W / 2 - r, H / 2); s.lineTo(-W / 2 + r, H / 2);
  s.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - r); s.lineTo(-W / 2, -H / 2 + r); s.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + r, -H / 2);
  return s;
}
/* an extruded rounded plate whose OUTER size (bevel included) is W x H and thickness t, from z0 to z0 + t */
function plate(W, H, r, z0, t, bt, bs, segs) {
  const g = new T.ExtrudeGeometry(rrShape(W - 2 * bs, H - 2 * bs, Math.max(.004, r - bs)), { depth: Math.max(.0001, t - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bs, bevelSegments: segs, curveSegments: 10 });
  g.translate(0, 0, z0 + bt);
  return g;
}
/* the cap uv of an extrusion is the shape's own x, y; scale it to 0..1 over W x H */
const capMap = (tex, W, H) => { const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.repeat.set(1 / W, 1 / H); t.offset.set(.5, .5); return t; };

/* the face: near white, a very soft drift of tone (lighter to the top left) and a fine grain, so it is a surface and not a card */
const faceTex = (w) => once('face', () => S3.canvasTex(w.renderer, 1024, 660, (g, W, H) => {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#f4f1ea'); gr.addColorStop(.5, '#dedbd3'); gr.addColorStop(1, '#b5b2a9');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const im = g.getImageData(0, 0, W, H), d = im.data, R = rnd(7);
  for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 3; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  /* a very fine micro-dimple on a hex grid (about 1.6 mm pitch): each dimple a faint dark rim with a lighter lip below */
  const pitch = 6;
  for (let row = 0, y = 4; y < H - 3; y += pitch * .866, row++) for (let x = 4 + (row % 2) * pitch / 2; x < W - 3; x += pitch) {
    g.fillStyle = 'rgba(70,64,52,.07)'; g.beginPath(); g.arc(x, y, 1.15, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,250,.10)'; g.beginPath(); g.arc(x + .6, y + .7, .8, 0, 7); g.fill();
  }
  /* the radome's own rounded inner panel edge, 14 mm in from the rim: a soft groove with a lit lip */
  const i0 = W * .024, rr = W * .043;
  const rrect = (ins, rad) => { g.beginPath(); g.roundRect ? g.roundRect(ins, ins, W - 2 * ins, H - 2 * ins, rad) : g.rect(ins, ins, W - 2 * ins, H - 2 * ins); };
  g.strokeStyle = 'rgba(90,84,70,.24)'; g.lineWidth = 2.5; rrect(i0, rr); g.stroke();
  g.strokeStyle = 'rgba(255,255,250,.30)'; g.lineWidth = 1.5; rrect(i0 + 2.5, rr - 2.5); g.stroke();
}));
/* the back shell: near-black moulded plastic; its edge, ribs and mount ring as cream hairline (outline full, ribs 60%, stipple 30%) */
const CREAM = '236,230,214';
const backTex = (w) => once('back', () => S3.canvasTex(w.renderer, 1024, 660, (g, W, H) => {
  g.fillStyle = '#131417'; g.fillRect(0, 0, W, H);
  const im = g.getImageData(0, 0, W, H), d = im.data, R = rnd(11);
  for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 5; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  const rrect = (ins, rad) => { g.beginPath(); g.roundRect ? g.roundRect(ins, ins, W - 2 * ins, H - 2 * ins, rad) : g.rect(ins, ins, W - 2 * ins, H - 2 * ins); };
  g.strokeStyle = `rgba(${CREAM},1)`; g.lineWidth = 9; rrect(W * .02, W * .05); g.stroke();                 /* the outline */
  g.strokeStyle = `rgba(${CREAM},.6)`; g.lineWidth = 5; rrect(W * .05, W * .035); g.stroke();                /* the inner moulding edge */
  for (const f of [.2, .8]) { g.beginPath(); g.moveTo(W * .1, H * f); g.lineTo(W * .9, H * f); g.stroke(); }  /* moulded ribs */
  g.beginPath(); g.arc(W / 2, H * .56, W * .085, 0, 7); g.stroke(); g.beginPath(); g.arc(W / 2, H * .56, W * .05, 0, 7); g.stroke();   /* the mast socket */
  g.fillStyle = `rgba(${CREAM},.3)`; for (let y = H * .3; y < H * .5; y += 18) for (let x = W * .2; x < W * .8; x += 18) g.fillRect(x, y, 3, 3);   /* fine stipple */
}));

/* a strap or rod between two points (a unit box scaled: tx across, ty thick) */
const unit = new T.BoxGeometry(1, 1, 1);
function beam(a, b, tx, ty, mat) {
  const d = b.clone().sub(a), len = d.length(), m = new T.Mesh(unit, mat);
  m.scale.set(tx, len, ty); m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.castShadow = m.receiveShadow = true; return m;
}

KIT.dish = { create(w, o = {}) {
  const pw = o.width || 1.4, k = pw / .594, m = w.mat;
  const W = .594 * k, H = .383 * k, D = .04 * k, r = .04 * k;
  const bone = new T.MeshStandardMaterial({ color: 0x6e6c67, map: capMap(faceTex(w), W, H), roughness: .5, metalness: 0, envMapIntensity: .55 });
  const bt = capMap(backTex(w), W, H);
  const shellM = new T.MeshStandardMaterial({ color: 0xffffff, map: bt, emissiveMap: bt, emissive: 0xffffff, emissiveIntensity: .16, roughness: .8, metalness: .05, envMapIntensity: .25 });
  const dk = new T.MeshStandardMaterial({ color: 0x15161a, roughness: .8, metalness: .05, envMapIntensity: .25 });
  const seamM = new T.MeshStandardMaterial({ color: 0x0f1013, roughness: .8, metalness: .05, envMapIntensity: .2 });
  const ink = new T.LineBasicMaterial({ color: 0xece6d6, transparent: true, opacity: .75 });      /* flat cream hairline, unlit */
  const mesh = (geo, mat) => { const x = new T.Mesh(geo, mat); x.castShadow = x.receiveShadow = true; return x; };
  const edged = (m, thr = 40) => { m.add(new T.LineSegments(new T.EdgesGeometry(m.geometry, thr), ink)); return m; };
  const box = (bw, bh, bd, x, y, z) => { const m = edged(mesh(new T.BoxGeometry(bw, bh, bd), dk)); m.position.set(x, y, z); return m; };

  /* the plate, in its own frame (centre at 0): back shell, seam core, face */
  const P = new T.Group();
  P.add(mesh(plate(W, H, r, -D / 2, D * .62, D * .18, D * .18, 4), shellM));                       /* the back, rounded edge */
  P.add(mesh(plate(W - .012 * k, H - .012 * k, r - .006 * k, -D / 2 + D * .5, D * .2, 0, 0, 1), seamM));   /* the seam's dark core */
  P.add(mesh(plate(W, H, r, -D / 2 + D * .62, D * .38, D * .12, D * .1, 1), bone));                 /* the face, a 4 mm chamfer */
  /* the ball collar where the mast plugs in, on the back */
  const mz = -D / 2 - .004 * k, my = -H * .06, ball = mesh(new T.SphereGeometry(.024 * k, 24, 16), dk); ball.position.set(0, my, mz); P.add(ball);
  /* the cable port at the bottom edge of the back */
  const px = W * .3, py = -H / 2 + .05 * k, pz = -D / 2 - .008 * k;
  P.add(box(.034 * k, .026 * k, .016 * k, px, py + .013 * k, pz - .002 * k));
  P.position.y = H / 2;
  const tilt = new T.Group(); tilt.add(P); tilt.rotation.x = -.62; tilt.position.y = .03 * k;
  const g = new T.Group(); g.add(tilt);
  tilt.updateMatrix(); P.updateMatrix();
  const toG = (v) => v.clone().applyMatrix4(P.matrix).applyMatrix4(tilt.matrix);

  /* the mast: a 30 mm cylinder from the ball collar straight down into the hub of the kickstand foot, a flat X of two 300 mm bars */
  const top = toG(new T.Vector3(0, my, mz)), hubH = .02 * k, mastR = .015 * k, base = hubH + .004 * k;
  const mast = mesh(new T.CylinderGeometry(mastR, mastR, top.y - base, 28), dk); mast.position.set(top.x, (top.y + base) / 2, top.z); edged(mast, 50); g.add(mast);
  const ring = mesh(new T.CylinderGeometry(mastR * 1.2, mastR * 1.2, .006 * k, 28), dk); ring.position.set(top.x, base + .014 * k, top.z); edged(ring, 50); g.add(ring);
  const hub = mesh(new T.CylinderGeometry(.034 * k, .04 * k, hubH, 32), dk); hub.position.set(top.x, hubH / 2 + .004 * k, top.z); edged(hub, 50); g.add(hub);
  for (const a of [.85, -.85]) {
    const bar = box(.3 * k, .012 * k, .04 * k, top.x, .01 * k, top.z); bar.rotation.y = -a; g.add(bar);
    for (const sgn of [-1, 1]) { const tp = mesh(new T.CylinderGeometry(.016 * k, .016 * k, .004 * k, 16), seamM); tp.position.set(top.x + sgn * Math.cos(a) * .14 * k, .002 * k, top.z + sgn * Math.sin(a) * .14 * k); g.add(tp); }
  }
  /* the cable: from the port down to the floor, away behind, ending in its plug */
  const port = toG(new T.Vector3(px, py, pz - .01 * k)), cr = .0045 * k;
  const pts = [port, port.clone().add(new T.Vector3(.004 * k, -.025 * k, -.022 * k)), new T.Vector3(port.x + .01 * k, cr * 1.6, port.z - .08 * k),
    new T.Vector3(port.x + .05 * k, cr, port.z - .17 * k), new T.Vector3(port.x + .1 * k, cr, port.z - .22 * k)];
  g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 48, cr, 8, false), seamM));
  const plug = box(.02 * k, .014 * k, .042 * k, pts[4].x + .008 * k, .007 * k, pts[4].z - .018 * k); plug.rotation.y = -.4; g.add(plug);

  const root = new T.Group(); root.add(g);
  const cs = KIT.contact(w, W * .95, .7 * k, { k: .6, pad: .3 }); cs.position.set(0, .003, -.1 * k); root.add(cs);
  root.position.set(...(o.at || [0, 0, 0])); root.rotation.y = o.yaw || 0; w.scene.add(root);
  const hgt = Math.cos(.62) * H + .07 * k;
  const hd = { group: root, w: W, h: hgt, s: { rise: o.rise ?? 1 },
    apply() { g.position.y = -(hgt + .1) * (1 - hd.s.rise); root.visible = hd.s.rise > .001; cs.set(Math.max(0, (hd.s.rise - .85) / .15)); } };
  return w.add(hd);
} };
})();
