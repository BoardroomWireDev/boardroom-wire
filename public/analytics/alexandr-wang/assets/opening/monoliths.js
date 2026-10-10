/* Monoliths (alexandr-wang, Ive, 10 Oct 2026, pass 4): the rivals act of 22-the-path in true 3D (three.js r128).
   The writer: "make them look even more ominous and robust." Two towering slabs of honed dark stone stand behind Meta's point
   at the end of the path; a light behind them rakes their inner faces and spills through the gap toward the point, rims catch
   their outer edges, their shadows fall forward; on "formidable" a low light from the front comes up and the marks, inlaid in
   polished metal on the faces, catch it. Nothing glows: every bright thing is a lit surface.

   The hand-off is matched: the scene opens on the same frame the flat world ends on (the path, the month lines and Meta's point,
   seen straight down at the 2D camera's scale), then the camera tilts down to Meta's point at ground level.

   Monoliths.init({ stage, X1, PY, cam2d: {cx, cy, s}, months: [{x, q}], logos: {a, b}, nameA, label })
     → { state: {on, u, rise, back, key, dolly}, render() }   state is tweened by the page's timeline; render() draws one frame.
   Units: one unit = 100 world px; Meta's point is the origin; the path runs along x; the ground is y = 0; "up the screen" in the
   flat world is -z. */
const Monoliths = (() => {
  function noiseTex(w, h, seed, streak) {                  /* honed stone: fine grain with a faint vertical streak */
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const im = g.createImageData(w, h); let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const col = new Float32Array(w); for (let x = 0; x < w; x++) col[x] = rnd();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = 128 + (rnd() - .5) * 70 + (col[x] - .5) * streak;
      const i = (y * w + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = Math.max(0, Math.min(255, v)); im.data[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  function markTex(img, name, w, h) {                      /* the mark (and the name under it) on a transparent sheet */
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const nameH = name ? h * .4 : 0, mh = h - nameH;
    const k = Math.min(w / img.naturalWidth, mh / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    g.drawImage(img, (w - iw) / 2, (mh - ih) / 2, iw, ih);
    if (name) { g.fillStyle = 'rgba(255,255,255,.62)'; g.font = `500 ${Math.round(nameH * .62)}px Inter, sans-serif`; g.textAlign = 'center';
                g.textBaseline = 'middle'; g.fillText(name, w / 2, mh + nameH * .55); }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
  }

  function init(o) {
    const W = 1920, H = 1080;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1); renderer.setSize(W, H);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const cv = renderer.domElement; Object.assign(cv.style, { position: 'absolute', left: 0, top: 0, width: W + 'px', height: H + 'px', zIndex: 7, opacity: 0 });
    o.stage.appendChild(cv);
    const INK = 0x0a0a0f, CREAM = 0xf5f1e5;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(INK);
    scene.fog = new THREE.FogExp2(INK, 0.0);
    const u = (x) => (x - o.X1) / 100;

    /* the ground: ink when unlit (emissive), so the matched frame is the flat world exactly */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x131318, emissive: INK, roughness: .95, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const strip = (x0, z0, x1, z1, wid, color, op) => {     /* a line drawn on the ground */
      const len = Math.hypot(x1 - x0, z1 - z0), m = new THREE.Mesh(new THREE.PlaneGeometry(len, wid),
        new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z1 - z0, x1 - x0); m.position.set((x0 + x1) / 2, .002, (z0 + z1) / 2); scene.add(m); return m;
    };
    const px = 1 / (100 * o.cam2d.s);                       /* one screen px at the hand-off, in units */
    o.months.forEach(m => strip(u(m.x), -15, u(m.x), 11, 2 * px, CREAM, m.q ? .085 : .045));
    strip(-30, 0, 0, 0, 3 * px, CREAM, .86);                /* the path behind Meta, solid */
    const dot = new THREE.Mesh(new THREE.CircleGeometry(.08, 40), new THREE.MeshBasicMaterial({ color: CREAM }));
    dot.rotation.x = -Math.PI / 2; dot.position.y = .004; scene.add(dot);

    /* the monoliths: honed dark stone, sharp arrises, standing behind the point with a narrow gap between */
    const Wm = 6.4, Dm = 3.2, Hm = 24, GAP = 2.4, Z = -5.2;    /* pass 6b: a wider slit, so "Meta" stands in it at 34 px */
    const grain = noiseTex(512, 512, 7, 26);
    const stone = new THREE.MeshStandardMaterial({ color: 0x34343b, roughness: .72, metalness: .32, roughnessMap: grain, bumpMap: grain, bumpScale: .0035 });
    grain.repeat.set(2, 6);
    /* the same objects as 17-the-marks-v2 and H9 (continuity, Jarvis 10 Oct): dark slabs, cream diagonal hatching at the same angle and
       density per face width (26 px in 512), a solid band across the face where the mark prints; here taller, heavier, uplit */
    const BAND_Y = 7.1, BAND_H = 3.0;
    const hatch = (w, h, band) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
      g.fillStyle = "#121216"; g.fillRect(0, 0, w, h); g.strokeStyle = "#f5f1e5"; g.globalAlpha = .5; g.lineWidth = 3;
      for (let k = -h; k < w + h; k += 26) { g.beginPath(); g.moveTo(k, h); g.lineTo(k + h, 0); g.stroke(); }
      if (band) { g.globalAlpha = 1; g.fillStyle = "#0d0d10"; g.fillRect(0, (1 - (BAND_Y + BAND_H / 2) / Hm) * h, w, BAND_H / Hm * h); }
      const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; };
    const faceMat = new THREE.MeshStandardMaterial({ map: hatch(512, Math.round(512 * Hm / Wm), true), roughness: .66, metalness: .12, roughnessMap: grain });
    const sideMat = new THREE.MeshStandardMaterial({ map: hatch(Math.round(512 * Dm / Wm), Math.round(512 * Hm / Wm), false), roughness: .66, metalness: .12 });
    const capHatch = hatch(512, Math.round(512 * Dm / Wm), false);
    const capMat = new THREE.MeshStandardMaterial({ map: capHatch, emissive: 0xffffff, emissiveMap: capHatch, emissiveIntensity: .32, roughness: .66, metalness: .12 });   /* hatched tops, printed so they read unlit from above: hatched footprints at the hand-off (H9's sign), objects as they rise */
    const mats = [sideMat, sideMat, capMat, capMat, faceMat, sideMat];          /* +x -x +y -y +z(front) -z */
    const slabs = [-1, 1].map(sx => {
      const g = new THREE.BoxGeometry(Wm, Hm, Dm); g.translate(0, Hm / 2, 0);
      const m = new THREE.Mesh(g, mats); m.position.set(sx * (GAP / 2 + Wm / 2), 0, Z); m.castShadow = m.receiveShadow = true;
      m.scale.y = .001; scene.add(m); return m;
    });
    /* the marks, inlaid: polished metal sheets flush on the front faces, high up */
    const inlay = (img, name, sx, w, h, y) => {
      const mat = new THREE.MeshStandardMaterial({ map: markTex(img, name, 1024, Math.round(1024 * h / w)), color: 0xe9e5d8, metalness: .12,
        roughness: .45, transparent: true, alphaTest: .02 });   /* a matte inlay, like honed white stone set into the dark */
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(0, y, Dm / 2 + .004); slabs[sx < 0 ? 0 : 1].add(m); return m;
    };
    inlay(o.logos.a, o.nameA, -1, 5.0, 5.0 * (195 / 1600) / .6, BAND_Y);          /* printed in the band */
    inlay(o.logos.b, '', 1, 4.7, 4.7 * (434 / 1600), BAND_Y);

    /* the light: behind the gap (a raking spot that also lays a lit corridor to the point), two rims from behind, and the low key */
    const back = new THREE.SpotLight(0xfff4e2, 0, 60, .42, .55, 1.2); back.position.set(0, 4.5, -22); back.target.position.set(0, 0, -1.5);
    back.castShadow = true; back.shadow.mapSize.set(2048, 2048); back.shadow.bias = -.0004; scene.add(back, back.target);
    const rims = [-1, 1].map(sx => { const d = new THREE.DirectionalLight(0xe8ecff, 0); d.position.set(sx * 14, 9, -16); scene.add(d); return d; });
    const key = new THREE.PointLight(0xfff1dc, 0, 20, 2); key.position.set(0, 1.4, 1.2); scene.add(key);   /* low, in front: an uplight that falls off up the faces */
    const fill = new THREE.HemisphereLight(0xd8dcff, 0x0a0a0f, 0); scene.add(fill);   /* a dim sky fill: the stone reads as stone before the key comes up */
    const amb = new THREE.AmbientLight(0xffffff, 0); scene.add(amb);

    /* the camera: matched top-down view (u = 0) to low at the point looking up (u = 1), then a slow creep (dolly) */
    const FOV0 = 30, cam = new THREE.PerspectiveCamera(FOV0, W / H, .05, 400);
    const h0 = 540 / (100 * o.cam2d.s) / Math.tan(FOV0 / 2 * Math.PI / 180);
    const zc = (o.cam2d.cy - o.PY) / 100, xc = u(o.cam2d.cx);
    const P0 = new THREE.Vector3(xc, h0, zc), T0 = new THREE.Vector3(xc, 0, zc), U0 = new THREE.Vector3(0, 0, -1);
    /* pass 6 (rule 3): the landing camera looks level (target at its own height) and the lens shifts up instead of tilting, the way an
       architectural camera does: the slabs' sides stay vertical and parallel, nothing diagonal. The tilt down from above is transit. */
    const P1 = new THREE.Vector3(0, .55, 10.5), T1 = new THREE.Vector3(0, .55, -5), U1 = new THREE.Vector3(0, 1, 0);
    const P2 = new THREE.Vector3(0, .45, 8.9), T2 = new THREE.Vector3(0, .45, -5);
    const SHIFT = .36;                                      /* the lens rise at the landing, in frame heights */
    const state = { on: 0, u: 0, rise: 0, back: 0, key: 0, dolly: 0 };
    const v = new THREE.Vector3(), tg = new THREE.Vector3(), up = new THREE.Vector3();
    const label = o.label;

    function render() {
      cv.style.opacity = state.on ? 1 : 0;
      if (label) label.style.opacity = state.on ? 1 : 0;
      if (!state.on) return;
      const e = state.u;                                     /* the page eases u */
      v.lerpVectors(P0, P1, e);
      tg.lerpVectors(T0, T1, Math.pow(e, 1.3));
      if (state.dolly > 0) { v.lerp(P2, state.dolly); tg.lerp(T2, state.dolly); }
      up.lerpVectors(U0, U1, Math.min(1, e * 1.6)).normalize();
      cam.fov = FOV0 + 18 * e;
      const sh = SHIFT * Math.pow(e, 2); if (sh > 0) cam.setViewOffset(W, H, 0, -H * sh, W, H); else { cam.clearViewOffset(); cam.updateProjectionMatrix(); }
      cam.position.copy(v); cam.up.copy(up); cam.lookAt(tg);
      slabs.forEach(s => { s.scale.y = Math.max(.001, state.rise); s.visible = state.rise > .004; });   /* unrisen, they are not there */
      back.intensity = 3.6 * state.back; rims.forEach(r => { r.intensity = .55 * state.back; });
      key.intensity = 3.2 * state.key; amb.intensity = .1 * state.back; fill.intensity = .75 * state.back;   /* the stone in shadow still reads as stone */
      scene.fog.density = .028 * Math.min(1, e * 1.5);
      renderer.render(scene, cam);
      if (window.__geom) slabs.forEach((s, i) => { if (!s.visible) return;     /* the slabs' screen outlines, for the frame check */
        const bx = new THREE.Box3().setFromObject(s), xs = [], ys = [];
        for (const X of [bx.min.x, bx.max.x]) for (const Y of [bx.min.y, bx.max.y]) for (const Zz of [bx.min.z, bx.max.z]) {
          const q = new THREE.Vector3(X, Y, Zz).project(cam); if (q.z > 1) continue; xs.push((q.x + 1) / 2 * W); ys.push((1 - q.y) / 2 * H); }
        if (xs.length) window.__geom.push({ n: "slab" + i, r: [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] }); });
      if (label) {                                         /* Meta's name over its point, in screen space */
        const p = new THREE.Vector3(0, 1.15 * e, -.22 * (1 - e)).project(cam);   /* standing: up in the dark gap, off the lit floor */   /* above the point on screen, flat or standing */
        const lx = (p.x + 1) / 2 * W, ly = (1 - p.y) / 2 * H - 6; label.style.left = lx + 'px'; label.style.top = ly + 'px';
        const d = Math.min(lx - 40, ly - 30, W - lx - 40, H - ly - 8); label.style.opacity = Math.max(0, Math.min(1, d / 36)) * Math.max(0, Math.min(1, (e - .9) / .1));   /* fades before an edge; shown once the camera has settled */
      }
    }
    return { state, render, canvas: cv };
  }
  return { init };
})();
