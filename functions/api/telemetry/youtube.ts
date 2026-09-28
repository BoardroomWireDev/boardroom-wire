/**
 * GET /api/telemetry/youtube?range=7d|30d|90d|365d — the channel's YouTube numbers (db/migrations/0004, filled
 * nightly by the collector's youtube-daily job) beside the site's own: per day, per video, and where views came
 * from. Videos join the site by slug (videos.slug = page_views.video). Locked behind Cloudflare Access.
 * YouTube reports with a two-to-three-day lag, so the newest days fill in late.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';

const RANGES: Record<string, number> = { '24h': 7, '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const range = new URL(request.url).searchParams.get('range') ?? '30d', days = RANGES[range] ?? 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const q = (sql: string) => env.DB.prepare(sql).bind(since);
  const SITE = "env = 'production' AND bot = 0 AND day >= ?1";
  const res = await env.DB.batch([
    q(`SELECT c.day, c.views, c.minutes, c.subs_gained - c.subs_lost subs, s.visitors site_visitors FROM youtube_channel_daily c
       LEFT JOIN (SELECT day, COUNT(DISTINCT visitor) visitors FROM page_views WHERE ${SITE} AND source = 'youtube' GROUP BY day) s ON s.day = c.day
       WHERE c.day >= ?1 ORDER BY c.day`),
    q(`SELECT SUM(views) views, SUM(minutes) minutes, SUM(subs_gained) - SUM(subs_lost) subs FROM youtube_channel_daily WHERE day >= ?1`),
    q(`SELECT SUM(avg_view_pct * views) / NULLIF(SUM(views), 0) avg_pct FROM youtube_daily WHERE day >= ?1`),
    q(`SELECT COUNT(DISTINCT day || visitor) visitors, COUNT(*) views FROM page_views WHERE ${SITE} AND source = 'youtube'`),
    q(`SELECT v.youtube_id, v.title, v.slug, v.article, v.published, v.short, SUM(d.views) views, SUM(d.minutes) minutes,
         SUM(d.avg_view_pct * d.views) / NULLIF(SUM(d.views), 0) avg_pct, SUM(d.subs_gained) - SUM(d.subs_lost) subs,
         SUM(d.likes) likes, SUM(d.comments) comments, SUM(d.shares) shares
       FROM videos v JOIN youtube_daily d ON d.youtube_id = v.youtube_id AND d.day >= ?1 GROUP BY v.youtube_id ORDER BY views DESC LIMIT 40`),
    q(`SELECT video, COUNT(*) views, COUNT(DISTINCT day || visitor) visitors, SUM(source = 'youtube') from_youtube FROM page_views
       WHERE ${SITE} AND video IS NOT NULL GROUP BY video`),
    q(`SELECT video, COUNT(*) clicks FROM events WHERE ${SITE} AND name = 'outbound' AND target LIKE '%substack.com%' AND video IS NOT NULL GROUP BY video`),
    q(`SELECT source, SUM(views) views, SUM(minutes) minutes FROM youtube_sources WHERE day >= ?1 GROUP BY source ORDER BY views DESC`),
    env.DB.prepare(`SELECT (SELECT COUNT(*) FROM videos) videos, (SELECT MIN(day) FROM youtube_days_done) from_day, (SELECT COUNT(*) FROM youtube_days_done) days_done,
       (SELECT MIN(substr(published, 1, 10)) FROM videos) first_upload,
       (SELECT MAX(ts) FROM collector_runs WHERE job = 'youtube-daily' AND ok = 1) last_ok,
       (SELECT ok FROM collector_runs WHERE job = 'youtube-daily' ORDER BY ts DESC LIMIT 1) last_ok_flag,
       (SELECT detail FROM collector_runs WHERE job = 'youtube-daily' ORDER BY ts DESC LIMIT 1) last_detail`),
  ]);
  const r = res.map((x) => x.results ?? []);
  const site = new Map((r[5] as any[]).map((s) => [s.video, s])), subs = new Map((r[6] as any[]).map((s) => [s.video, s.clicks]));
  const videos = (r[4] as any[]).map((v) => ({ ...v, site_views: site.get(v.slug)?.views ?? 0, site_visitors: site.get(v.slug)?.visitors ?? 0,
    site_from_youtube: site.get(v.slug)?.from_youtube ?? 0, substack_clicks: subs.get(v.slug) ?? 0 }));
  return Response.json({
    range, since, daily: r[0], totals: { ...(r[1][0] as object), ...(r[2][0] as object), site_from_youtube: r[3][0] ?? {} },
    videos, sources: r[7], status: r[8][0] ?? {},
  }, { headers: { 'Cache-Control': 'no-store' } });
};
