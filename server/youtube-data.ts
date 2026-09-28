/**
 * YouTube → bw-data (db/migrations/0004): the channel's own Analytics numbers, read with the owner's read-only
 * OAuth consent (scripts/youtube-auth.mjs set it up; the refresh token lives as a collector secret).
 *
 * Used by the collector's youtube-daily job. The Workers free plan allows 50 outbound requests per run, so the
 * work is shaped to stay under it: one query per *day* returns every video's numbers at once (dimensions=video),
 * the last ten days are re-fetched nightly (YouTube revises recent days), and older days are backfilled
 * newest first while the run's budget lasts, until the channel's first upload is reached.
 *
 * Google's Analytics API throws the odd 500 "Internal error encountered". A failed request is retried once; a
 * day that still fails is skipped and left for the next run. It never costs the rest of the run, and whatever was
 * fetched is written.
 *
 * Erasable TypeScript only (Node 24 can import this file directly): no parameter properties, enums or namespaces.
 */

export const CHANNEL_ID = 'UCthfphsDjHppg9SQv3JTdrg';
export const SCOPES = ['yt-analytics.readonly', 'youtube.readonly', 'yt-analytics-monetary.readonly'].map((x) => 'https://www.googleapis.com/auth/' + x);
/** Revenue metrics (migration 0005), US dollars. Needs the monetary scope and a Partner Program channel. */
export const R_METRICS = 'estimatedRevenue,estimatedAdRevenue,estimatedRedPartnerRevenue,grossRevenue,cpm,playbackBasedCpm,monetizedPlaybacks,adImpressions';
const DAY_MS = 86_400_000;
export const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10);

export async function accessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const j: any = await r.json();
  if (!j.access_token) throw new Error(`google token: ${j.error ?? r.status} ${j.error_description ?? ''}`.trim());
  return j.access_token;
}

/** Counts every request against the run's budget (the Workers free plan allows 50), retries included. */
export class Budget {
  used = 0;
  limit: number;
  constructor(limit: number) { this.limit = limit; }
  get left() { return this.limit - this.used; }
}

async function getJson(url: string, token: string, budget?: Budget): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    if (budget) budget.used++;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok) return j;
    const retry = r.status >= 500 && attempt < 1 && (!budget || budget.left > 0);
    if (!retry) throw new Error(`${new URL(url).pathname} ${r.status}: ${JSON.stringify(j.error?.message ?? j).slice(0, 200)}`);
    await new Promise((res) => setTimeout(res, 1500));
  }
}

/** A YouTube Analytics report as plain objects keyed by column name. */
export async function report(token: string, params: Record<string, string>, budget?: Budget): Promise<Record<string, any>[]> {
  const q = new URLSearchParams({ ids: 'channel==MINE', ...params });
  const j = await getJson(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, token, budget);
  const cols: string[] = (j.columnHeaders ?? []).map((c: any) => c.name);
  return (j.rows ?? []).map((row: any[]) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

const isoSeconds = (d: string) => {
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0)) : null;
};

// Shorts can run up to 3 minutes (since Oct 2024). Every upload of this channel at 3 minutes or under is a vertical Short;
// its essays run 5 to 40 minutes.
export interface Video { youtube_id: string; title: string; published: string; duration_s: number | null; short: number }

/** Every upload: the uploads playlist, then details 50 at a time. About two requests for this channel. */
export async function listUploads(token: string, budget?: Budget): Promise<Video[]> {
  const ids: string[] = []; let page = '', pages = 0;
  do {
    const j = await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=UU${CHANNEL_ID.slice(2)}${page ? `&pageToken=${page}` : ''}`, token, budget);
    pages++; ids.push(...j.items.map((i: any) => i.contentDetails.videoId)); page = j.nextPageToken ?? '';
  } while (page && pages < 10);
  const videos: Video[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await getJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.slice(i, i + 50).join(',')}`, token, budget);
    for (const v of j.items) {
      const secs = isoSeconds(v.contentDetails.duration);
      const tagged = /#shorts?\b/i.test(`${v.snippet.title} ${v.snippet.description ?? ''}`);
      videos.push({ youtube_id: v.id, title: v.snippet.title, published: v.snippet.publishedAt, duration_s: secs, short: (secs != null && secs <= 180) || tagged ? 1 : 0 });
    }
  }
  return videos;
}

export const channelDaily = (token: string, start: string, end: string, budget?: Budget) =>
  report(token, { startDate: start, endDate: end, dimensions: 'day', sort: 'day', metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost' }, budget);

/** Every video's numbers for one day, in one request. */
export const videosOnDay = (token: string, day: string, budget?: Budget) =>
  report(token, { startDate: day, endDate: day, dimensions: 'video', sort: '-views', maxResults: '200',
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares' }, budget);

export const channelRevenue = (token: string, start: string, end: string, budget?: Budget) =>
  report(token, { startDate: start, endDate: end, dimensions: 'day', sort: 'day', metrics: R_METRICS, currency: 'USD' }, budget);
/** Every video's revenue for one day, in one request. */
export const revenueOnDay = (token: string, day: string, budget?: Budget) =>
  report(token, { startDate: day, endDate: day, dimensions: 'video', sort: '-estimatedRevenue', maxResults: '200', metrics: R_METRICS, currency: 'USD' }, budget);

export const sourcesForVideo = (token: string, id: string, start: string, end: string, budget?: Budget) =>
  report(token, { startDate: start, endDate: end, dimensions: 'day,insightTrafficSourceType', filters: `video==${id}`, metrics: 'views,estimatedMinutesWatched' }, budget);

/**
 * The nightly job. `mapping` is the site's own list of video → article (www.boardroomwire.com/data/videos.json).
 * Returns a one-line summary for collector_runs.
 */
export async function youtubeDaily(db: D1Database, creds: { clientId: string; clientSecret: string; refreshToken: string },
  mapping: Array<{ youtube: string; slug: string | null; article: string }>, limit = 46): Promise<string> {
  const now = Date.now(), yesterday = dayOf(now - DAY_MS), budget = new Budget(limit);
  budget.used++;                                                    // the token exchange
  const token = await accessToken(creds.clientId, creds.clientSecret, creds.refreshToken);
  const stmts: D1PreparedStatement[] = [], failed: string[] = [];
  let rows = 0, srcRows = 0, chDays = 0, perVideo = 0, sourcesFor = 0, left = 0, uploads = 0, revDays = 0, revVideoDays = 0, revLeft = 0;
  try {
    // 1. the uploads, and the site's article for each
    const videos = await listUploads(token, budget); uploads = videos.length;
    const bySite = new Map(mapping.map((m) => [m.youtube, m]));
    const upsert = db.prepare(`INSERT INTO videos (youtube_id, slug, article, title, published, duration_s, short, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(youtube_id) DO UPDATE SET title = excluded.title, published = excluded.published, duration_s = excluded.duration_s, short = excluded.short,
        slug = COALESCE(excluded.slug, videos.slug), article = COALESCE(excluded.article, videos.article), updated_at = excluded.updated_at`);
    for (const v of videos) {
      const m = bySite.get(v.youtube_id);
      stmts.push(upsert.bind(v.youtube_id, m?.slug ?? null, m?.article ?? null, v.title, v.published, v.duration_s, v.short, now));
    }
    const first = videos.reduce((a, v) => (v.published < a ? v.published : a), yesterday).slice(0, 10);

    // 2. the channel per day: the last ten days, or everything since the first upload on the first run
    const lastChannel = (await db.prepare('SELECT MAX(day) d FROM youtube_channel_daily').first<{ d: string | null }>())?.d;
    const chFrom = lastChannel ? dayOf(Math.max(Date.parse(first), Date.parse(lastChannel) - 10 * DAY_MS)) : first;
    try {
      const ch = await channelDaily(token, chFrom, yesterday, budget); chDays = ch.length;
      const chUp = db.prepare(`INSERT INTO youtube_channel_daily (day, views, minutes, subs_gained, subs_lost) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(day) DO UPDATE SET views = excluded.views, minutes = excluded.minutes, subs_gained = excluded.subs_gained, subs_lost = excluded.subs_lost`);
      for (const r of ch) stmts.push(chUp.bind(r.day, r.views, r.estimatedMinutesWatched, r.subscribersGained, r.subscribersLost));
    } catch { failed.push('channel'); }
    try {                                             // revenue per day, channel-wide, same window (after the rows above exist)
      const cr = await channelRevenue(token, chFrom, yesterday, budget); revDays = cr.length;
      const up = db.prepare(`UPDATE youtube_channel_daily SET revenue = ?, ad_revenue = ?, red_revenue = ?, gross_revenue = ?, cpm = ?, playback_cpm = ?,
        monetized_playbacks = ?, ad_impressions = ? WHERE day = ?`);
      for (const r of cr) stmts.push(up.bind(r.estimatedRevenue, r.estimatedAdRevenue, r.estimatedRedPartnerRevenue, r.grossRevenue, r.cpm, r.playbackBasedCpm, r.monetizedPlaybacks, r.adImpressions, r.day));
    } catch { failed.push('channel revenue'); }

    // 3. per-video days: the last ten always, then the newest missing older days while the budget lasts,
    //    keeping room for the sources of up to four recent videos
    const young = videos.filter((v) => now - Date.parse(v.published) < 60 * DAY_MS).slice(0, 4);
    const recent = Array.from({ length: 10 }, (_, i) => dayOf(now - (i + 1) * DAY_MS)).filter((d) => d >= first);
    const { results: done } = await db.prepare('SELECT day FROM youtube_days_done').all<{ day: string }>();
    const doneSet = new Set(done.map((r) => r.day)), older: string[] = [];
    for (let t = now - 11 * DAY_MS; dayOf(t) >= first; t -= DAY_MS) if (!doneSet.has(dayOf(t))) older.push(dayOf(t));
    const dayUp = db.prepare(`INSERT OR REPLACE INTO youtube_daily (youtube_id, day, views, minutes, avg_view_s, avg_view_pct, subs_gained, subs_lost, likes, comments, shares)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const doneUp = db.prepare('INSERT OR REPLACE INTO youtube_days_done (day, fetched_at) VALUES (?, ?)');
    const reserve = young.length + recent.length + 1;              // room for the sources and the recent revenue days
    for (const d of [...recent, ...older]) {
      if (budget.left <= reserve) break;
      try {
        const rs = await videosOnDay(token, d, budget);
        stmts.push(db.prepare('DELETE FROM youtube_daily WHERE day = ?').bind(d));
        for (const r of rs) {
          stmts.push(dayUp.bind(r.video, d, r.views, r.estimatedMinutesWatched, r.averageViewDuration, r.averageViewPercentage,
            r.subscribersGained, r.subscribersLost, r.likes, r.comments, r.shares)); rows++;
        }
        stmts.push(doneUp.bind(d, now)); perVideo++; doneSet.add(d);
      } catch { failed.push(d); }
    }
    left = older.filter((d) => !doneSet.has(d)).length;

    // 3b. per-video revenue: the last ten days always (estimates move), then older missing days while the budget lasts
    const { results: revDone } = await db.prepare('SELECT day FROM youtube_revenue_days_done').all<{ day: string }>();
    const revSet = new Set(revDone.map((r) => r.day)), revOlder: string[] = [];
    for (let t = now - 11 * DAY_MS; dayOf(t) >= first; t -= DAY_MS) if (!revSet.has(dayOf(t))) revOlder.push(dayOf(t));
    const revUp = db.prepare(`INSERT OR REPLACE INTO youtube_revenue_daily (youtube_id, day, revenue, ad_revenue, red_revenue, gross_revenue, cpm, playback_cpm,
      monetized_playbacks, ad_impressions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const revDoneUp = db.prepare('INSERT OR REPLACE INTO youtube_revenue_days_done (day, fetched_at) VALUES (?, ?)');
    for (const d of [...recent, ...revOlder]) {
      if (budget.left <= young.length + 1) break;
      try {
        const rs = await revenueOnDay(token, d, budget);
        stmts.push(db.prepare('DELETE FROM youtube_revenue_daily WHERE day = ?').bind(d));
        for (const r of rs) stmts.push(revUp.bind(r.video, d, r.estimatedRevenue, r.estimatedAdRevenue, r.estimatedRedPartnerRevenue, r.grossRevenue, r.cpm,
          r.playbackBasedCpm, r.monetizedPlaybacks, r.adImpressions));
        stmts.push(revDoneUp.bind(d, now)); revVideoDays++; revSet.add(d);
      } catch { failed.push(`revenue ${d}`); }
    }
    revLeft = revOlder.filter((d) => !revSet.has(d)).length;

    // 4. where the young videos' views came from, since publication
    const srcUp = db.prepare('INSERT OR REPLACE INTO youtube_sources (youtube_id, day, source, views, minutes) VALUES (?, ?, ?, ?, ?)');
    for (const v of young) {
      if (budget.left <= 0) break;
      try {
        const rs = await sourcesForVideo(token, v.youtube_id, v.published.slice(0, 10), yesterday, budget); sourcesFor++;
        for (const r of rs) { stmts.push(srcUp.bind(v.youtube_id, r.day, r.insightTrafficSourceType, r.views, r.estimatedMinutesWatched)); srcRows++; }
      } catch { failed.push(`sources ${v.youtube_id}`); }
    }
  } finally {
    for (let i = 0; i < stmts.length; i += 400) await db.batch(stmts.slice(i, i + 400));
  }
  const summary = `${uploads} uploads; channel ${chDays} days (revenue ${revDays}); per-video ${perVideo} days (${rows} rows); revenue ${revVideoDays} days${revLeft ? ` (${revLeft} older to backfill)` : ''}`
    + `${left ? `, ${left} older days still to backfill` : ', history complete'}; sources for ${sourcesFor} recent videos (${srcRows} rows); ${budget.used} requests`;
  if (!perVideo && !chDays) throw new Error(`nothing fetched${failed.length ? `; failed: ${failed.slice(0, 6).join(', ')}` : ''}`);
  return summary + (failed.length ? `; skipped after a retry: ${failed.slice(0, 6).join(', ')}${failed.length > 6 ? ' …' : ''}` : '');
}
