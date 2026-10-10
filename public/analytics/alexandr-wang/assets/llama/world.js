/* The Llama world (alexandr-wang 24-llama-v2 and 25-open-bet-v2; Ive, 10 Oct 2026). One lit 3D stage the two boards share, so the
   model the viewer meets at 0:38 is the same object they watch being given away at 0:49.
   Three.js r128, driven by the board's own timeline: the page computes every position from the timeline's time (no tweens on
   3D state, no randomness but a seeded one), so ?capture, ?t= and ?still all draw the same frame for the same time.
   The look: a matte ink floor that falls into the ground at the horizon, one warm key with soft shadows, a cool rim, a studio
   environment of two soft boxes for the metal; hairline edges in cream, the house's drawn line carried into 3D. Nothing glows.
   Colours come from brand.css tokens only.

     const w = LW.world({ fov, exposure, fog: [near, far], shadow: half-extent })
     w.render()                        draw the frame and move every anchored label
     w.anchor(span, vec3)              keep a kit label (K.text's span) on a world point
     LW.box(w, h, d, mat, {pivot})     a box whose origin is its bottom-left-back corner ('corner') or its bottom centre ('base')
     LW.edges(mesh, opacity)           cream hairlines on a mesh's edges
     LW.face(w, h, draw)               a canvas texture for a plate's front face; draw(ctx, W, H) in pixels
     LW.rng(seed), LW.ease(name)       seeded random, a GSAP ease as a function
     LW.col(token, a)                  a token as a THREE.Color */
const LW = (() => {
  const css = getComputedStyle(document.documentElement);
  const tok = (v) => css.getPropertyValue(v).trim();
  /* a token as a linear-space colour (the renderer writes sRGB), so a material shows the token's own value */
  const col = (v) => new THREE.Color(tok(v)).convertSRGBToLinear();
  const rgb = (v) => tok(v).split(',').map(x => +x / 255);

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const ease = (n) => gsap.parseEase(n);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  /* progress of a move that starts at t0 and lasts d, eased */
  const prog = (t, t0, d, e = 'power2.inOut') => ease(e)(clamp01((t - t0) / d));
  const mix = (a, b, k) => a + (b - a) * k;
  const mixV = (a, b, k) => new THREE.Vector3(mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k));

  /* opacity for a label whose nearest frame edge is d px away: 0 at the edge (and beyond), 1 from 46 px in */
  const edgeFade = (d) => clamp01((d - 6) / 40);

  function world(o = {}) {
    const stage = document.querySelector('.stage');
    const canvas = document.createElement('canvas');
    canvas.className = 'lw-gl';
    stage.insertBefore(canvas, stage.firstChild);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(1920, 1080, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    /* no tone curve: the fogged floor must meet the raw ink background exactly (ACES darkened it into a band, 10 Oct) */
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const ink = col('--bg');
    scene.background = new THREE.Color(tok('--bg'));          /* the clear colour is written as is: the raw token */
    const fog = o.fog || [16, 46];
    /* r128 mixes fog after the sRGB encode, so the fog takes the raw token too (a linear ink fogged the floor to black) */
    scene.fog = new THREE.Fog(new THREE.Color(tok('--bg')), fog[0], fog[1]);
    const camera = new THREE.PerspectiveCamera(o.fov || 30, 16 / 9, .1, 400);

    /* the studio the metal reflects: a dark room, a large soft box high left, a strip low right */
    const pm = new THREE.PMREMGenerator(renderer);
    const room = new THREE.Scene();
    room.background = new THREE.Color(.012, .012, .016);
    const soft = (w, h, p, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i * .985, i * .95), side: THREE.DoubleSide }));
      m.position.set(...p); m.lookAt(0, 0, 0); room.add(m);
    };
    soft(9, 5, [-7, 9, 7], 1.5); soft(12, 1.4, [9, 3, -5], .6); soft(30, 1.2, [0, -5, 9], .12);
    scene.environment = pm.fromScene(room, .03).texture;

    /* light: a warm key from high front-left with soft shadows, a cool rim from behind, a low fill */
    scene.add(new THREE.HemisphereLight(new THREE.Color(.55, .56, .62), new THREE.Color(.05, .05, .06), .35));
    const key = new THREE.DirectionalLight(new THREE.Color(1, .955, .9), o.keyI || 1.7);
    key.position.set(...(o.key || [-9, 16, 11]));
    key.castShadow = true;
    const sh = o.shadow || 14;
    Object.assign(key.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh, near: 1, far: 200 });
    key.shadow.mapSize.set(4096, 4096);
    key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    if (o.keyTarget) key.target.position.set(...o.keyTarget);
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(new THREE.Color(.78, .84, 1), .7);
    rim.position.set(...(o.rim || [8, 7, -12]));
    scene.add(rim);

    /* the floor: matte ink a shade above the ground, so the objects stand on something and the horizon dissolves */
    const floorCol = ink.clone().lerp(col('--grey'), .16);
    /* Lambert: no specular, so the floor never mirrors the soft box at a grazing angle (a pale sheet, 10 Oct) */
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: floorCol }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    scene.add(floor);

    /* kit labels pinned to world points: the label's box (the .hk div) is moved every frame */
    const anchors = [];
    const v = new THREE.Vector3();
    function anchor(span, p, dx = 0, dy = 0) { const d = span.parentNode.parentNode; anchors.push({ d, p, dx, dy, size: parseFloat(d.style.fontSize) }); return d; }
    function render() {
      renderer.render(scene, camera);
      anchors.forEach(a => {
        v.copy(a.p).project(camera);
        const x = (v.x + 1) / 2 * 1920 + a.dx, y = (1 - v.y) / 2 * 1080 + a.dy;
        a.d.style.left = x + 'px'; a.d.style.top = (y - .92 * a.size) + 'px';
        a.d.style.visibility = v.z > 1 ? 'hidden' : '';
        /* a label never meets the frame edge: it fades out over the last 40 px before it would (10 Oct, the "8B" cut) */
        const r = a.d.firstChild.firstChild.getBoundingClientRect();
        a.d.style.opacity = edgeFade(Math.min(r.left, r.top, 1920 - r.right, 1080 - r.bottom));
      });
    }
    return { renderer, scene, camera, key, rim, floor, render, anchor };
  }

  /* a box whose origin is its bottom-left-back corner, or its bottom centre */
  function box(w, h, d, mat, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (o.pivot === 'base') g.translate(0, h / 2, 0); else g.translate(w / 2, h / 2, d / 2);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function edges(mesh, a = .3) {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: col('--cream'), transparent: true, opacity: a }));
    mesh.add(l);
    return l;
  }
  /* a plate's front face as a texture: drawn at 512 px per world unit, sRGB, sharp at an angle */
  function face(w, h, draw, renderer) {
    const PX = 512, c = document.createElement('canvas');
    c.width = Math.round(w * PX); c.height = Math.round(h * PX);
    draw(c.getContext('2d'), c.width, c.height);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    if (renderer) t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  return { world, box, edges, face, rng, ease, prog, mix, mixV, clamp01, col, tok, rgb, edgeFade };
})();
