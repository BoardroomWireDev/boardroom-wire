/**
 * YouTube audience and retention → bw-data (db/migrations/0006). Shared by the collector's youtube-deep job (nightly,
 * inside the free plan's 50 requests a run) and scripts/youtube-auth.mjs --deep-history (the whole history, once,
 * from this PC). Both build the same statements from the same reports; only the writing differs.
 *
 * Report shapes follow Google's channel-report table: day-capable breakdowns are stored per day; country, sharing,
 * search terms, external sites, suggesting videos and demographics only exist for a period, so they are stored per
 * calendar month; retention is per video over its lifetime.
 *
 * Erasable TypeScript only (Node 24 imports this file directly).
 */

export interface Stmt { sql: string; params: unknown[] }
export type Rep = (params: Record<string, string>) => Promise<Record<string, any>[]>;
const DAY_MS = 86_400_000;
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);

export const DAILY: Record<string, string> = {
  location: 'insightPlaybackLocationType', source: 'insightTrafficSourceType', device: 'deviceType', os: 'operatingSystem', subscribed: 'subscribedStatus',
};
export const MONTHLY = ['country', 'sharing', 'search', 'ext', 'related', 'demo'];
const DETAIL: Record<string, string> = { search: 'YT_SEARCH', ext: 'EXT_URL', related: 'RELATED_VIDEO' };

const S = (sql: string, ...params: unknown[]): Stmt => ({ sql, params });
const done = (item: string, now: number) => S('INSERT OR REPLACE INTO yt_deep_done (item, fetched_at) VALUES (?, ?)', item, now);
const INS_DAILY = 'INSERT OR REPLACE INTO yt_dim_daily (dim, day, value, views, minutes) VALUES (?, ?, ?, ?, ?)';
const INS_MONTH = 'INSERT OR REPLACE INTO yt_dim_monthly (dim, month, value, label, views, minutes, pct) VALUES (?, ?, ?, ?, ?, ?, ?)';
const INS_VDIM = 'INSERT OR REPLACE INTO yt_video_dim (youtube_id, dim, value, label, views, minutes, pct) VALUES (?, ?, ?, ?, ?, ?, ?)';

/** Calendar months from `from` to `to` (YYYY-MM). */
export function months(from: string, to: string): string[] {
  const out: string[] = []; let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  const ey = Number(to.slice(0, 4)), em = Number(to.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
/** A month's first and last reportable day (never past `latest`). */
export function monthSpan(month: string, latest: string) {
  const start = `${month}-01`, next = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1));
  const end = dayOf(next.getTime() - DAY_MS);
  return { start, end: end < latest ? end : latest };
}

/** One day-capable breakdown over [start, end], replacing what was stored for those days. */
export async function dailyDim(rep: Rep, dim: string, start: string, end: string, now: number, mark?: string): Promise<Stmt[]> {
  const col = DAILY[dim];
  const rows = await rep({ startDate: start, endDate: end, dimensions: `day,${col}`, metrics: 'views,estimatedMinutesWatched', sort: 'day' });
  return [S('DELETE FROM yt_dim_daily WHERE dim = ? AND day >= ? AND day <= ?', dim, start, end),
    ...rows.map((r) => S(INS_DAILY, dim, r.day, String(r[col]), r.views ?? 0, r.estimatedMinutesWatched ?? 0)),
    ...(mark ? [done(mark, now)] : [])];
}
/** Card impressions and clicks per day (stored under dim 'card', the count in views). */
export async function cardsDaily(rep: Rep, start: string, end: string, now: number, mark?: string): Promise<Stmt[]> {
  const rows = await rep({ startDate: start, endDate: end, dimensions: 'day', metrics: 'cardImpressions,cardClicks,cardTeaserImpressions,cardTeaserClicks', sort: 'day' });
  const out = [S("DELETE FROM yt_dim_daily WHERE dim = 'card' AND day >= ? AND day <= ?", start, end)];
  for (const r of rows) for (const [k, v] of [['impressions', r.cardImpressions], ['clicks', r.cardClicks], ['teaser_impressions', r.cardTeaserImpressions], ['teaser_clicks', r.cardTeaserClicks]])
    if (Number(v) > 0) out.push(S(INS_DAILY, 'card', r.day, k, v, 0));
  if (mark) out.push(done(mark, now));
  return out;
}

/** A period-only breakdown for one calendar month. `titles` names suggesting videos (one Data API call per 50 ids). */
export async function monthlyDim(rep: Rep, dim: string, month: string, latest: string, now: number,
  titles?: (ids: string[]) => Promise<Record<string, string>>): Promise<Stmt[]> {
  const { start, end } = monthSpan(month, latest);
  if (start > end) return [];
  let rows: Record<string, any>[] = [], value = (r: any) => '', label = (_r: any): string | null => null;
  let views = (r: any) => r.views ?? null, minutes = (r: any) => r.estimatedMinutesWatched ?? null, pct = (_r: any): number | null => null;
  const base = { startDate: start, endDate: end };
  if (dim === 'country') { rows = await rep({ ...base, dimensions: 'country', metrics: 'views,estimatedMinutesWatched', sort: '-views', maxResults: '250' }); value = (r) => r.country; }
  else if (dim === 'sharing') { rows = await rep({ ...base, dimensions: 'sharingService', metrics: 'shares', sort: '-shares' }); value = (r) => r.sharingService; views = (r) => r.shares; minutes = () => null; }
  else if (dim === 'demo') { rows = await rep({ ...base, dimensions: 'ageGroup,gender', metrics: 'viewerPercentage' }); value = (r) => `${r.ageGroup}|${r.gender}`; views = () => null; minutes = () => null; pct = (r) => r.viewerPercentage; }
  else {
    rows = await rep({ ...base, dimensions: 'insightTrafficSourceDetail', filters: `insightTrafficSourceType==${DETAIL[dim]}`, metrics: 'views,estimatedMinutesWatched', sort: '-views', maxResults: '25' });
    value = (r) => String(r.insightTrafficSourceDetail);
    if (dim === 'related' && titles && rows.length) { const t = await titles(rows.map(value)); label = (r) => t[value(r)] ?? null; }
  }
  return [S('DELETE FROM yt_dim_monthly WHERE dim = ? AND month = ?', dim, month),
    ...rows.map((r) => S(INS_MONTH, dim, month, value(r), label(r), views(r), minutes(r), pct(r))),
    done(`monthly:${dim}:${month}`, now)];
}

/** One video's lifetime profile: its retention curve, the search terms that found it, and its audience's age and gender. */
export async function videoProfile(rep: Rep, v: { youtube_id: string; published: string }, latest: string, now: number): Promise<Stmt[]> {
  const id = v.youtube_id, base = { startDate: v.published.slice(0, 10), endDate: latest };
  if (base.startDate > base.endDate) return [];
  const out: Stmt[] = [];
  const ret = await rep({ ...base, dimensions: 'elapsedVideoTimeRatio', filters: `video==${id}`, metrics: 'audienceWatchRatio,relativeRetentionPerformance,startedWatching,stoppedWatching' });
  out.push(S('DELETE FROM yt_retention WHERE youtube_id = ?', id));
  for (const r of ret) out.push(S('INSERT OR REPLACE INTO yt_retention (youtube_id, ratio, watch, relative, started, stopped) VALUES (?, ?, ?, ?, ?, ?)',
    id, r.elapsedVideoTimeRatio, r.audienceWatchRatio ?? null, r.relativeRetentionPerformance ?? null, r.startedWatching ?? null, r.stoppedWatching ?? null));
  out.push(S("DELETE FROM yt_video_dim WHERE youtube_id = ? AND dim IN ('search', 'demo')", id));
  try {
    const search = await rep({ ...base, dimensions: 'insightTrafficSourceDetail', filters: `video==${id};insightTrafficSourceType==YT_SEARCH`, metrics: 'views,estimatedMinutesWatched', sort: '-views', maxResults: '25' });
    for (const r of search) out.push(S(INS_VDIM, id, 'search', String(r.insightTrafficSourceDetail), null, r.views ?? 0, r.estimatedMinutesWatched ?? 0, null));
  } catch { /* too few search views to report */ }
  try {
    const demo = await rep({ ...base, dimensions: 'ageGroup,gender', filters: `video==${id}`, metrics: 'viewerPercentage' });
    for (const r of demo) out.push(S(INS_VDIM, id, 'demo', `${r.ageGroup}|${r.gender}`, null, null, null, r.viewerPercentage));
  } catch { /* demographics need a threshold of viewers */ }
  out.push(done(`video:${id}`, now));
  return out;
}

/** "0:00 Intro" / "12:34 The deal" / "1:02:03 …" lines in a description, when they start at 0:00 (YouTube's own rule). */
export function parseChapters(description: string): [number, string][] | null {
  const out: [number, string][] = [];
  for (const line of String(description || '').split(/\r?\n/)) {
    const m = line.trim().match(/^(?:\(?)((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\)?)\s*[-–—:|]?\s+(.+)$/);
    if (!m) continue;
    const parts = m[1].split(':').map(Number), s = parts.reduce((a, b) => a * 60 + b, 0);
    out.push([s, m[2].trim()]);
  }
  return out.length >= 2 && out[0][0] === 0 ? out : null;
}

/** Statement → SQL text, for the one-time history file. */
export function toSql(s: Stmt): string {
  let i = 0;
  const q = (v: unknown) => (v == null ? 'NULL' : typeof v === 'number' ? (Number.isFinite(v) ? String(v) : 'NULL') : `'${String(v).replace(/'/g, "''")}'`);
  return s.sql.replace(/\?/g, () => q(s.params[i++])) + ';';
}

/**
 * The nightly job, in priority order while the budget lasts: the last ten days of every daily breakdown, this month's
 * (and in its first five days, last month's) period breakdowns, video profiles (videos under 60 days old daily, the rest
 * weekly, oldest refresh first), then any month still missing from the history.
 */
export async function deepNightly(db: D1Database, rep: Rep, left: () => number, titles: (ids: string[]) => Promise<Record<string, string>>): Promise<string> {
  const now = Date.now(), latest = dayOf(now - DAY_MS), start10 = dayOf(now - 10 * DAY_MS);
  const stmts: Stmt[] = [], failed: string[] = [];
  let calls = 0;
  const run = async (name: string, cost: number, fn: () => Promise<Stmt[]>) => {
    if (left() < cost) return false;
    try { stmts.push(...(await fn())); calls++; } catch (e) { failed.push(`${name}: ${String((e as Error).message).slice(0, 60)}`); }
    return true;
  };
  try {
    for (const dim of Object.keys(DAILY)) await run(`daily ${dim}`, 1, () => dailyDim(rep, dim, start10, latest, now));
    await run('cards', 1, () => cardsDaily(rep, start10, latest, now));
    const thisMonth = latest.slice(0, 7), prevMonth = months(dayOf(now - 40 * DAY_MS), thisMonth).slice(-2)[0];
    const monthsNow = Number(latest.slice(8, 10)) <= 5 && prevMonth !== thisMonth ? [thisMonth, prevMonth] : [thisMonth];
    for (const m of monthsNow) for (const dim of MONTHLY) await run(`${dim} ${m}`, 2, () => monthlyDim(rep, dim, m, latest, now, titles));

    const doneRows = (await db.prepare('SELECT item, fetched_at FROM yt_deep_done').all<{ item: string; fetched_at: number }>()).results;
    const doneAt = new Map(doneRows.map((r) => [r.item, r.fetched_at]));
    const vids = (await db.prepare('SELECT youtube_id, published FROM videos WHERE published IS NOT NULL ORDER BY published DESC').all<{ youtube_id: string; published: string }>()).results;
    const due = vids.filter((v) => {
      const at = doneAt.get(`video:${v.youtube_id}`) ?? 0, young = now - Date.parse(v.published) < 60 * DAY_MS;
      return now - at > (young ? 20 * 3_600_000 : 7 * DAY_MS);
    }).sort((a, b) => (doneAt.get(`video:${a.youtube_id}`) ?? 0) - (doneAt.get(`video:${b.youtube_id}`) ?? 0));
    let profiled = 0;
    for (const v of due) { if (!(await run(`video ${v.youtube_id}`, 4, () => videoProfile(rep, v, latest, now)))) break; profiled++; }

    // history still missing, newest first (the one-time --deep-history load normally leaves nothing here)
    const first = vids.length ? vids[vids.length - 1].published.slice(0, 7) : thisMonth, all = months(first, thisMonth).reverse();
    let backfilled = 0;
    for (const m of all) for (const dim of Object.keys(DAILY)) if (!doneAt.has(`daily:${dim}:${m}`)) {
      const { start, end } = monthSpan(m, latest);
      if (await run(`daily ${dim} ${m}`, 1, () => dailyDim(rep, dim, start, end, now, `daily:${dim}:${m}`))) backfilled++; else break;
    }
    for (const m of all) for (const dim of MONTHLY) if (!doneAt.has(`monthly:${dim}:${m}`)) {
      if (await run(`${dim} ${m}`, 2, () => monthlyDim(rep, dim, m, latest, now, titles))) backfilled++; else break;
    }
    return `${calls} reports; ${profiled} video profiles (${due.length - profiled} still due); ${backfilled} history months`
      + (failed.length ? `; skipped: ${failed.slice(0, 4).join(' | ')}${failed.length > 4 ? ' …' : ''}` : '');
  } finally {
    const prepared = stmts.map((s) => db.prepare(s.sql).bind(...s.params));
    for (let i = 0; i < prepared.length; i += 400) await db.batch(prepared.slice(i, i + 400));
  }
}
