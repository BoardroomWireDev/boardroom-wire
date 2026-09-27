/**
 * Where the sun is overhead right now — the subsolar point — from a UTC time.
 * Low-precision solar position (the Astronomical Almanac's approximation: ~0.01° in
 * declination, well under a degree overall), plenty for a day/night terminator.
 */
const RAD = Math.PI / 180;

export function subsolar(date: Date = new Date()): { lat: number; lon: number } {
  const d = date.getTime() / 86_400_000 + 2440587.5 - 2451545.0;      // days since J2000
  const g = (357.529 + 0.98560028 * d) * RAD;                         // mean anomaly
  const q = 280.459 + 0.98564736 * d;                                 // mean longitude (°)
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD; // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * RAD;                          // obliquity
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));      // right ascension
  const dec = Math.asin(Math.sin(e) * Math.sin(L));                   // declination
  const gmst = (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24; // hours
  let lon = ra / RAD - gmst * 15;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: dec / RAD, lon };
}

/** "SUN 1.9°S 38.2°W · 14:32 UTC" */
export function sunCaption(date: Date = new Date()): string {
  const { lat, lon } = subsolar(date);
  const hh = String(date.getUTCHours()).padStart(2, '0'), mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `SUN ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'} · ${hh}:${mm} UTC`;
}
