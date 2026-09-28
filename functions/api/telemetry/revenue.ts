/**
 * GET /api/telemetry/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD — the Revenue view (db/migrations/0005, filled nightly by the
 * collector's youtube-daily job; history loaded once at consent). US dollars, estimated: YouTube revises until a
 * month is finalised. RPM = revenue per 1,000 views (Studio's definition); CPM and playback-based CPM are weighted by
 * ad impressions and monetized playbacks when summed over days. Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore, parseRange } from '../../../server/range';

const IN = 'day >= ?1 AND day <= ?2';
const TOT = `SELECT SUM(revenue) revenue, SUM(ad_revenue) ad_revenue, SUM(red_revenue) red_revenue, SUM(gross_revenue) gross_revenue,
  SUM(cpm * ad_impressions) / NULLIF(SUM(ad_impressions), 0) cpm, SUM(playback_cpm * monetized_playbacks) / NULLIF(SUM(monetized_playbacks), 0) playback_cpm,
  SUM(monetized_playbacks) monetized_playbacks, SUM(ad_impressions) ad_impressions, SUM(views) views, COUNT(revenue) days
  FROM youtube_channel_daily WHERE ${IN}`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const r = parseRange(new URL(request.url));
  const q = (sql: string) => env.DB.prepare(sql).bind(r.from, r.to);
  const p = (sql: string) => env.DB.prepare(sql).bind(r.prevFrom, r.prevTo);
  const res = await env.DB.batch([
    q(`SELECT day, revenue, ad_revenue, red_revenue, gross_revenue, cpm, playback_cpm, monetized_playbacks, ad_impressions, views
       FROM youtube_channel_daily WHERE ${IN} ORDER BY day`),
    q(TOT), p(TOT),
    q(`SELECT v.youtube_id, v.title, v.slug, v.short, v.published, rv.revenue, rv.ad_revenue, rv.red_revenue, rv.cpm, rv.monetized_playbacks, vw.views
       FROM videos v
       JOIN (SELECT youtube_id, SUM(revenue) revenue, SUM(ad_revenue) ad_revenue, SUM(red_revenue) red_revenue,
               SUM(cpm * ad_impressions) / NULLIF(SUM(ad_impressions), 0) cpm, SUM(monetized_playbacks) monetized_playbacks
             FROM youtube_revenue_daily WHERE ${IN} GROUP BY youtube_id) rv ON rv.youtube_id = v.youtube_id
       LEFT JOIN (SELECT youtube_id, SUM(views) views FROM youtube_daily WHERE ${IN} GROUP BY youtube_id) vw ON vw.youtube_id = v.youtube_id
       WHERE rv.revenue > 0 ORDER BY rv.revenue DESC`),
    q(`SELECT v.short, SUM(rv.revenue) revenue, (SELECT SUM(d.views) FROM youtube_daily d JOIN videos v2 ON v2.youtube_id = d.youtube_id
         WHERE v2.short = v.short AND d.day >= ?1 AND d.day <= ?2) views, COUNT(DISTINCT rv.youtube_id) videos
       FROM youtube_revenue_daily rv JOIN videos v ON v.youtube_id = rv.youtube_id WHERE rv.day >= ?1 AND rv.day <= ?2 GROUP BY v.short`),
    q(`SELECT substr(day, 1, 7) month, SUM(revenue) revenue, SUM(views) views, SUM(cpm * ad_impressions) / NULLIF(SUM(ad_impressions), 0) cpm,
         SUM(monetized_playbacks) monetized_playbacks FROM youtube_channel_daily WHERE ${IN} AND revenue IS NOT NULL GROUP BY month ORDER BY month DESC`),
    env.DB.prepare(`SELECT (SELECT MIN(day) FROM youtube_channel_daily WHERE revenue > 0) monetized_from,
       (SELECT MAX(day) FROM youtube_channel_daily WHERE revenue IS NOT NULL) latest`),
  ]);
  const x = res.map((y) => y.results ?? []);
  return Response.json({ range: r, series: x[0], totals: x[1][0] ?? {}, prev: x[2][0] ?? {}, videos: x[3], formats: x[4], months: x[5], meta: x[6][0] ?? {} },
    { headers: noStore });
};
