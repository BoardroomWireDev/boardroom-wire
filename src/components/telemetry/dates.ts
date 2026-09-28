/**
 * Date ranges: presets resolve to inclusive UTC days, so every endpoint and every view agrees. "All time" resolves per
 * view, from the earliest day its sources hold (meta). The previous period is the same length, immediately before.
 */
const DAY = 86_400_000;
export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
export const spanDays = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;

export interface Preset { id: string; label: string; resolve: (earliest: string) => { from: string; to: string } }
const t = () => today();
export const PRESETS: Preset[] = [
  { id: 'today', label: 'Today', resolve: () => ({ from: t(), to: t() }) },
  { id: '7d', label: 'Last 7 days', resolve: () => ({ from: addDays(t(), -6), to: t() }) },
  { id: '28d', label: 'Last 28 days', resolve: () => ({ from: addDays(t(), -27), to: t() }) },
  { id: '90d', label: 'Last 90 days', resolve: () => ({ from: addDays(t(), -89), to: t() }) },
  { id: '12m', label: 'Last 12 months', resolve: () => ({ from: addDays(t(), -364), to: t() }) },
  { id: 'mtd', label: 'This month', resolve: () => ({ from: t().slice(0, 8) + '01', to: t() }) },
  { id: 'lm', label: 'Last month', resolve: () => { const first = t().slice(0, 8) + '01', end = addDays(first, -1); return { from: end.slice(0, 8) + '01', to: end }; } },
  { id: 'ytd', label: 'Year to date', resolve: () => ({ from: t().slice(0, 4) + '-01-01', to: t() }) },
  { id: 'all', label: 'All time', resolve: (earliest) => ({ from: earliest || addDays(t(), -364), to: t() }) },
];

export interface RangeState { preset: string | null; from: string; to: string }

export function describe(r: RangeState) {
  const p = PRESETS.find((x) => x.id === r.preset);
  const f = (d: string, y = false) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}), timeZone: 'UTC' });
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4);
  const dates = r.from === r.to ? f(r.from, true) : `${f(r.from, !sameYear)} – ${f(r.to, true)}`;
  return { label: p ? p.label : dates, dates, days: spanDays(r.from, r.to) };
}
