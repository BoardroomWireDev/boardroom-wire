/**
 * Which exchanges are in session right now — regular hours only (no holidays, no lunch breaks,
 * no pre/after-market), so the globe says "regular hours" wherever it shows this.
 * Each capital points at the exchange it's labelled with; Bengaluru uses NSE (India's session)
 * and Abilene has none (it's a compute site, not a market).
 */
export type Session = { ex: string; tz: string; open: string; close: string; days: number[] };  // days: 0 = Sun … 6 = Sat

const WEEK = [1, 2, 3, 4, 5];
export const SESSIONS: Record<string, Session | null> = {
  NYC: { ex: 'NYSE',     tz: 'America/New_York',  open: '09:30', close: '16:00', days: WEEK },
  SFO: { ex: 'Nasdaq',   tz: 'America/New_York',  open: '09:30', close: '16:00', days: WEEK },
  SEA: { ex: 'Nasdaq',   tz: 'America/New_York',  open: '09:30', close: '16:00', days: WEEK },
  ABI: null,
  YYZ: { ex: 'TSX',      tz: 'America/Toronto',   open: '09:30', close: '16:00', days: WEEK },
  GRU: { ex: 'B3',       tz: 'America/Sao_Paulo', open: '10:00', close: '17:00', days: WEEK },
  LON: { ex: 'LSE',      tz: 'Europe/London',     open: '08:00', close: '16:30', days: WEEK },
  EIN: { ex: 'Euronext', tz: 'Europe/Amsterdam',  open: '09:00', close: '17:30', days: WEEK },
  FRA: { ex: 'Xetra',    tz: 'Europe/Berlin',     open: '09:00', close: '17:30', days: WEEK },
  ZRH: { ex: 'SIX',      tz: 'Europe/Zurich',     open: '09:00', close: '17:20', days: WEEK },
  RUH: { ex: 'Tadawul',  tz: 'Asia/Riyadh',       open: '10:00', close: '15:00', days: [0, 1, 2, 3, 4] },
  DXB: { ex: 'DFM',      tz: 'Asia/Dubai',        open: '10:00', close: '15:00', days: WEEK },
  AUH: { ex: 'ADX',      tz: 'Asia/Dubai',        open: '10:00', close: '15:00', days: WEEK },
  BLR: { ex: 'NSE',      tz: 'Asia/Kolkata',      open: '09:15', close: '15:30', days: WEEK },
  SIN: { ex: 'SGX',      tz: 'Asia/Singapore',    open: '09:00', close: '17:00', days: WEEK },
  HKG: { ex: 'HKEX',     tz: 'Asia/Hong_Kong',    open: '09:30', close: '16:00', days: WEEK },
  HGH: { ex: 'SSE',      tz: 'Asia/Shanghai',     open: '09:30', close: '15:00', days: WEEK },
  PVG: { ex: 'SSE',      tz: 'Asia/Shanghai',     open: '09:30', close: '15:00', days: WEEK },
  TPE: { ex: 'TWSE',     tz: 'Asia/Taipei',       open: '09:00', close: '13:30', days: WEEK },
  ICN: { ex: 'KRX',      tz: 'Asia/Seoul',        open: '09:00', close: '15:30', days: WEEK },
  TYO: { ex: 'TSE',      tz: 'Asia/Tokyo',        open: '09:00', close: '15:30', days: WEEK },
};

const DAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const fmts = new Map<string, Intl.DateTimeFormat>();
function local(tz: string, d: Date) {
  let f = fmts.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); fmts.set(tz, f); }
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { day: DAYS[p.weekday], min: Number(p.hour) * 60 + Number(p.minute) };
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const span = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`);

export type Status = { ex: string; open: boolean; note: string } | null;

/** Is this capital's exchange in its regular session at `d`? With a short human note. */
export function status(code: string, d: Date = new Date()): Status {
  const s = SESSIONS[code]; if (!s) return null;
  const { day, min } = local(s.tz, d), o = toMin(s.open), c = toMin(s.close);
  const tradingDay = s.days.includes(day);
  if (tradingDay && min >= o && min < c) return { ex: s.ex, open: true, note: `closes in ${span(c - min)}` };
  if (tradingDay && min < o) return { ex: s.ex, open: false, note: `opens ${s.open} local` };
  const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let next = day; for (let k = 1; k <= 7; k++) { next = (day + k) % 7; if (s.days.includes(next)) break; }
  return { ex: s.ex, open: false, note: `opens ${NAMES[next]} ${s.open} local` };
}

/** Distinct exchanges in session / total, e.g. { open: 5, total: 18 }. */
export function summary(d: Date = new Date()) {
  const seen = new Map<string, boolean>();
  for (const code of Object.keys(SESSIONS)) { const st = status(code, d); if (st) seen.set(st.ex, st.open || !!seen.get(st.ex)); }
  return { open: [...seen.values()].filter(Boolean).length, total: seen.size };
}
