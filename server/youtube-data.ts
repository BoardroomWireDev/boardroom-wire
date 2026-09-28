/**
 * YouTube → bw-data (db/migrations/0004): the channel's own Analytics numbers, read with the owner's read-only
 * OAuth consent (scripts/youtube-auth.mjs set it up; the refresh token lives as a collector secret).
 *
 * Used by the collector's youtube-daily job. The Workers free plan allows 50 outbound requests per run, so the
 * work is shaped to stay under it: one query per *day* returns every video's numbers at once (dimensions=video),
 * the last ten days are re-fetched nightly (YouTube revises recent days), and older days are backfilled
 * a month or so per run, newest first, until the channel's first upload is reached.
 *
 * Erasable TypeScript only (Node 24 can import this file directly).
 */

export const CHANNEL_ID = 'UCthfphsDjHppg9SQv3JTdrg';
export const SCOPES = ['https://www.googleapis.com/auth/yt-analytics.readonly', 'https://www.googleapis.com/auth/youtube.readonly'];
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

async function getJson(url: string, token: string): Promise<any> {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const j: any = await r.json();
  if (!r.ok) throw new Error(`${new URL(url).pathname} ${r.status}: ${JSON.stringify(j.error?.message ?? j).slice(0, 200)}`);
  return j;
}

/** A YouTube Analytics report as plain objects keyed by column name. */
export async function report(token: string, params: Record<string, string>): Promise<Record<string, any>[]> {
  const q = new URLSearchParams({ ids: 'channel==MINE', ...params });
  const j = await getJson(`https://youtubeanalytics.googleapis.com/v2/reports?${q}`, token);
  const cols: string[] = (j.columnHeaders ?? []).map((c: any) => c.name);
  return (j.rows ?? []).map((row: any[]) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

const isoSeconds = (d: string) => {
  const m = d.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0)) : null;
};

export interface Video { youtube_id: string; title: string; published: string; duration_s: number | null; short: number }

/** Every upload: the uploads playlist, then details 50 at a time. About two requests for this channel. */
export async function listUploads(token: string): Promise<{ videos: Video[]; requests: number }> {
  const ids: string[] = []; let page = '', requests = 0;
  do {
    const j = await getJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=UU${CHANNEL_ID.slice(2)}${page ? `&pageToken=${page}` : ''}`, token);
    requests++; ids.push(...j.items.map((i: any) => i.contentDetails.videoId)); page = j.nextPageToken ?? '';
  } while (page && requests < 10);
  const videos: Video[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const j = await getJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids.slice(i, i + 50).join(',')}`, token);
    requests++;
    for (const v of j.items) {
      const secs = isoSeconds(v.contentDetails.duration);
      const tagged = /#shorts?\b/i.test(`${v.snippet.title} ${v.snippet.description ?? ''}`);
      videos.push({ youtube_id: v.id, title: v.snippet.title, published: v.snippet.publishedAt, duration_s: secs, short: (secs != null && secs <= 60) || tagged ? 1 : 0 });
    }
  }
  return { videos, requests };
}

export const channelDaily = (token: string, start: string, end: string) =>
  report(token, { startDate: start, endDate: end, dimensions: 'day', sort: 'day', metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost' });

/** Every video's numbers for one day, in one request. */
export const videosOnDay = (token: string, day: string) =>
  report(token, { startDate: day, endDate: day, dimensions: 'video', sort: '-views', maxResults: '200',
    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments,shares' });

export const sourcesForVideo = (token: string, id: string, start: string, end: string) =>
  report(token, { startDate: start, endDate: end, dimensions: 'day,insightTrafficSourceType', filters: `video==${id}`, metrics: 'views,estimatedMinutesWatched' });

/**
 * The nightly job. `mapping` is the site's own list of video → article (www.boardroomwire.com/data/videos.json).
 * Returns a one-line summary for collector_runs.
 */
export async function youtubeDaily(db: D1Database, creds: { clientId: string; clientSecret: string; refreshToken: string },
  mapping: Array<{ youtube: string; slug: string | null; article: string }>, budget = 44): Promise<string> {
  const now = Date.now(), yesterday = dayOf(now - DAY_MS);
  const token = await accessToken(creds.clientId, creds.clientSecret, creds.refreshToken);
  let used = 1;

  // 1. the uploads, and the site's article for each
  const { videos, requests } = await listUploads(token); used += requests;
  const bySite = new Map(mapping.map((m) => [m.youtube, m]));
  const stmts: D1PreparedStatement[] = [];
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
  const ch = await channelDaily(token, chFrom, yesterday); used++;
  const chUp = db.prepare('INSERT OR REPLACE INTO youtube_channel_daily (day, views, minutes, subs_gained, subs_lost) VALUES (?, ?, ?, ?, ?)');
  for (const r of ch) stmts.push(chUp.bind(r.day, r.views, r.estimatedMinutesWatched, r.subscribersGained, r.subscribersLost));

  // 3. per-video days: the last ten always, then the newest missing older days, as far as the budget allows
  const recent = Array.from({ length: 10 }, (_, i) => dayOf(now - (i + 1) * DAY_MS)).filter((d) => d >= first);
  const young = videos.filter((v) => now - Date.parse(v.published) < 60 * DAY_MS).slice(0, 4);
  const room = Math.max(0, budget - used - recent.length - young.length - 1);
  const { results: done } = await db.prepare('SELECT day FROM youtube_days_done').all<{ day: string }>();
  const doneSet = new Set(done.map((r) => r.day)), older: string[] = [];
  for (let t = now - 11 * DAY_MS; dayOf(t) >= first && older.length < room; t -= DAY_MS) if (!doneSet.has(dayOf(t))) older.push(dayOf(t));
  const dayUp = db.prepare(`INSERT OR REPLACE INTO youtube_daily (youtube_id, day, views, minutes, avg_view_s, avg_view_pct, subs_gained, subs_lost, likes, comments, shares)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const doneUp = db.prepare('INSERT OR REPLACE INTO youtube_days_done (day, fetched_at) VALUES (?, ?)');
  let rows = 0;
  for (const d of [...recent, ...older]) {
    const rs = await videosOnDay(token, d); used++;
    stmts.push(db.prepare('DELETE FROM youtube_daily WHERE day = ?').bind(d));
    for (const r of rs) {
      stmts.push(dayUp.bind(r.video, d, r.views, r.estimatedMinutesWatched, r.averageViewDuration, r.averageViewPercentage,
        r.subscribersGained, r.subscribersLost, r.likes, r.comments, r.shares)); rows++;
    }
    stmts.push(doneUp.bind(d, now));
  }

  // 4. where the young videos' views came from, since publication
  let srcRows = 0;
  const srcUp = db.prepare('INSERT OR REPLACE INTO youtube_sources (youtube_id, day, source, views, minutes) VALUES (?, ?, ?, ?, ?)');
  for (const v of young) {
    const rs = await sourcesForVideo(token, v.youtube_id, v.published.slice(0, 10), yesterday); used++;
    for (const r of rs) { stmts.push(srcUp.bind(v.youtube_id, r.day, r.insightTrafficSourceType, r.views, r.estimatedMinutesWatched)); srcRows++; }
  }

  for (let i = 0; i < stmts.length; i += 400) await db.batch(stmts.slice(i, i + 400));
  const left = (() => { let n = 0; for (let t = now - 11 * DAY_MS; dayOf(t) >= first; t -= DAY_MS) if (!doneSet.has(dayOf(t)) && !older.includes(dayOf(t))) n++; return n; })();
  return `${videos.length} uploads; channel ${ch.length} days; per-video ${recent.length}+${older.length} days (${rows} rows)`
    + `${left ? `, ${left} older days still to backfill` : ', history complete'}; sources for ${young.length} recent videos (${srcRows} rows); ${used} requests`;
}
