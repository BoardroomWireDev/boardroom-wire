/**
 * GET /api/telemetry/overview?from=YYYY-MM-DD&to=YYYY-MM-DD — the Overview: YouTube and the site day by day on one
 * timeline, the headline figures against the previous period, and the videos that did the most.
 *
 * Site traffic has two sources that are never mixed into one number: Wire Telemetry visitors (the beacon, from
 * 27 Sep 2026, bots out) and Cloudflare's real-browser page loads (edge counts, bots partly filtered, kept from
 * 29 Aug 2026 and copied daily). The Overview shows both, labelled, so the site's line has history.
 * Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore, parseRange } from '../../../server/range';

const SITE = "env = 'production' AND bot = 0 AND day >= ?1 AND day <= ?2";
const CF_HUMAN = "human = 1 AND kind != 'embed' AND day >= ?1 AND day <= ?2";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const r = parseRange(new URL(request.url));
  const q = (sql: string) => env.DB.prepare(sql).bind(r.from, r.to);
  const p = (sql: string) => env.DB.prepare(sql).bind(r.prevFrom, r.prevTo);
  const KPI = `SELECT
      (SELECT SUM(views) FROM youtube_channel_daily WHERE day >= ?1 AND day <= ?2) yt_views,
      (SELECT SUM(minutes) FROM youtube_channel_daily WHERE day >= ?1 AND day <= ?2) yt_minutes,
      (SELECT SUM(revenue) FROM youtube_channel_daily WHERE day >= ?1 AND day <= ?2) yt_revenue,
      (SELECT SUM(subs_gained) - SUM(subs_lost) FROM youtube_channel_daily WHERE day >= ?1 AND day <= ?2) yt_subs,
      (SELECT COUNT(DISTINCT day || visitor) FROM page_views WHERE ${SITE}) site_visitors,
      (SELECT COUNT(DISTINCT CASE WHEN source = 'youtube' THEN day || visitor END) FROM page_views WHERE ${SITE}) site_from_youtube,
      (SELECT SUM(loads) FROM cf_pages WHERE ${CF_HUMAN}) cf_loads,
      (SELECT COUNT(*) FROM events WHERE ${SITE} AND name = 'outbound' AND target LIKE '%substack.com%') substack_clicks`;
  const res = await env.DB.batch([
    // one row per day of the range that any source has, joined on day
    q(`WITH days(day) AS (SELECT day FROM youtube_channel_daily WHERE day >= ?1 AND day <= ?2
                          UNION SELECT day FROM cf_pages WHERE day >= ?1 AND day <= ?2
                          UNION SELECT day FROM page_views WHERE ${SITE})
       SELECT d.day, c.views yt_views, c.minutes yt_minutes, c.subs_gained - c.subs_lost yt_subs,
              t.visitors site_visitors, t.from_youtube site_from_youtube, f.loads cf_loads
       FROM days d
       LEFT JOIN youtube_channel_daily c ON c.day = d.day
       LEFT JOIN (SELECT day, COUNT(DISTINCT visitor) visitors, COUNT(DISTINCT CASE WHEN source = 'youtube' THEN visitor END) from_youtube
                  FROM page_views WHERE ${SITE} GROUP BY day) t ON t.day = d.day
       LEFT JOIN (SELECT day, SUM(loads) loads FROM cf_pages WHERE ${CF_HUMAN} GROUP BY day) f ON f.day = d.day
       ORDER BY d.day`),
    q(KPI), p(KPI),
    q(`SELECT v.youtube_id, v.title, v.slug, v.short, v.published, SUM(d.views) views, SUM(d.minutes) minutes, SUM(d.subs_gained) - SUM(d.subs_lost) subs,
         (SELECT COUNT(DISTINCT pv.day || pv.visitor) FROM page_views pv WHERE pv.video = v.slug AND pv.env = 'production' AND pv.bot = 0 AND pv.day >= ?1 AND pv.day <= ?2) site_visitors
       FROM videos v JOIN youtube_daily d ON d.youtube_id = v.youtube_id AND d.day >= ?1 AND d.day <= ?2
       GROUP BY v.youtube_id HAVING SUM(d.views) > 0 ORDER BY views DESC LIMIT 6`),
    env.DB.prepare(`SELECT MAX(day) d FROM youtube_channel_daily`),
    env.DB.prepare(`SELECT MIN(day) d FROM page_views WHERE env = 'production' AND bot = 0`),
  ]);
  const x = res.map((y) => y.results ?? []);
  return Response.json({
    range: r, series: x[0], totals: x[1][0] ?? {}, prev: x[2][0] ?? {}, videos: x[3],
    ytLatest: (x[4][0] as any)?.d ?? null, telemetryFrom: (x[5][0] as any)?.d ?? null,
  }, { headers: noStore });
};
