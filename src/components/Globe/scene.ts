/**
 * Wire Globe v2 — the homepage globe as a purpose-built three.js scene (replaces globe.gl,
 * 27 Sep 2026). About eight draw calls; glow is drawn in the shaders (no bloom pass), so only
 * live elements glow — the rule the Blender plates follow.
 *
 *   rig (tilt + cursor parallax) → spin (yaw)  → body · land dots · capitals · routes
 *                                → orbits      → rings + satellites
 *   scene                        → motes (drifting bokeh)
 *
 * The land is a dot grid built by scripts/build-globe-data.mjs; the day/night terminator follows
 * the real sun (sun.ts). Colours are written as the brand's sRGB hex values with no tone mapping
 * or colour management, so gold renders as #D4AF37.
 */
import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CatmullRomCurve3, ColorManagement, Group,
  InstancedBufferAttribute, InstancedBufferGeometry, LinearSRGBColorSpace, LineBasicMaterial, LineLoop,
  Mesh, NoToneMapping, PerspectiveCamera, Points, Scene, ShaderMaterial, SphereGeometry, TubeGeometry,
  Vector3, Vector4, WebGLRenderer, Color,
} from 'three';
import { CAPITALS, EDGES } from './capitals';
import { subsolar, sunCaption } from './sun';

ColorManagement.enabled = false;   // hex in, hex out

const D2R = Math.PI / 180;
const rgb = (hex: string) => { const c = new Color(hex); return new Vector3(c.r, c.g, c.b); };
const C = {
  body: rgb('#07070A'), gold: rgb('#D4AF37'), goldBright: rgb('#F2CB52'),
  amber: rgb('#FFB347'), amberBright: rgb('#FFC97A'), cream: rgb('#F5F1E5'),
};
const BASE_PITCH = 0.30, ROLL = -0.07;          // north tilted toward the viewer
const AUTO_SPIN = (2 * Math.PI) / 120;           // one turn in two minutes, west → east
const FOV = 28;

export const ll2v = (lat: number, lon: number, r = 1) =>
  new Vector3(Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R), Math.cos(lat * D2R) * Math.cos(lon * D2R)).multiplyScalar(r);

export type Tier = 'full' | 'lite';
export interface GlobeOptions {
  host: HTMLElement;                 // the element the canvas fills
  label: HTMLElement;                // floating label plate
  caption?: HTMLElement | null;      // "SUN 1.9°S …"
  live?: HTMLElement | null;         // aria-live region
  tier: Tier;
  reduced: boolean;
  onFirstFrame?: () => void;
}
export interface GlobeApi {
  hover(i: number | null): void;
  select(i: number | null): void;
  destroy(): void;
}

/* ------------------------------------------------------------------ land */
async function loadLand(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  const step = dv.getFloat32(0, true), latMin = dv.getFloat32(4, true);
  const nRings = dv.getUint16(12, true);
  const ns: number[] = []; for (let i = 0; i < nRings; i++) ns.push(dv.getUint16(14 + i * 2, true));
  const cells = ns.reduce((a, b) => a + b, 0);
  const bitsAt = 14 + nRings * 2, coastAt = bitsAt + Math.ceil(cells / 8);
  const pos: number[] = [], coast: number[] = [], seed: number[] = [];
  let k = 0, l = 0;
  for (let i = 0; i < nRings; i++) {
    const lat = latMin + (i + 0.5) * step;
    for (let j = 0; j < ns[i]; j++, k++) {
      if (!((dv.getUint8(bitsAt + (k >> 3)) >> (k & 7)) & 1)) continue;
      const v = ll2v(lat, -180 + ((j + 0.5) * 360) / ns[i]);
      pos.push(v.x, v.y, v.z);
      coast.push(dv.getUint8(coastAt + l++) / 3);
      seed.push(Math.random());
    }
  }
  return { step, pos: new Float32Array(pos), coast: new Float32Array(coast), seed: new Float32Array(seed) };
}

const QUAD = (() => {                 // unit quad corners, shared by the instanced layers
  const g = new BufferGeometry();
  g.setAttribute('corner', new BufferAttribute(new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
})();
const instanced = (count: number) => {
  const g = new InstancedBufferGeometry();
  g.setAttribute('corner', QUAD.getAttribute('corner'));
  g.setIndex(QUAD.getIndex());
  g.instanceCount = count;
  return g;
};

/* --------------------------------------------------------------- shaders */
const BODY_VS = /* glsl */ `
  varying vec3 vObj; varying vec3 vN;
  void main() { vObj = position; vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BODY_FS = /* glsl */ `
  uniform vec3 uBody, uGold, uSun; uniform float uGrid;
  varying vec3 vObj; varying vec3 vN;
  void main() {
    vec3 p = normalize(vObj);
    float fres = pow(1.0 - clamp(vN.z, 0.0, 1.0), 3.0);            // plate recipe: 0.09 facing → 0.55 grazing
    vec3 col = uBody + uGold * (0.045 + 0.50 * fres);
    float lat = asin(clamp(p.y, -1.0, 1.0)), lon = atan(p.x, p.z);
    vec2 g = vec2(lon, lat) * (57.2958 / 15.0);                      // 15° graticule, analytic + AA
    vec2 d = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    float latLine = 1.0 - min(d.y, 1.0);
    float lonLine = (1.0 - min(d.x, 1.0)) * smoothstep(80.0, 66.0, abs(lat) * 57.2958);
    float day = smoothstep(-0.15, 0.2, dot(p, uSun));
    col = col * mix(0.72, 1.0, day) + uGold * max(latLine, lonLine) * uGrid * (0.5 + 0.5 * fres);
    gl_FragColor = vec4(col, 1.0);
  }`;

const LAND_VS = /* glsl */ `
  attribute vec2 corner; attribute vec3 aPos; attribute float aCoast; attribute float aSeed;
  uniform float uTime, uSize, uShimmer, uNight; uniform vec3 uSun; uniform vec4 uRipple[4];
  varying vec2 vUv; varying float vCoast, vSwell, vLum;
  void main() {
    vec3 n = aPos;
    vec3 t = normalize(cross(abs(n.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0), n));
    vec3 b = cross(n, t);
    float swell = 0.0;                                                // click ripple: an angular wavefront
    for (int i = 0; i < 4; i++) {
      vec4 r = uRipple[i]; float age = uTime - r.w;
      if (r.w < 0.0 || age < 0.0 || age > 2.6) continue;
      float front = age * 1.15, ang = acos(clamp(dot(n, r.xyz), -1.0, 1.0));
      float d = (ang - front) / 0.035;
      swell = max(swell, exp(-0.5 * d * d) * (1.0 - age / 2.6));
    }
    float day = smoothstep(-0.12, 0.14, dot(n, uSun));
    vLum = mix(uNight, 1.0, day) * (1.0 + uShimmer * sin(uTime * (0.9 + 2.2 * aSeed) + aSeed * 6.2832));
    vUv = corner; vCoast = aCoast; vSwell = swell;
    vec3 p = n * 1.003 + (t * corner.x + b * corner.y) * uSize * (1.0 + 0.7 * swell);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const LAND_FS = /* glsl */ `
  uniform vec3 uGold, uGoldBright, uAmber;
  varying vec2 vUv; varying float vCoast, vSwell, vLum;
  void main() {
    float a = 1.0 - smoothstep(0.62, 1.0, length(vUv));
    vec3 col = mix(mix(uGold, uGoldBright, vCoast), uAmber, vSwell);
    float lum = (0.42 + 0.38 * vCoast) * vLum + 0.7 * vSwell;
    gl_FragColor = vec4(col, a * clamp(lum, 0.0, 1.0));
  }`;

const CAP_VS = /* glsl */ `
  attribute vec2 corner; attribute vec3 aPos; attribute float aHot; attribute float aFlash;
  uniform vec3 uSun; uniform float uPx, uCorePx, uHaloPx, uHeroPx;
  varying vec2 vUv; varying float vCore, vR, vHalo, vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aPos * 1.004, 1.0);
    vFacing = smoothstep(0.02, 0.3, normalize(normalMatrix * aPos).z);
    float night = 1.0 - smoothstep(-0.08, 0.1, dot(aPos, uSun));       // lights on after dark
    float lit = max(aHot, aFlash);
    float R = mix(uHaloPx * mix(0.5, 1.0, night), uHeroPx, lit);
    vR = max(R, uCorePx * 2.5); vCore = uCorePx * (1.0 + 0.4 * aHot);
    vHalo = mix(0.28 + 0.42 * night, 1.0, lit);
    vUv = corner;
    mv.xy += corner * vR * uPx * (-mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const CAP_FS = /* glsl */ `
  uniform vec3 uCoreCol, uHaloCol;
  varying vec2 vUv; varying float vCore, vR, vHalo, vFacing;
  void main() {
    float d = length(vUv) * vR;
    float core = 1.0 - smoothstep(vCore - 0.8, vCore + 0.8, d);
    float s = vR * 0.40, halo = exp(-(d * d) / (2.0 * s * s)) * vHalo;
    gl_FragColor = vec4((uCoreCol * core + uHaloCol * halo * 0.85) * vFacing, 1.0);
  }`;

const ARC_VS = /* glsl */ `
  attribute float aU; attribute float aArc;
  uniform float uHead[32]; uniform float uAmp[32]; uniform float uDir[32];
  varying float vD, vAmp, vU;
  void main() {
    int i = int(aArc + 0.5);
    float u = uDir[i] > 0.0 ? aU : 1.0 - aU;
    vD = uHead[i] - u; vAmp = uAmp[i]; vU = aU;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
const ARC_FS = /* glsl */ `
  uniform vec3 uTrace, uPulse; uniform float uTraceAmp;
  varying float vD, vAmp, vU;
  void main() {
    float trail = (vD >= 0.0 && vD < 0.4) ? exp(-vD / 0.08) : 0.0;
    float head = exp(-(vD * vD) / (2.0 * 0.011 * 0.011));
    float ends = smoothstep(0.0, 0.06, vU) * smoothstep(1.0, 0.94, vU);  // traces fade into the cities
    gl_FragColor = vec4(uTrace * uTraceAmp * ends + uPulse * (0.75 * trail + 1.5 * head) * vAmp, 1.0);
  }`;

const GLOW_VS = /* glsl */ `
  attribute float aSize; uniform float uDpr; uniform float uTime; attribute vec3 aDrift; attribute float aPhase;
  uniform float uDrift, uFocus; varying float vFade;
  void main() {
    vec3 p = position + uDrift * 0.18 * vec3(sin(uTime * aDrift.x + aPhase), cos(uTime * aDrift.y + aPhase * 1.7), sin(uTime * aDrift.z + aPhase * 0.6));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float defocus = uDrift > 0.0 ? clamp(abs(-mv.z - uFocus) * 0.9, 0.0, 1.0) : 0.0;   // bokeh: bigger and fainter off the focal plane
    gl_PointSize = aSize * uDpr * (1.0 + 2.2 * defocus);
    vFade = 1.0 - 0.7 * defocus;
    gl_Position = projectionMatrix * mv;
  }`;
const GLOW_FS = /* glsl */ `
  uniform vec3 uCol; uniform float uAmp; varying float vFade;
  void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = exp(-d * d * 3.2) * (1.0 - smoothstep(0.85, 1.0, d));
    gl_FragColor = vec4(uCol * a * uAmp * vFade, 1.0); }`;

/* ------------------------------------------------------------------ main */
export async function createGlobe(o: GlobeOptions): Promise<GlobeApi> {
  const lite = o.tier === 'lite';
  const land = await loadLand(lite ? '/globe/land-1.25.bin' : '/globe/land-1.00.bin');

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  let dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  const canvas = renderer.domElement;
  canvas.style.touchAction = 'pan-y';                 // vertical swipes scroll the page
  o.host.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const rig = new Group(), spin = new Group(), sky = new Group(), orbits = new Group();
  rig.rotation.set(BASE_PITCH, 0, ROLL);
  rig.add(spin); scene.add(rig);
  sky.add(orbits); scene.add(sky);                   // the sky doesn't pitch with the globe, so no ring ever goes edge-on

  const sun = { v: new Vector3(0, 0, 1) };
  const common = { uSun: { value: sun.v }, uTime: { value: 0 } };

  // body
  const bodyMat = new ShaderMaterial({ vertexShader: BODY_VS, fragmentShader: BODY_FS,
    uniforms: { ...common, uBody: { value: C.body }, uGold: { value: C.gold }, uGrid: { value: 0.16 } } });
  spin.add(new Mesh(new SphereGeometry(1, 128, 96), bodyMat));

  // land dots
  const landGeo = instanced(land.pos.length / 3);
  landGeo.setAttribute('aPos', new InstancedBufferAttribute(land.pos, 3));
  landGeo.setAttribute('aCoast', new InstancedBufferAttribute(land.coast, 1));
  landGeo.setAttribute('aSeed', new InstancedBufferAttribute(land.seed, 1));
  const rippleU = { value: Array.from({ length: 4 }, () => new Vector4(0, 0, 1, -1)) };
  const landMat = new ShaderMaterial({ vertexShader: LAND_VS, fragmentShader: LAND_FS, transparent: true, depthWrite: false,
    uniforms: { ...common, uSize: { value: land.step * D2R * 0.40 }, uShimmer: { value: o.reduced ? 0 : 0.08 }, uNight: { value: 0.55 },
      uRipple: rippleU, uGold: { value: C.gold }, uGoldBright: { value: C.goldBright }, uAmber: { value: C.amber } } });
  const landMesh = new Mesh(landGeo, landMat); landMesh.frustumCulled = false; spin.add(landMesh);

  // capitals
  const nCap = CAPITALS.length;
  const capPos = new Float32Array(nCap * 3), capHot = new Float32Array(nCap), capFlash = new Float32Array(nCap);
  const capV = CAPITALS.map((c, i) => { const v = ll2v(c.lat, c.lng); capPos.set([v.x, v.y, v.z], i * 3); return v; });
  const capGeo = instanced(nCap);
  capGeo.setAttribute('aPos', new InstancedBufferAttribute(capPos, 3));
  const hotAttr = new InstancedBufferAttribute(capHot, 1), flashAttr = new InstancedBufferAttribute(capFlash, 1);
  capGeo.setAttribute('aHot', hotAttr); capGeo.setAttribute('aFlash', flashAttr);
  const capMat = new ShaderMaterial({ vertexShader: CAP_VS, fragmentShader: CAP_FS, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { ...common, uPx: { value: 0.001 }, uCorePx: { value: lite ? 2.6 : 3.0 }, uHaloPx: { value: lite ? 12 : 15 }, uHeroPx: { value: lite ? 30 : 38 },
      uCoreCol: { value: C.amberBright }, uHaloCol: { value: C.amber } } });
  const capMesh = new Mesh(capGeo, capMat); capMesh.frustumCulled = false; spin.add(capMesh);

  // routes: every edge as one hairline tube in a single merged geometry
  let arcMat: ShaderMaterial;
  const lines: Vector3[][] = [];
  const code = new Map(CAPITALS.map((c, i) => [c.code, i]));
  const edges = EDGES.map(([a, b, kind]) => ({ a: code.get(a)!, b: code.get(b)!, kind }));
  {
    const P: number[] = [], U: number[] = [], A: number[] = [], I: number[] = [];
    const SEG = 64, RAD = 5;
    edges.forEach((e, ei) => {
      const va = capV[e.a], vb = capV[e.b], ang = va.angleTo(vb), h = 0.05 + 0.32 * (ang / Math.PI);
      const pts = Array.from({ length: SEG + 1 }, (_, s) => {
        const t = s / SEG, sa = Math.sin((1 - t) * ang) / Math.sin(ang), sb = Math.sin(t * ang) / Math.sin(ang);
        return va.clone().multiplyScalar(sa).add(vb.clone().multiplyScalar(sb)).normalize().multiplyScalar(1.004 + h * Math.sin(Math.PI * t));
      });
      lines.push(pts);
      const tube = new TubeGeometry(new CatmullRomCurve3(pts), SEG, lite ? 0.0034 : 0.0028, RAD, false);
      const base = P.length / 3, pos = tube.getAttribute('position');
      for (let v = 0; v < pos.count; v++) { P.push(pos.getX(v), pos.getY(v), pos.getZ(v)); U.push(Math.floor(v / (RAD + 1)) / SEG); A.push(ei); }
      const idx = tube.getIndex()!; for (let q = 0; q < idx.count; q++) I.push(base + idx.getX(q));
      tube.dispose();
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(P), 3));
    g.setAttribute('aU', new BufferAttribute(new Float32Array(U), 1));
    g.setAttribute('aArc', new BufferAttribute(new Float32Array(A), 1));
    g.setIndex(I);
    arcMat = new ShaderMaterial({ vertexShader: ARC_VS, fragmentShader: ARC_FS, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uHead: { value: new Array(32).fill(-1) }, uAmp: { value: new Array(32).fill(0) }, uDir: { value: new Array(32).fill(1) },
        uTrace: { value: C.gold }, uTraceAmp: { value: 0.07 }, uPulse: { value: C.amber } } });
    const arcMesh = new Mesh(g, arcMat); arcMesh.frustumCulled = false; spin.add(arcMesh);
  }
  const cometPos = new Float32Array(edges.length * 3), cometSize = new Float32Array(edges.length);
  const cometGeo = new BufferGeometry();
  cometGeo.setAttribute('position', new BufferAttribute(cometPos, 3)); cometGeo.setAttribute('aSize', new BufferAttribute(cometSize, 1));
  cometGeo.setAttribute('aDrift', new BufferAttribute(new Float32Array(edges.length * 3), 3)); cometGeo.setAttribute('aPhase', new BufferAttribute(new Float32Array(edges.length), 1));
  const flights: Array<{ e: number; t0: number; dur: number; dir: number; landed: boolean } | null> = new Array(edges.length).fill(null);

  // orbits + satellites (the Blender plate's sky), and drifting motes
  const dprU = { value: dpr }, focusU = { value: 5 };
  const glowMat = (col: Vector3, amp: number, drift = 0) => new ShaderMaterial({ vertexShader: GLOW_VS, fragmentShader: GLOW_FS,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uDpr: dprU, uTime: common.uTime, uCol: { value: col }, uAmp: { value: amp }, uDrift: { value: drift }, uFocus: focusU } });
  const ORBITS = (lite ? [{ r: 1.34, tilt: [0.42, 0, 0.35], sats: 3, speed: 0.11 }]         // ellipse ratio ≈ cos z · sin x ≈ 0.4
    : [{ r: 1.30, tilt: [0.42, 0, 0.35], sats: 3, speed: 0.11 }, { r: 1.52, tilt: [-0.52, 0, -0.5], sats: 2, speed: 0.07 }]);
  const orbitMat = new LineBasicMaterial({ color: new Color('#D4AF37'), transparent: true, opacity: 0.2, depthWrite: false });
  const sats: Array<{ ring: Group; r: number; a0: number; speed: number }> = [];
  for (const ob of ORBITS) {
    const ring = new Group(); ring.rotation.set(ob.tilt[0], ob.tilt[1], ob.tilt[2]);
    const pts = Array.from({ length: 256 }, (_, i) => { const a = (i / 256) * Math.PI * 2; return new Vector3(Math.cos(a) * ob.r, 0, Math.sin(a) * ob.r); });
    ring.add(new LineLoop(new BufferGeometry().setFromPoints(pts), orbitMat));
    for (let s = 0; s < ob.sats; s++) sats.push({ ring, r: ob.r, a0: (s / ob.sats) * Math.PI * 2 + ob.r, speed: ob.speed });
    orbits.add(ring);
  }
  const satGeo = new BufferGeometry();
  const satPos = new Float32Array(sats.length * 3);
  satGeo.setAttribute('position', new BufferAttribute(satPos, 3));
  satGeo.setAttribute('aSize', new BufferAttribute(new Float32Array(sats.length).fill(lite ? 7 : 8), 1));
  satGeo.setAttribute('aDrift', new BufferAttribute(new Float32Array(sats.length * 3), 3));
  satGeo.setAttribute('aPhase', new BufferAttribute(new Float32Array(sats.length), 1));
  const satPoints = new Points(satGeo, glowMat(C.amber, 0.9)); satPoints.frustumCulled = false;
  const comets = new Points(cometGeo, glowMat(C.amberBright, 1.0)); comets.frustumCulled = false; spin.add(comets);
  const satLayer = new Group(); satLayer.add(satPoints); sky.add(satLayer);
  if (!lite) {
    const N = 36, mp = new Float32Array(N * 3), ms = new Float32Array(N), md = new Float32Array(N * 3), mph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = 1.25 + Math.random() * 1.6, y = (Math.random() - 0.5) * 2.4;
      mp.set([Math.cos(a) * r, y, Math.sin(a) * r * 0.7 + (Math.random() - 0.3) * 1.2], i * 3);
      ms[i] = 2 + Math.random() * 3; md.set([0.05 + Math.random() * 0.12, 0.04 + Math.random() * 0.1, 0.05 + Math.random() * 0.1], i * 3); mph[i] = Math.random() * 6.28;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(mp, 3)); g.setAttribute('aSize', new BufferAttribute(ms, 1));
    g.setAttribute('aDrift', new BufferAttribute(md, 3)); g.setAttribute('aPhase', new BufferAttribute(mph, 1));
    const motes = new Points(g, glowMat(C.amberBright, 0.22, o.reduced ? 0 : 1)); motes.frustumCulled = false; scene.add(motes);
  }

  let running = false, raf = 0, last = performance.now(), dirty = true, firstDone = false;

  /* ---------------------------------------------------------- sizing */
  let W = 1, H = 1, rPx = 1;
  function resize() {
    const r = o.host.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    rPx = lite ? Math.min(W * 0.40, H * 0.36) : Math.min(W * 0.30, H * 0.36);
    camera.aspect = W / H;
    camera.position.set(0, 0, (H / 2) / (rPx * Math.tan((FOV / 2) * D2R)));
    camera.updateProjectionMatrix();
    renderer.setSize(W, H, true);
    capMat.uniforms.uPx.value = (2 * Math.tan((FOV / 2) * D2R)) / H;
    focusU.value = camera.position.z - 1; dprU.value = dpr;
    invalidate();
  }
  const ro = new ResizeObserver(resize); ro.observe(o.host);

  /* -------------------------------------------------------- the sun */
  function updateSun() {
    const s = subsolar(); sun.v.copy(ll2v(s.lat, s.lon));
    if (o.caption) o.caption.textContent = sunCaption();
    invalidate();
  }
  updateSun(); const sunTimer = setInterval(updateSun, 60_000);

  /* ------------------------------------------------ state + controls */
  const st = {
    yaw: -(10 * D2R), yawVel: 0, autoVel: o.reduced ? 0 : AUTO_SPIN * 0.6,
    pitch: 0, pitchVel: 0, pitchTarget: 0,
    flyTo: null as number | null,
    par: { x: 0, y: 0, tx: 0, ty: 0 },
    lastInput: -1e9, hot: null as number | null, sel: null as number | null,
    drag: null as null | { id: number; x: number; y: number; t: number; lastX: number; lastT: number; active: boolean; touch: boolean },
  };
  const now = () => performance.now() / 1000;
  const fmts = CAPITALS.map((c) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: c.tz }));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const tmp = new Vector3(), toCam = new Vector3();
  function screenOf(i: number) {                       // capital → canvas px, and whether it faces us
    tmp.copy(capV[i]).multiplyScalar(1.004).applyMatrix4(spin.matrixWorld);
    toCam.copy(camera.position).sub(tmp).normalize();
    const facing = tmp.clone().normalize().dot(toCam);
    tmp.project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H, facing };
  }
  function pick(x: number, y: number, radius: number): number | null {
    let best: number | null = null, bd = radius * radius;
    for (let i = 0; i < nCap; i++) {
      const s = screenOf(i); if (s.facing < 0.15) continue;
      const d = (s.x - x) ** 2 + (s.y - y) ** 2; if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function showLabel(i: number | null) {
    const L = o.label;
    if (i == null) { L.classList.remove('on'); return; }
    const c = CAPITALS[i], night = capV[i].dot(sun.v) < 0;
    L.innerHTML = `<div class="lp-top"><span class="lp-code">${c.code}</span><span class="lp-time">${fmts[i].format(new Date())}</span>`
      + `<span class="lp-dn">${night ? '● NIGHT' : '○ DAY'}</span></div><div class="lp-name">${esc(c.name)}</div>`
      + `<div class="lp-role">${esc(c.exchange)} · ${esc(c.role)}</div><div class="lp-thesis">${esc(c.thesis)}</div>`;
    L.classList.add('on');
    placeLabel();
  }
  function placeLabel() {
    const i = st.hot ?? st.sel; if (i == null) return;
    const s = screenOf(i), L = o.label;
    if (s.facing < 0.05) { L.classList.remove('on'); return; }
    L.classList.add('on');
    const right = s.x < W * 0.62;
    L.classList.toggle('left', !right);
    L.style.transform = `translate(${Math.round(right ? s.x + 22 : s.x - 22 - L.offsetWidth)}px, ${Math.round(s.y - 20)}px)`;
  }

  function setHot(i: number | null) {
    if (st.hot === i) return;
    st.hot = i;
    for (let k = 0; k < nCap; k++) capHot[k] = k === i || k === st.sel ? 1 : 0;
    hotAttr.needsUpdate = true;
    canvas.style.cursor = st.drag?.active ? 'grabbing' : i != null ? 'pointer' : 'grab';
    showLabel(i ?? st.sel);
    invalidate();
  }

  function ripple(i: number) {                       // reuse the oldest of four slots
    const R = rippleU.value, slot = R.reduce((a, r, k) => (r.w < R[a].w ? k : a), 0);
    R[slot].set(capV[i].x, capV[i].y, capV[i].z, common.uTime.value);
  }
  function fire(e: number, fromCap: number | null, delay = 0) {
    const ed = edges[e], dir = fromCap == null ? (Math.random() < 0.5 ? 1 : -1) : ed.a === fromCap ? 1 : -1;
    const ang = capV[ed.a].angleTo(capV[ed.b]);
    flights[e] = { e, t0: common.uTime.value + delay, dur: 0.9 + 1.6 * (ang / Math.PI), dir, landed: false };
  }

  function select(i: number | null) {
    st.sel = i;
    for (let k = 0; k < nCap; k++) capHot[k] = k === i || k === st.hot ? 1 : 0;
    hotAttr.needsUpdate = true;
    if (i == null) { st.pitchTarget = 0; showLabel(st.hot); invalidate(); return; }
    const c = CAPITALS[i];
    let target = -c.lng * D2R, d = target - st.yaw;
    d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    st.flyTo = st.yaw + d; st.yawVel = 0;
    st.pitchTarget = Math.max(-0.35, Math.min(0.45, c.lat * D2R - BASE_PITCH));
    if (o.reduced) { st.yaw = st.flyTo; st.pitch = st.pitchTarget; st.flyTo = null; }
    st.lastInput = now();
    if (!o.reduced) { ripple(i); let n = 0; edges.forEach((e, k) => { if (e.a === i || e.b === i) fire(k, i, 0.12 * n++); }); }
    showLabel(i);
    if (o.live) o.live.textContent = `${c.name}, ${fmts[i].format(new Date())} local, ${c.role}.`;
    invalidate();
  }

  /* pointer: mouse drags at once; touch claims a gesture only when it's clearly horizontal */
  canvas.style.cursor = 'grab';
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const touch = e.pointerType !== 'mouse';
    st.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), lastX: e.clientX, lastT: now(), active: !touch, touch };
    if (!touch) { canvas.setPointerCapture(e.pointerId); canvas.style.cursor = 'grabbing'; }
    st.lastInput = now(); st.flyTo = null;
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const d = st.drag;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.7) { d.active = true; canvas.setPointerCapture(e.pointerId); }
      if (d.active) {
        const mdx = e.clientX - d.lastX, t = now(), dt = Math.max(1e-3, t - d.lastT);
        st.yaw += mdx / rPx;
        st.yawVel = st.yawVel * 0.6 + (mdx / rPx / dt) * 0.4;
        if (!d.touch) st.pitch = Math.max(-0.44, Math.min(0.44, st.pitch + (e.movementY || 0) / rPx));
        d.lastX = e.clientX; d.lastT = t; st.lastInput = t;
        if (st.hot != null) setHot(null);
        invalidate();
      }
      return;
    }
    if (e.pointerType === 'mouse') {
      setHot(pick(x, y, 24));
      if (!lite) { st.par.tx = ((x / W) - 0.5) * 0.07; st.par.ty = ((y / H) - 0.5) * 0.05; }
    }
  });
  const endDrag = (e: PointerEvent, cancelled: boolean) => {
    const d = st.drag; if (!d || d.id !== e.pointerId) return;
    st.drag = null; canvas.style.cursor = st.hot != null ? 'pointer' : 'grab';
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y), quick = now() - d.t < 0.35;
    if (!cancelled && moved < 8 && quick) {                          // a click / tap
      const r = canvas.getBoundingClientRect();
      const i = pick(e.clientX - r.left, e.clientY - r.top, d.touch ? 34 : 24);
      select(i === st.sel ? null : i);
    } else if (now() - d.lastT > 0.08) st.yawVel = 0;                // released after holding still
    st.lastInput = now();
  };
  canvas.addEventListener('pointerup', (e) => endDrag(e, false));
  canvas.addEventListener('pointercancel', (e) => endDrag(e, true));  // the browser took the gesture (a scroll)
  canvas.addEventListener('pointerleave', () => { if (!st.drag) { setHot(null); st.par.tx = st.par.ty = 0; } });

  /* ------------------------------------------------------------ loop */
  let nextAmbient = 2.5;
  const frameTimes: number[] = [];
  function invalidate() { dirty = true; if (o.reduced && !raf) raf = requestAnimationFrame(frame); }

  function update(dt: number) {
    const t = (common.uTime.value += dt);
    const idle = now() - st.lastInput;
    // yaw: fly-to spring, else momentum + auto-rotation that eases back in after 3 s idle
    if (st.flyTo != null) {
      const k = 1 - Math.exp(-dt * 3.2); st.yaw += (st.flyTo - st.yaw) * k;
      if (Math.abs(st.flyTo - st.yaw) < 1e-3) st.flyTo = null;
    } else if (!st.drag?.active) {
      st.yaw += st.yawVel * dt; st.yawVel *= Math.exp(-2.5 * dt);
    }
    const autoTarget = !o.reduced && idle > 3 && st.sel == null && !st.drag ? AUTO_SPIN : 0;
    st.autoVel += (autoTarget - st.autoVel) * (1 - Math.exp(-dt * 0.8));
    if (!st.drag?.active) st.yaw += st.autoVel * dt;
    // pitch: critically damped spring back to its target (0, or the selected city's latitude)
    if (!st.drag?.active) {
      const w = 6, x = st.pitch - st.pitchTarget;
      st.pitchVel += (-w * w * x - 2 * w * st.pitchVel) * dt; st.pitch += st.pitchVel * dt;
    }
    st.par.x += (st.par.tx - st.par.x) * (1 - Math.exp(-dt * 3)); st.par.y += (st.par.ty - st.par.y) * (1 - Math.exp(-dt * 3));
    rig.rotation.set(BASE_PITCH + st.pitch + st.par.y, st.par.x, ROLL);
    spin.rotation.y = st.yaw;
    sky.rotation.set(st.par.y * 0.5, st.par.x * 0.5, 0);
    rig.updateMatrixWorld(true);

    // satellites ride their rings
    sats.forEach((s, k) => {
      const a = s.a0 + t * s.speed * Math.PI * 2 * 0.25;
      tmp.set(Math.cos(a) * s.r, 0, Math.sin(a) * s.r).applyEuler(s.ring.rotation);
      satPos.set([tmp.x, tmp.y, tmp.z], k * 3);
    });
    satGeo.getAttribute('position').needsUpdate = true;

    // route flights
    const H_ = arcMat.uniforms.uHead.value, A_ = arcMat.uniforms.uAmp.value, D_ = arcMat.uniforms.uDir.value;
    let flying = 0;
    flights.forEach((f, k) => {
      if (!f) { H_[k] = -1; A_[k] = 0; cometSize[k] = 0; return; }
      const p = (t - f.t0) / f.dur;
      if (p < 0) { H_[k] = -1; A_[k] = 0; cometSize[k] = 0; flying++; return; }
      H_[k] = p * 1.4; A_[k] = p < 1.2 ? 1 : Math.max(0, 1 - (p - 1.2) * 5); D_[k] = f.dir; flying++;
      const u = Math.min(1, p * 1.4), pts = lines[k], x = (f.dir > 0 ? u : 1 - u) * (pts.length - 1), a = Math.floor(x), b = Math.min(pts.length - 1, a + 1);
      tmp.copy(pts[a]).lerp(pts[b], x - a); cometPos.set([tmp.x, tmp.y, tmp.z], k * 3);
      cometSize[k] = p * 1.4 <= 1 ? (lite ? 11 : 13) : 0;
      if (!f.landed && p >= 1) { f.landed = true; const dest = f.dir > 0 ? edges[k].b : edges[k].a; capFlash[dest] = 1; }
      if (p > 1.4) flights[k] = null;
    });
    // ambient: one route every ~3.5 s from a city on the visible side, at most three in the air
    if (!o.reduced && st.sel == null && t > nextAmbient) {
      nextAmbient = t + 3.5;
      if (flying < 3) {
        const cand = edges.map((e, k) => k).filter((k) => !flights[k] && screenOf(edges[k].a).facing > 0.3);
        if (cand.length) { const k = cand[Math.floor(Math.random() * cand.length)]; fire(k, edges[k].a); }
      }
    }
    cometGeo.getAttribute('position').needsUpdate = true; cometGeo.getAttribute('aSize').needsUpdate = true;
    let flashDirty = false;
    for (let k = 0; k < nCap; k++) if (capFlash[k] > 0) { capFlash[k] = Math.max(0, capFlash[k] - dt * 1.6); flashDirty = true; }
    if (flashDirty) flashAttr.needsUpdate = true;
    if (st.hot != null || st.sel != null) placeLabel();
  }

  function frame(ts: number) {
    raf = 0;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (running || dirty) {
      update(o.reduced ? 0 : dt);
      renderer.render(scene, camera);
      dirty = false;
      if (!firstDone) { firstDone = true; o.onFirstFrame?.(); }
      // adaptive quality: if the first seconds run slow, drop resolution (then the motes)
      if (!o.reduced && frameTimes.length < 150) {
        frameTimes.push(dt);
        if (frameTimes.length === 150) {
          const p90 = [...frameTimes].slice(30).sort((a, b) => a - b)[Math.floor(120 * 0.9)];
          if (p90 > 0.022 && dpr > 1) { dpr = Math.max(1, dpr - 0.5); renderer.setPixelRatio(dpr); resize(); }
        }
      }
    }
    if (running && !o.reduced) raf = requestAnimationFrame(frame);
  }

  /* pause off-screen and in background tabs */
  let inView = true;
  const setRunning = () => {
    const want = inView && document.visibilityState === 'visible';
    if (want && !running) { running = true; last = performance.now(); if (!raf) raf = requestAnimationFrame(frame); }
    if (!want) running = false;
  };
  const io = new IntersectionObserver(([en]) => { inView = en.isIntersecting; setRunning(); }, { rootMargin: '100px' });
  io.observe(o.host);
  const onVis = () => setRunning();
  document.addEventListener('visibilitychange', onVis);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; });
  canvas.addEventListener('webglcontextrestored', () => { setRunning(); invalidate(); });

  resize();
  running = true; raf = requestAnimationFrame(frame);
  if (o.reduced) running = false;

  if (location.search.includes('gvdebug')) (window as any).__gv2 = { st, flights, common, rippleU, get running() { return running; }, get raf() { return raf; } };

  return {
    hover: (i) => setHot(i),
    select,
    destroy() {
      running = false; cancelAnimationFrame(raf); clearInterval(sunTimer);
      ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
      renderer.dispose(); canvas.remove();
    },
  };
}
