/* ============================================================
   BOARDROOM WIRE · STAGE3D (Ive, 10 Oct 2026; alexandr-wang 26-hiring-spree, 27-the-offer)
   A small, deterministic three.js stage for boards that need depth, light and material (the motion-pass brief,
   "What failed the first review"): one camera through one built world, lit like a product photograph.
   No emission, no bloom, no haze, no particles (REJECTIONS AI-LOOK). Light is a key, a fill and a moving pool.
   Everything is a pure function of the board clock: draw(t) sets the world and renders, so ?capture, ?t=, ?still
   and ?final all hold (the page's GSAP timeline calls draw from one proxy tween).
   Requires three.js r128 (cdnjs) before this file. Words drawn into textures are mirrored into .s3-words so
   `bw words` reads exactly what the viewer reads.
   ============================================================ */
const S3 = (() => {
  const T = THREE;
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const lin = (hex) => new T.Color(hex).convertSRGBToLinear();

  /* ---------- renderer, scene, camera ---------- */
  function init(o = {}) {
    const stage = document.querySelector('.stage');
    const cv = document.createElement('canvas');
    cv.className = 's3-canvas';
    stage.insertBefore(cv, stage.firstChild);
    const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(1920, 1080);
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = o.exposure || 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.physicallyCorrectLights = true;
    const scene = new T.Scene();
    scene.background = lin(o.bg || css('--bg'));
    const camera = new T.PerspectiveCamera(o.fov || 30, 1920 / 1080, 0.05, 400);
    scene.environment = studioEnv(renderer);
    const labels = document.createElement('div'); labels.className = 's3-labels'; stage.appendChild(labels);
    const words = document.createElement('div'); words.className = 's3-words'; stage.appendChild(words);
    return { renderer, scene, camera, cv, labels, words, stage };
  }

  /* a studio for reflections only: a dark room, one long softbox overhead and two narrow strips. It is never seen. */
  function studioEnv(renderer) {
    const env = new T.Scene();
    env.background = new T.Color(0x050506);
    const room = new T.Mesh(new T.BoxGeometry(40, 20, 40), new T.MeshBasicMaterial({ color: 0x0c0c0e, side: T.BackSide }));
    env.add(room);
    const panel = (w, h, x, y, z, ry, rx, k) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k * .97, k * .9), side: T.DoubleSide }));
      m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
    };
    panel(16, 5, 0, 9.5, -2, 0, Math.PI / 2, 5.0);       // overhead softbox
    panel(3, 12, -15, 4, 4, Math.PI / 2, 0, 2.2);        // left strip
    panel(3, 12, 15, 4, -6, -Math.PI / 2, 0, 1.2);       // right strip, weaker
    panel(20, 3, 0, 2, 19, Math.PI, 0, .6);              // a low bounce behind the camera
    const pm = new T.PMREMGenerator(renderer);
    const rt = pm.fromScene(env, 0.02);
    pm.dispose();
    return rt.texture;
  }

  /* ---------- materials and objects ---------- */
  /* palette colours come from the brand tokens; MAT holds the colours of the world's physical materials (stone, slab, card
     stock), which are not palette colours and are kept here, named, as numbers */
  const MAT = { floor: 0x0b0b0f, slab: 0x16161b, graphite: 0x17171d, paper: 0xf2eee4, stone: 0xb8b3a8, card: 0x26262d, cardEdge: 0x24242b };
  const tok = (n, k = 1) => { const c = lin(css(n)); return c.multiplyScalar(k); };   /* a token, optionally darkened (an ink, a track) */
  const col = (v) => v instanceof T.Color ? v : typeof v === 'number' ? new T.Color(v).convertSRGBToLinear() : lin(v);
  const mat = {
    floor: (o = {}) => new T.MeshStandardMaterial({ color: col(o.color ?? MAT.floor), roughness: o.rough ?? .38, metalness: 0, envMapIntensity: o.env ?? .55 }),
    gold: (o = {}) => new T.MeshStandardMaterial({ color: col(o.color ?? tok('--gold')), roughness: o.rough ?? .3, metalness: 1, envMapIntensity: o.env ?? 1.15 }),
    graphite: (o = {}) => new T.MeshStandardMaterial({ color: col(o.color ?? MAT.graphite), roughness: o.rough ?? .55, metalness: o.metal ?? .15, envMapIntensity: o.env ?? .6 }),
    paper: (map, o = {}) => new T.MeshStandardMaterial({ map, color: col(o.color ?? MAT.paper), roughness: .88, metalness: 0, envMapIntensity: .25 }),
    ink: (o = {}) => new T.MeshStandardMaterial({ color: col(o.color ?? tok('--gold')), roughness: .55, metalness: .35, envMapIntensity: .5 })
  };

  /* the ground: a dark honed stone with a fine, seeded grain (so the light shows a surface, not a haze) */
  function floor(scene, o = {}, renderer) {
    const material = mat.floor(o);
    if (renderer) {
      let s = 1234567;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const N = 1024;
      const paint = (g, w, h, base, amp) => {
        const im = g.createImageData(w, h), d = im.data;
        /* low-frequency mottling from a few soft blobs, then per-pixel grain */
        const blobs = Array.from({ length: 24 }, () => [rnd() * w, rnd() * h, 30 + rnd() * 110, (rnd() - .5) * 2]);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          let v = 0;
          for (const [bx, by, r, k] of blobs) { const dx = Math.min(Math.abs(x - bx), w - Math.abs(x - bx)), dy = Math.min(Math.abs(y - by), h - Math.abs(y - by)); v += k * Math.exp(-(dx * dx + dy * dy) / (r * r)); }
          const n = base + amp * (v * .5 + (rnd() - .5) * 1.2);
          const i = (y * w + x) * 4; d[i] = d[i + 1] = n; d[i + 2] = n + 1; d[i + 3] = 255;
        }
        g.putImageData(im, 0, 0);
      };
      const map = canvasTex(renderer, N, N, (g, w, h) => paint(g, w, h, o.base ?? 16, o.amp ?? 7));
      map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(o.repeat ?? 22, o.repeat ?? 22);
      const rough = canvasTex(renderer, N, N, (g, w, h) => paint(g, w, h, 170, 40));
      rough.encoding = T.LinearEncoding; rough.wrapS = rough.wrapT = T.RepeatWrapping; rough.repeat.copy(map.repeat);
      material.map = map; material.roughnessMap = rough; material.color = new T.Color(1, 1, 1); material.needsUpdate = true;
    }
    const m = new T.Mesh(new T.PlaneGeometry(o.size || 200, o.size || 200), material);
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true; scene.add(m); return m;
  }

  /* a bevelled block whose base sits at y = 0 of its group; w along x, h up, d along z */
  function block(w, h, d, material, bevel = .02) {
    const b = Math.min(bevel, w / 4, d / 4, h / 4);
    const s = new T.Shape(); const x0 = -w / 2 + b, z0 = -d / 2 + b, x1 = w / 2 - b, z1 = d / 2 - b;
    s.moveTo(x0, z0); s.lineTo(x1, z0); s.lineTo(x1, z1); s.lineTo(x0, z1); s.lineTo(x0, z0);
    const g = new T.ExtrudeGeometry(s, { depth: Math.max(h - 2 * b, 0.0001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 4 });
    /* the extrusion runs along +z before the turn; after rotateX(-90°) it runs up +y (the shape is symmetric in z) */
    g.rotateX(-Math.PI / 2); g.translate(0, b, 0);
    const m = new T.Mesh(g, material); m.castShadow = true; m.receiveShadow = true; return m;
  }

  /* a sheet of paper lying on the floor (or any plane), w × h in world units, with a gentle curl along its width */
  function sheet(map, w, h, o = {}) {
    const g = new T.PlaneGeometry(w, h, 48, 6);
    const p = g.attributes.position, curl = o.curl ?? .012, lift = o.lift ?? .004, cup = o.cup ?? .004;
    const zf = (x, y) => lift + curl * (x / (w / 2)) ** 2 * w * .5 + cup * (y / (h / 2)) ** 2;
    for (let i = 0; i < p.count; i++) p.setZ(i, zf(p.getX(i), p.getY(i)));
    g.computeVertexNormals();
    const m = new T.Mesh(g, mat.paper(map, o)); m.rotation.x = -Math.PI / 2; m.castShadow = true; m.receiveShadow = true;
    m.userData = { w, h, zf };
    return m;
  }

  /* a gold pen line drawn on a sheet, in the sheet's own texture coordinates (u from the left edge, v from the top, 0..1).
     Follows the paper's curl, wobbles a little like a hand, tapers at both ends; set(p) draws it to p (0..1). */
  function pen(sheetMesh, u0, u1, v, o = {}) {
    const { w, h, zf } = sheetMesh.userData, N = 64, width = o.width || .03, seed = o.seed || 1;
    const g = new T.BufferGeometry(), pos = new Float32Array((N + 1) * 2 * 3), idx = [];
    for (let i = 0; i < N; i++) { const a = 2 * i, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    g.setIndex(idx); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const x0 = -w / 2 + u0 * w, x1 = -w / 2 + u1 * w, y0 = h / 2 - v * h;
    const wob = (s) => Math.sin(s * 9.1 + seed) * .006 + Math.sin(s * 23.7 + seed * 2) * .003 + (o.rise || 0) * s;
    const m = new T.Mesh(g, o.material || mat.ink()); m.renderOrder = 2;
    sheetMesh.add(m);
    m.set = (p) => {
      p = clamp(p); m.visible = p > 0.001;
      const xe = x0 + (x1 - x0) * p;
      for (let i = 0; i <= N; i++) {
        const s = i / N, x = x0 + (xe - x0) * s, along = (x - x0) / (x1 - x0 || 1);
        const taper = Math.min(1, along / .04, (1 - along) / .06 + .35) * .5 + .5;
        const y = y0 + wob(along), hw = width / 2 * taper;
        for (const [k, dy] of [[0, hw], [1, -hw]]) {
          const j = (2 * i + k) * 3; pos[j] = x; pos[j + 1] = y + dy; pos[j + 2] = zf(x, y + dy) + .0025;
        }
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
    };
    m.set(0);
    return m;
  }

  /* a flat ribbon that grows from u = 0 to 1 (a pen line, an engraved track); lies in its parent's xy plane */
  function ribbon(len, width, material) {
    const g = new T.PlaneGeometry(1, width); g.translate(.5, 0, 0);
    const m = new T.Mesh(g, material); m.scale.x = len; m.userData.len = len; return m;
  }

  /* ---------- textures ---------- */
  const loader = new T.TextureLoader();
  function tex(renderer, url) {
    return new Promise((res, rej) => loader.load(url, (t) => { prep(renderer, t); res(t); }, undefined, () => rej(new Error('texture ' + url))));
  }
  function prep(renderer, t) {
    t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true;
    t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter; t.needsUpdate = true; return t;
  }
  function canvasTex(renderer, w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); paint(g, w, h);
    return prep(renderer, new T.CanvasTexture(c));
  }
  function img(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + url)); i.src = url; }); }

  /* ---------- time ---------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    io: (u) => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    out: (u) => 1 - Math.pow(1 - u, 3),
    out5: (u) => 1 - Math.pow(1 - u, 5),
    in: (u) => u * u * u,
    s: (u) => u * u * (3 - 2 * u)
  };
  const mix = (a, b, u) => a + (b - a) * u;
  /* eased progress of a move from a to b seconds */
  const go = (t, a, b, e = ease.io) => e(ramp(t, a, b));

  /* a C1 path through timed keys: [{t, v:[...]}]; cubic Hermite with Catmull-Rom tangents in time, flat at both ends */
  function path(keys) {
    const n = keys.length;
    const tan = keys.map((k, i) => {
      if (i === 0 || i === n - 1 || k.hold) return k.v.map(() => 0);
      const a = keys[i - 1], b = keys[i + 1];
      return k.v.map((_, j) => (b.v[j] - a.v[j]) / (b.t - a.t));
    });
    return (t) => {
      if (t <= keys[0].t) return keys[0].v.slice();
      if (t >= keys[n - 1].t) return keys[n - 1].v.slice();
      let i = 0; while (i < n - 2 && t > keys[i + 1].t) i++;
      const a = keys[i], b = keys[i + 1], dt = b.t - a.t, u = (t - a.t) / dt;
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
      return a.v.map((_, j) => h00 * a.v[j] + h10 * dt * tan[i][j] + h01 * b.v[j] + h11 * dt * tan[i + 1][j]);
    };
  }

  /* ---------- labels: DOM type pinned to world points (crisp Plex Mono at 4K) ---------- */
  const V = new T.Vector3();
  function project(camera, x, y, z) {
    V.set(x, y, z).project(camera);
    return { x: (V.x + 1) / 2 * 1920, y: (1 - V.y) / 2 * 1080, behind: V.z > 1 };
  }
  function label(host, cls, text) {
    const e = document.createElement('div'); e.className = 's3-label ' + cls; e.textContent = text; host.appendChild(e); return e;
  }
  /* place a label at a world point; ax/ay are the anchor (0 left/top … 1 right/bottom) */
  function pin(camera, e, p, o = {}) {
    const s = project(camera, p[0], p[1], p[2]);
    const ax = o.ax ?? 0, ay = o.ay ?? 1;
    e.style.transform = `translate(${(s.x + (o.dx || 0)).toFixed(2)}px, ${(s.y + (o.dy || 0)).toFixed(2)}px) translate(${-ax * 100}%, ${-ay * 100}%)` + (o.scale ? ` scale(${o.scale})` : '');
    e.style.opacity = s.behind ? 0 : (o.op ?? 1);
    return s;
  }
  /* words painted into a texture, mirrored for the words lint (transparent, in frame, never seen) */
  function mirror(host, lines) {
    lines.forEach(l => { const e = document.createElement('div'); e.textContent = l; host.appendChild(e); });
  }

  /* ---------- the frame check (BRIEF-motion-pass, "Before you report"): every frame, by geometry, not by eye ----------
     watch(name, object3D) registers a solid; window.__s3check() returns, for the frame on screen, each visible label's box, the
     credit's box and each solid's screen hull, and lists collisions (label/label, label/solid, label/credit), crops (a visible label
     not wholly in frame) and credit-over-solid. Run by the renderer, one call per frame. */
  const watched = [];
  function watch(name, obj, o = {}) { watched.push({ name, obj, o }); }
  const hullOf = (camera, obj) => {
    obj.updateWorldMatrix(true, true);
    const pts = [];
    obj.traverse((n) => {
      if (!n.isMesh || !n.visible || !n.geometry) return;
      let hidden = false; for (let p = n; p; p = p.parent) if (!p.visible) hidden = true; if (hidden) return;
      if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
      const b = n.geometry.boundingBox;
      if (n.isInstancedMesh) {
        const M = new T.Matrix4();
        for (const i of [0, n.count - 1]) { n.getMatrixAt(i, M); for (let k = 0; k < 8; k++) { const v = new T.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(M).applyMatrix4(n.matrixWorld); pts.push(v); } }
      } else for (let k = 0; k < 8; k++) pts.push(new T.Vector3(k & 1 ? b.max.x : b.min.x, k & 2 ? b.max.y : b.min.y, k & 4 ? b.max.z : b.min.z).applyMatrix4(n.matrixWorld));
    });
    pts.forEach(v => { if (v.y < 0) v.y = 0; });          /* below the floor is hidden by the floor (the camera is always above it) */
    const s = pts.map(v => { const q = v.clone().project(camera); return { x: (q.x + 1) / 2 * 1920, y: (1 - q.y) / 2 * 1080, z: q.z }; }).filter(q => q.z < 1);
    if (s.length < 3) return null;
    s.sort((a, b) => a.x - b.x || a.y - b.y);                                   /* convex hull, monotone chain */
    const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lo = [], hi = [];
    for (const p of s) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of s.slice().reverse()) { while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
    return lo.slice(0, -1).concat(hi.slice(0, -1)).map(p => [p.x, p.y]);
  };
  /* separating axis: rectangle {l,t,r,b} against a convex polygon */
  function rectHits(r, poly) {
    const R = [[r.l, r.t], [r.r, r.t], [r.r, r.b], [r.l, r.b]];
    const axes = [[1, 0], [0, 1]];
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; axes.push([b[1] - a[1], a[0] - b[0]]); }
    for (const [ax, ay] of axes) {
      const pr = (P) => P.map(([x, y]) => x * ax + y * ay);
      const A = pr(R), B = pr(poly);
      if (Math.max(...A) <= Math.min(...B) || Math.max(...B) <= Math.min(...A)) return false;
    }
    return true;
  }
  function checker(camera) {
    window.__s3check = () => {
      const out0 = { collisions: [], crops: [], credit: [] };
      const rects = [];
      document.querySelectorAll('.s3-label').forEach((e) => {
        const op = +getComputedStyle(e).opacity; if (!(op > .02) || !e.textContent.trim()) return;
        const b = e.getBoundingClientRect(); rects.push({ name: e.textContent.trim(), l: b.left, t: b.top, r: b.right, b: b.bottom });
      });
      const cEl = document.querySelector('.bw-prov .bw-source');
      let credit = null;
      if (cEl && cEl.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(cEl); const cb = rg.getBoundingClientRect(); credit = { name: 'credit', l: cb.left, t: cb.top, r: cb.right, b: cb.bottom }; }   /* the text itself, not its block */
      out0.creditBox = credit && [credit.l, credit.t, credit.r, credit.b].map(Math.round);
      const solids = watched.map(w => ({ name: w.name, hull: hullOf(camera, w.obj), o: w.o })).filter(w => w.hull);
      const out = out0;
      const pad = 6, grow = (r) => ({ l: r.l - pad, t: r.t - pad, r: r.r + pad, b: r.b + pad });
      rects.forEach((r, i) => {
        if (r.l < 0 || r.t < 0 || r.r > 1920 || r.b > 1080) out.crops.push(r.name);
        rects.slice(i + 1).forEach(q => { if (r.l < q.r && q.l < r.r && r.t < q.b && q.t < r.b) out.collisions.push(r.name + ' / ' + q.name); });
        if (credit && r.l < credit.r && credit.l < r.r && r.t < credit.b && credit.t < r.b) out.collisions.push(r.name + ' / credit');
        solids.forEach(s => { if (!(s.o.allow || []).includes(r.name) && rectHits(grow(r), s.hull)) out.collisions.push(r.name + ' / ' + s.name); });
      });
      if (credit) solids.forEach(s => { if (rectHits(credit, s.hull)) out.credit.push(s.name); });
      return out;
    };
  }

  return { T, MAT, tok, col, css, init, mat, floor, block, sheet, pen, ribbon, watch, checker, tex, canvasTex, img, clamp, ramp, ease, mix, go, path, project, label, pin, mirror, lin };
})();
