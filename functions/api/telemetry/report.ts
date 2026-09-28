/**
 * GET /api/telemetry/report?from=YYYY-MM-DD&to=YYYY-MM-DD[&env=preview] — the Web analytics view, in one batch.
 * Production readers by default; env=preview or env=local shows test traffic instead. Locked behind Cloudflare
 * Access (server/access.ts). Bots are left out. "Visitors" are daily visitors: the hash changes every day, so one
 * person reading on two days counts twice. `prev` holds the same totals for the previous period of equal length.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore, parseRange } from '../../../server/range';

const H = 'bot = 0 AND env = ?3 AND ts >= ?1 AND ts < ?2';     // every page_views query starts here
const VIS = 'COUNT(DISTINCT day || visitor)';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });

  const url = new URL(request.url), r = parseRange(url);
  const site = ['production', 'preview', 'local'].includes(url.searchParams.get('env') ?? '') ? url.searchParams.get('env')! : 'production';
  const bucket = r.hourly ? "strftime('%Y-%m-%dT%H', ts / 1000, 'unixepoch')" : 'day';
  const q = (sql: string) => env.DB.prepare(sql).bind(r.since, r.until, site);
  const p = (sql: string) => env.DB.prepare(sql).bind(r.prevSince, r.prevUntil, site);
  const TOT = `SELECT COUNT(*) views, ${VIS} visitors, AVG(NULLIF(engaged_ms, 0)) engaged, AVG(scroll_pct) scroll FROM page_views WHERE ${H}`;
  const BOUNCE = `SELECT AVG(n = 1) bounce FROM (SELECT COUNT(*) n FROM page_views WHERE ${H} GROUP BY day, visitor)`;
  const OUT = `SELECT CASE WHEN target LIKE '%youtube.com%' OR target LIKE 'youtu.be%' THEN 'youtube'
                   WHEN target LIKE '%substack.com%' THEN 'substack'
                   WHEN target LIKE 'x.com%' OR target LIKE 'twitter.com%' THEN 'x' ELSE 'other' END dest, COUNT(*) clicks
         FROM events WHERE bot = 0 AND env = ?3 AND ts >= ?1 AND ts < ?2 AND name = 'outbound' GROUP BY dest`;
  const res = await env.DB.batch([
    q(TOT), q(BOUNCE),
    q(`SELECT ${bucket} k, COUNT(*) views, ${VIS} visitors, COUNT(DISTINCT CASE WHEN source = 'youtube' THEN day || visitor END) from_youtube
         FROM page_views WHERE ${H} GROUP BY k ORDER BY k`),
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
    q(`SELECT target, COUNT(*) clicks FROM events WHERE bot = 0 AND env = ?3 AND ts >= ?1 AND ts < ?2 AND name = 'outbound' GROUP BY target ORDER BY clicks DESC LIMIT 15`),
    q(OUT),
    q(`SELECT COUNT(*) n FROM page_views WHERE bot = 1 AND env = ?3 AND ts >= ?1 AND ts < ?2`),
    p(TOT), p(BOUNCE), p(OUT),
  ]);
  const x = res.map((y) => y.results ?? []);
  const outs = (rows: any[]) => Object.fromEntries(rows.map((o) => [o.dest, o.clicks]));
  return Response.json({
    range: r, env: site, generated: Date.now(),
    totals: { ...(x[0][0] as object), ...(x[1][0] as object), bots: (x[14][0] as { n: number })?.n ?? 0, out: outs(x[13]) },
    prev: { ...(x[15][0] as object), ...(x[16][0] as object), out: outs(x[17]) },
    series: x[2], pages: x[3], sources: x[4], referrers: x[5], campaigns: x[6], countries: x[7], cities: x[8],
    orgs: x[9], tech: x[10], videos: x[11], outbound: x[12],
  }, { headers: noStore });
};
