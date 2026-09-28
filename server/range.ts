/**
 * The date range every telemetry report takes: ?from=YYYY-MM-DD&to=YYYY-MM-DD, both inclusive, UTC days.
 * The client resolves presets ("Last 28 days", "All time") into dates, so every endpoint sees the same thing.
 * Each range carries the previous period of equal length, for the deltas on the headline figures.
 */
const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);

export interface Range {
  from: string; to: string;              // inclusive days
  days: number;
  since: number; until: number;          // ms bounds for ts columns: [since, until)
  prevFrom: string; prevTo: string; prevSince: number; prevUntil: number;
  hourly: boolean;                       // two days or fewer: bucket by hour
}

export function parseRange(url: URL, fallbackDays = 28): Range {
  const today = dayOf(Date.now());
  let to = url.searchParams.get('to') ?? '', from = url.searchParams.get('from') ?? '';
  if (!ISO.test(to) || to > today) to = today;
  if (!ISO.test(from)) from = dayOf(Date.parse(to) - (fallbackDays - 1) * DAY_MS);
  if (from > to) [from, to] = [to, from];
  if (from < '2025-01-01') from = '2025-01-01';                       // nothing is older than the channel
  const since = Date.parse(from), until = Date.parse(to) + DAY_MS;
  const days = Math.round((until - since) / DAY_MS);
  const prevUntil = since, prevSince = since - days * DAY_MS;
  return { from, to, days, since, until, prevFrom: dayOf(prevSince), prevTo: dayOf(prevUntil - DAY_MS), prevSince, prevUntil, hourly: days <= 2 };
}

export const noStore = { 'Cache-Control': 'no-store' };
