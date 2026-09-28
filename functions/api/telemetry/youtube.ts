/**
 * GET /api/telemetry/youtube?from=YYYY-MM-DD&to=YYYY-MM-DD — the YouTube analytics view (db/migrations/0004, filled
 * nightly by the collector's youtube-daily job): the channel per day, KPIs against the previous period, every
 * video with what it sent to the site, where views came from, and Shorts against long-form. Videos join the site
 * by slug (videos.slug = page_views.video). YouTube reports two to three days behind. Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore, parseRange } from '../../../server/range';

const SITE = "env = 'production' AND bot = 0 AND day >= ?1 AND day <= ?2";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const r = parseRange(new URL(request.url));
  const q = (sql: string) => env.DB.prepare(sql).bind(r.from, r.to);
  const p = (sql: string) => env.DB.prepare(sql).bind(r.prevFrom, r.prevTo);
  const TOT = `SELECT SUM(views) views, SUM(minutes) minutes, SUM(subs_gained) - SUM(subs_lost) subs, COUNT(*) days FROM youtube_channel_daily WHERE day >= ?1 AND day <= ?2`;
  const PCT = `SELECT SUM(avg_view_pct * views) / NULLIF(SUM(views), 0) avg_pct, SUM(likes) likes, SUM(comments) comments, SUM(shares) shares
               FROM youtube_daily WHERE day >= ?1 AND day <= ?2`;
  const FROMYT = `SELECT COUNT(DISTINCT day || visitor) visitors FROM page_views WHERE ${SITE} AND source = 'youtube'`;
  const res = await env.DB.batch([
    q(`SELECT c.day, c.views, c.minutes, c.subs_gained - c.subs_lost subs, COALESCE(s.visitors, 0) site_from_youtube FROM youtube_channel_daily c
       LEFT JOIN (SELECT day, COUNT(DISTINCT visitor) visitors FROM page_views WHERE ${SITE} AND source = 'youtube' GROUP BY day) s ON s.day = c.day
       WHERE c.day >= ?1 AND c.day <= ?2 ORDER BY c.day`),
    q(TOT), q(PCT), q(FROMYT),
    q(`SELECT v.youtube_id, v.title, v.slug, v.article, v.published, v.duration_s, v.short, SUM(d.views) views, SUM(d.minutes) minutes,
         SUM(d.avg_view_pct * d.views) / NULLIF(SUM(d.views), 0) avg_pct, SUM(d.subs_gained) - SUM(d.subs_lost) subs,
         SUM(d.likes) likes, SUM(d.comments) comments, SUM(d.shares) shares
       FROM videos v JOIN youtube_daily d ON d.youtube_id = v.youtube_id AND d.day >= ?1 AND d.day <= ?2
       GROUP BY v.youtube_id HAVING SUM(d.views) > 0 ORDER BY views DESC`),
    q(`SELECT video, COUNT(*) views, COUNT(DISTINCT day || visitor) visitors, COUNT(DISTINCT CASE WHEN source = 'youtube' THEN day || visitor END) from_youtube
       FROM page_views WHERE ${SITE} AND video IS NOT NULL GROUP BY video`),
    q(`SELECT video, COUNT(*) clicks FROM events WHERE ${SITE} AND name = 'outbound' AND target LIKE '%substack.com%' AND video IS NOT NULL GROUP BY video`),
    q(`SELECT source, SUM(views) views, SUM(minutes) minutes FROM youtube_sources WHERE day >= ?1 AND day <= ?2 GROUP BY source ORDER BY views DESC`),
    q(`SELECT v.short, COUNT(DISTINCT v.youtube_id) videos, SUM(d.views) views, SUM(d.minutes) minutes, SUM(d.subs_gained) - SUM(d.subs_lost) subs,
         SUM(d.avg_view_pct * d.views) / NULLIF(SUM(d.views), 0) avg_pct
       FROM videos v JOIN youtube_daily d ON d.youtube_id = v.youtube_id AND d.day >= ?1 AND d.day <= ?2 GROUP BY v.short`),
    p(TOT), p(PCT), p(FROMYT),
  ]);
  const x = res.map((y) => y.results ?? []);
  const site = new Map((x[5] as any[]).map((s) => [s.video, s])), subs = new Map((x[6] as any[]).map((s) => [s.video, s.clicks]));
  const videos = (x[4] as any[]).map((v) => ({ ...v, site_views: site.get(v.slug)?.views ?? null, site_from_youtube: site.get(v.slug)?.from_youtube ?? null,
    substack_clicks: v.slug ? subs.get(v.slug) ?? 0 : null }));
  return Response.json({
    range: r, series: x[0],
    totals: { ...(x[1][0] as object), ...(x[2][0] as object), site_from_youtube: (x[3][0] as any)?.visitors ?? 0 },
    prev: { ...(x[9][0] as object), ...(x[10][0] as object), site_from_youtube: (x[11][0] as any)?.visitors ?? 0 },
    videos, sources: x[7], formats: x[8],
  }, { headers: noStore });
};
