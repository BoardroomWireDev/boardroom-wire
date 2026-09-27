/**
 * GET /api/telemetry/report?range=24h|7d|30d|90d|365d — everything the dashboard shows, in one batch.
 * Locked behind Cloudflare Access (server/access.ts). Bots are left out. "Visitors" are daily visitors:
 * the hash changes every day, so one person reading on two days counts twice.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';

const RANGES: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
const H = 'bot = 0 AND ts >= ?1';                  // every page_views query starts here
const VIS = 'COUNT(DISTINCT day || visitor)';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });

  const range = new URL(request.url).searchParams.get('range') ?? '7d';
  const days = RANGES[range] ?? 7, now = Date.now();
  const since = range === '24h' ? now - 86_400_000 : Date.parse(new Date(now - (days - 1) * 86_400_000).toISOString().slice(0, 10));
  const bucket = range === '24h' ? "strftime('%Y-%m-%dT%H', ts / 1000, 'unixepoch')" : 'day';

  const q = (sql: string) => env.DB.prepare(sql).bind(since);
  const res = await env.DB.batch([
    q(`SELECT COUNT(*) views, ${VIS} visitors, AVG(NULLIF(engaged_ms, 0)) engaged, AVG(scroll_pct) scroll FROM page_views WHERE ${H}`),
    q(`SELECT AVG(n = 1) bounce FROM (SELECT COUNT(*) n FROM page_views WHERE ${H} GROUP BY day, visitor)`),
    q(`SELECT ${bucket} k, COUNT(*) views, ${VIS} visitors FROM page_views WHERE ${H} GROUP BY k ORDER BY k`),
    q(`SELECT path, kind, article, video, MAX(title) title, COUNT(*) views, ${VIS} visitors, AVG(NULLIF(engaged_ms, 0)) engaged, AVG(scroll_pct) scroll
         FROM page_views WHERE ${H} GROUP BY path ORDER BY views DESC LIMIT 25`),
    q(`SELECT source, COUNT(*) views, ${VIS} visitors FROM page_views WHERE ${H} AND source != 'internal' GROUP BY source ORDER BY visitors DESC, views DESC`),
    q(`SELECT ref_host host, COUNT(*) views FROM page_views WHERE ${H} AND source NOT IN ('internal', 'direct') AND ref_host != '' GROUP BY ref_host ORDER BY views DESC LIMIT 15`),
    q(`SELECT utm_source source, utm_medium medium, utm_campaign campaign, COUNT(*) views, ${VIS} visitors FROM page_views
         WHERE ${H} AND (utm_source IS NOT NULL OR utm_campaign IS NOT NULL) GROUP BY 1, 2, 3 ORDER BY views DESC LIMIT 15`),
    q(`SELECT country, ${VIS} visitors, COUNT(*) views FROM page_views WHERE ${H} AND country IS NOT NULL GROUP BY country ORDER BY visitors DESC LIMIT 20`),
    q(`SELECT city, region, country, ROUND(AVG(lat), 1) lat, ROUND(AVG(lon), 1) lon, ${VIS} visitors, COUNT(*) views FROM page_views
         WHERE ${H} AND lat IS NOT NULL GROUP BY city, country ORDER BY visitors DESC LIMIT 400`),
    q(`SELECT org, asn, ${VIS} visitors, COUNT(*) views, GROUP_CONCAT(DISTINCT COALESCE(video, article, path)) pages, MAX(city) city, MAX(country) country
         FROM page_views WHERE ${H} AND net = 'org' GROUP BY asn ORDER BY visitors DESC, views DESC LIMIT 25`),
    q(`SELECT 'device' dim, device v, ${VIS} n FROM page_views WHERE ${H} GROUP BY device
       UNION ALL SELECT 'browser', browser, ${VIS} FROM page_views WHERE ${H} GROUP BY browser
       UNION ALL SELECT 'os', os, ${VIS} FROM page_views WHERE ${H} GROUP BY os
       UNION ALL SELECT 'net', COALESCE(net, 'unknown'), ${VIS} FROM page_views WHERE ${H} GROUP BY net`),
    q(`SELECT COALESCE(video, article) k, MAX(video) video, MAX(article) article, COUNT(*) views, ${VIS} visitors,
         AVG(NULLIF(engaged_ms, 0)) engaged, SUM(source = 'youtube') from_youtube, SUM(kind = 'analytics') dashboard_views
         FROM page_views WHERE ${H} AND (video IS NOT NULL OR article IS NOT NULL) GROUP BY k ORDER BY views DESC`),
    q(`SELECT target, COUNT(*) clicks FROM events WHERE bot = 0 AND ts >= ?1 AND name = 'outbound' GROUP BY target ORDER BY clicks DESC LIMIT 15`),
    q(`SELECT CASE WHEN target LIKE '%youtube.com%' OR target LIKE 'youtu.be%' THEN 'youtube'
                   WHEN target LIKE '%substack.com%' THEN 'substack'
                   WHEN target LIKE 'x.com%' OR target LIKE 'twitter.com%' THEN 'x' ELSE 'other' END dest, COUNT(*) clicks
         FROM events WHERE bot = 0 AND ts >= ?1 AND name = 'outbound' GROUP BY dest`),
    q(`SELECT COUNT(*) n FROM page_views WHERE bot = 1 AND ts >= ?1`),
  ]);
  const r = res.map((x) => x.results ?? []);
  return Response.json({
    range, since, generated: now,
    totals: { ...(r[0][0] as object), ...(r[1][0] as object), bots: (r[14][0] as { n: number })?.n ?? 0 },
    series: r[2], pages: r[3], sources: r[4], referrers: r[5], campaigns: r[6], countries: r[7], cities: r[8],
    orgs: r[9], tech: r[10], videos: r[11], outbound: r[12], outboundBy: r[13],
  }, { headers: { 'Cache-Control': 'no-store' } });
};
