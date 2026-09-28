/**
 * The reader map: the homepage globe's land dots (public/globe/land-1.25.bin, an equal-area grid) drawn flat in the
 * Equal Earth projection, which is also equal-area, so the dots stay evenly spaced. Reader cities glow in the web
 * series colour; live readers pulse (a calm ring for reduced motion).
 */
import { country, num } from './fmt';

const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2, D = Math.PI / 180;
const ee = (lat: number, lon: number): [number, number] => {
  const t = Math.asin(M * Math.sin(lat * D)), t2 = t * t, t6 = t2 * t2 * t2;
  return [(2 * Math.sqrt(3) * lon * D * Math.cos(t)) / (3 * (9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1)), A4 * t6 * t2 * t + A3 * t6 * t + A2 * t2 * t + A1 * t];
};
const X_MAX = ee(0, 180)[0], Y_TOP = ee(80, 0)[1], Y_BOT = ee(-57, 0)[1];
let land: [number, number][] | null = null;
async function loadLand() {
  if (land) return land;
  const dv = new DataView(await (await fetch('/globe/land-1.25.bin')).arrayBuffer());
  const step = dv.getFloat32(0, true), latMin = dv.getFloat32(4, true), rings = dv.getUint16(12, true), ns: number[] = [];
  for (let i = 0; i < rings; i++) ns.push(dv.getUint16(14 + i * 2, true));
  const bits = 14 + rings * 2, pts: [number, number][] = [];
  for (let i = 0, k = 0; i < rings; i++) {
    const lat = latMin + (i + 0.5) * step;
    for (let j = 0; j < ns[i]; j++, k++) if ((dv.getUint8(bits + (k >> 3)) >> (k & 7)) & 1) pts.push(ee(lat, -180 + ((j + 0.5) * 360) / ns[i]));
  }
  return (land = pts);
}

export interface City { city: string | null; country: string | null; lat: number; lon: number; visitors: number; views: number }
export interface Live { lat: number | null; lon: number | null; ts: number }

export function readerMap(host: HTMLElement) {
  const canvas = document.createElement('canvas'), tip = document.createElement('div');
  canvas.setAttribute('role', 'img'); tip.className = 'tc-tip map-tip';
  host.classList.add('map'); host.replaceChildren(canvas, tip);
  const ctx = canvas.getContext('2d')!, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cities: City[] = [], live: Live[] = [], raf = 0, hits: { c: City; x: number; y: number; r: number }[] = [];
  function draw(t = 0) {
    if (!land) return;
    const w = host.clientWidth, h = Math.round((w * (Y_TOP - Y_BOT)) / (2 * X_MAX)), dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const px = ([x, y]: [number, number]) => [((x + X_MAX) / (2 * X_MAX)) * w, ((Y_TOP - y) / (Y_TOP - Y_BOT)) * h];
    ctx.fillStyle = 'rgba(212, 175, 55, 0.24)';
    const r = Math.max(0.7, w / 950);
    for (const p of land) { const [x, y] = px(p); if (y < 0 || y > h) continue; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
    const max = Math.max(1, ...cities.map((c) => c.visitors)); hits = [];
    for (const c of cities) {
      const [x, y] = px(ee(c.lat, c.lon)), R = 3.5 + 12 * Math.sqrt(c.visitors / max);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, 'rgba(120, 175, 245, 0.95)'); g.addColorStop(0.3, 'rgba(57, 135, 229, 0.55)'); g.addColorStop(1, 'rgba(57, 135, 229, 0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.fill();
      hits.push({ c, x, y, r: Math.max(8, R) });
    }
    for (const p of live) {
      if (p.lat == null || p.lon == null) continue;
      const [x, y] = px(ee(p.lat, p.lon)), ph = calm ? 0.5 : (t / 1600 + (p.ts % 1000) / 1000) % 1;
      ctx.strokeStyle = `rgba(255, 179, 71, ${0.9 * (1 - ph)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 4 + 16 * ph, 0, 6.2832); ctx.stroke();
      ctx.fillStyle = '#FFC97A'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.2832); ctx.fill();
    }
    canvas.setAttribute('aria-label', `Map of ${cities.length} reader cities${live.length ? `, ${live.length} reading now` : ''}.`);
  }
  const loop = (t: number) => { draw(t); raf = live.length && !calm && !document.hidden && host.isConnected ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  new ResizeObserver(() => { canvas.width = 0; kick(); }).observe(host);
  canvas.addEventListener('pointermove', (e) => {
    const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const hit = hits.find((q) => Math.hypot(q.x - x, q.y - y) < q.r);
    if (!hit) { tip.classList.remove('on'); return; }
    tip.replaceChildren();
    const hd = document.createElement('div'); hd.className = 'tc-tip-h'; hd.textContent = `${hit.c.city || 'Unknown city'}, ${country(hit.c.country)}`;
    const row = document.createElement('div'); row.className = 'tc-tip-r';
    const bb = document.createElement('b'); bb.textContent = num(hit.c.visitors); const sp = document.createElement('span'); sp.textContent = `visitors · ${num(hit.c.views)} views`;
    row.append(bb, sp); tip.append(hd, row); tip.classList.add('on');
    tip.style.left = `${Math.min(x + 14, b.width - 200)}px`; tip.style.top = `${y + 14}px`;
  });
  canvas.addEventListener('pointerleave', () => tip.classList.remove('on'));
  loadLand().then(kick);
  return { set(c: City[], l: Live[]) { cities = c; live = l; kick(); } };
}
