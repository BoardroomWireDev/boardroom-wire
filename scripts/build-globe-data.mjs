/**
 * build-globe-data.mjs — the homepage globe's land dots, built once, served from /globe/.
 *
 *   node scripts/build-globe-data.mjs [--blender <path/to/land_dots.json>]
 *
 * Samples Natural Earth 110m land (scripts/data/ne_110m_land.geojson, public domain) on an
 * equal-area latitude-ring grid — the same construction as the Blender plate's land_dots.json,
 * so the dots sit in engineered rows — and writes a compact binary the browser rebuilds from:
 *
 *   public/globe/land-<step>.bin   (little-endian)
 *     Float32 step°, Float32 latMin°, Float32 latMax°      (12 bytes)
 *     Uint16 ring count, then Uint16 cells per ring        (stored, not recomputed: a 1-ulp
 *                                                           Math.cos difference between engines
 *                                                           would shift every later bit)
 *     land bitset, one bit per cell in ring order          (ring i at lat = latMin + (i+.5)·step,
 *                                                           cell j at lon = -180 + (j+.5)·360/n)
 *     one "coastness" byte per land cell (3 = on the coast … 0 = inland)
 *
 * Replaces the 488 KB globe.gl countries GeoJSON the page used to fetch from unpkg on every visit.
 * South of -60° is dropped (Antarctica smears across the bottom of a sphere).
 * --blender also writes the 1.0° set as [[lat, lon], …] for blender-plates/assets/land_dots.json,
 * so the video plate and the site are the same globe.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'globe');
const LAT_MIN = -60, LAT_MAX = 84;
const STEPS = [1.0, 1.25];             // desktop, phone
const d2r = Math.PI / 180;

const geo = JSON.parse(readFileSync(join(ROOT, 'scripts', 'data', 'ne_110m_land.geojson'), 'utf8'));
const polys = [];                       // [{ bbox, rings }]
for (const f of geo.features) {
  const g = f.geometry;
  const list = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const rings of list) {
    let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    for (const [x, y] of rings[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    polys.push({ bbox: [x0, y0, x1, y1], rings });
  }
}
const inRing = (x, y, ring) => {       // even-odd ray cast in lon/lat
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const isLand = (lon, lat) => {
  for (const p of polys) {
    const [x0, y0, x1, y1] = p.bbox;
    if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
    if (inRing(lon, lat, p.rings[0]) && !p.rings.slice(1).some((h) => inRing(lon, lat, h))) return true;
  }
  return false;
};

function build(step) {
  const rings = [];
  for (let i = 0; LAT_MIN + (i + 0.5) * step < LAT_MAX; i++) {
    const lat = LAT_MIN + (i + 0.5) * step;
    rings.push({ lat, n: Math.max(1, Math.round((360 * Math.cos(lat * d2r)) / step)) });
  }
  const land = rings.map((r) => Array.from({ length: r.n }, (_, j) => isLand(-180 + ((j + 0.5) * 360) / r.n, r.lat)));
  const at = (lat, lon) => {           // land bit at any lat/lon, via the grid
    const i = Math.floor((lat - LAT_MIN) / step);
    if (i < 0 || i >= rings.length) return false;
    const n = rings[i].n, x = ((((lon + 180) % 360) + 360) % 360);
    return land[i][Math.min(n - 1, Math.floor((x / 360) * n))];
  };
  const dots = [], coast = [];
  rings.forEach((r, i) => land[i].forEach((isL, j) => {
    if (!isL) return;
    const lon = -180 + ((j + 0.5) * 360) / r.n;
    let c = 0;                          // how close is water? sample 8 directions at 1–3 cells
    for (let k = 1; k <= 3 && !c; k++) {
      const dLat = k * step, dLon = (k * step) / Math.max(0.2, Math.cos(r.lat * d2r));
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]])
        if (!at(r.lat + a * dLat, lon + b * dLon)) { c = 4 - k; break; }
    }
    dots.push([+r.lat.toFixed(3), +lon.toFixed(3)]); coast.push(c);
  }));
  const cells = rings.reduce((s, r) => s + r.n, 0);
  const bits = new Uint8Array(Math.ceil(cells / 8));
  let k = 0;
  land.forEach((row) => row.forEach((isL) => { if (isL) bits[k >> 3] |= 1 << (k & 7); k++; }));
  const head = Buffer.alloc(14 + rings.length * 2);
  head.writeFloatLE(step, 0); head.writeFloatLE(LAT_MIN, 4); head.writeFloatLE(LAT_MAX, 8);
  head.writeUInt16LE(rings.length, 12);
  rings.forEach((r, i) => head.writeUInt16LE(r.n, 14 + i * 2));
  const buf = Buffer.concat([head, Buffer.from(bits), Buffer.from(Uint8Array.from(coast))]);
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `land-${step.toFixed(2)}.bin`);
  writeFileSync(file, buf);
  console.log(`step ${step}°: ${rings.length} rings, ${cells} cells, ${dots.length} land dots → ${file} (${buf.length} B)`);
  return dots;
}

const sets = STEPS.map(build);
const bi = process.argv.indexOf('--blender');
if (bi > 0 && process.argv[bi + 1]) {
  writeFileSync(process.argv[bi + 1], JSON.stringify(sets[0]));
  console.log(`blender: ${sets[0].length} dots → ${process.argv[bi + 1]}`);
}
