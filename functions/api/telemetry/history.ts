/**
 * GET /api/telemetry/history — Cloudflare's own edge history (cf_daily, cf_pages; scripts/cf-history.mjs):
 * the time before Wire Telemetry, and a bot-inclusive cross-check beside it. Locked behind Cloudflare Access.
 * "Human" loads are real browser families only; dashboard frames inside articles are counted apart.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';

const HUMAN_PAGES = "human = 1 AND kind != 'embed'";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const s = (sql: string) => env.DB.prepare(sql);
  const res = await env.DB.batch([
    s(`SELECT d.day, d.uniques, d.page_views cf_views, p.loads, p.visits, p.embeds FROM cf_daily d
       LEFT JOIN (SELECT day, SUM(CASE WHEN ${HUMAN_PAGES} THEN loads END) loads, SUM(CASE WHEN ${HUMAN_PAGES} THEN visits END) visits,
                         SUM(CASE WHEN human = 1 AND kind = 'embed' THEN loads END) embeds FROM cf_pages GROUP BY day) p ON p.day = d.day
       ORDER BY d.day`),
    s(`SELECT path, kind, article, video, SUM(loads) loads, SUM(visits) visits FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY path ORDER BY loads DESC LIMIT 20`),
    s(`SELECT video, SUM(CASE WHEN kind != 'embed' THEN loads ELSE 0 END) loads, SUM(CASE WHEN kind = 'embed' THEN loads ELSE 0 END) embeds
       FROM cf_pages WHERE human = 1 AND video IS NOT NULL GROUP BY video ORDER BY loads DESC`),
    s(`SELECT country, SUM(loads) loads FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY country ORDER BY loads DESC LIMIT 15`),
    s(`SELECT 'device' dim, device v, SUM(loads) n FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY device
       UNION ALL SELECT 'browser', browser, SUM(loads) FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY browser`),
    s(`SELECT (SELECT MIN(day) FROM cf_pages) pages_from, (SELECT MAX(day) FROM cf_pages) pages_to,
              (SELECT MIN(day) FROM cf_daily) daily_from, (SELECT MAX(fetched_at) FROM cf_daily) fetched,
              (SELECT SUM(CASE WHEN ${HUMAN_PAGES} THEN loads END) FROM cf_pages) loads,
              (SELECT SUM(CASE WHEN ${HUMAN_PAGES} THEN visits END) FROM cf_pages) visits,
              (SELECT SUM(CASE WHEN human = 1 AND kind = 'embed' THEN loads END) FROM cf_pages) embeds,
              (SELECT SUM(CASE WHEN human = 0 THEN loads END) FROM cf_pages) bot_loads,
              (SELECT MIN(day) FROM page_views WHERE env = 'production' AND bot = 0) telemetry_from`),
  ]);
  const r = res.map((x) => x.results ?? []);
  return Response.json({ daily: r[0], pages: r[1], videos: r[2], countries: r[3], tech: r[4], meta: r[5][0] ?? {} },
    { headers: { 'Cache-Control': 'no-store' } });
};
