/**
 * GET /api/telemetry/history?from=YYYY-MM-DD&to=YYYY-MM-DD — the Legacy view: Cloudflare's own edge history
 * (cf_daily, cf_pages; scripts/cf-history.mjs and the collector), the time before Wire Telemetry and a bot-inclusive
 * cross-check beside it. "Human" loads are real browser families only; dashboard frames inside articles are counted
 * apart. Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore, parseRange } from '../../../server/range';

const IN = 'day >= ?1 AND day <= ?2';
const HUMAN_PAGES = `human = 1 AND kind != 'embed' AND ${IN}`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const r = parseRange(new URL(request.url));
  const s = (sql: string) => env.DB.prepare(sql).bind(r.from, r.to);
  const res = await env.DB.batch([
    s(`SELECT d.day, d.uniques, d.page_views cf_views, p.loads, p.visits, p.embeds FROM cf_daily d
       LEFT JOIN (SELECT day, SUM(CASE WHEN human = 1 AND kind != 'embed' THEN loads END) loads, SUM(CASE WHEN human = 1 AND kind != 'embed' THEN visits END) visits,
                         SUM(CASE WHEN human = 1 AND kind = 'embed' THEN loads END) embeds FROM cf_pages WHERE ${IN} GROUP BY day) p ON p.day = d.day
       WHERE d.day >= ?1 AND d.day <= ?2 ORDER BY d.day`),
    s(`SELECT path, kind, article, video, SUM(loads) loads, SUM(visits) visits FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY path ORDER BY loads DESC LIMIT 20`),
    s(`SELECT video, SUM(CASE WHEN kind != 'embed' THEN loads ELSE 0 END) loads, SUM(CASE WHEN kind = 'embed' THEN loads ELSE 0 END) embeds
       FROM cf_pages WHERE human = 1 AND video IS NOT NULL AND ${IN} GROUP BY video ORDER BY loads DESC`),
    s(`SELECT country, SUM(loads) loads FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY country ORDER BY loads DESC LIMIT 15`),
    s(`SELECT 'device' dim, device v, SUM(loads) n FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY device
       UNION ALL SELECT 'browser', browser, SUM(loads) FROM cf_pages WHERE ${HUMAN_PAGES} GROUP BY browser`),
    s(`SELECT (SELECT MIN(day) FROM cf_pages) pages_from, (SELECT MAX(day) FROM cf_pages) pages_to,
              (SELECT MIN(day) FROM cf_daily) daily_from, (SELECT MAX(fetched_at) FROM cf_daily) fetched,
              (SELECT SUM(loads) FROM cf_pages WHERE ${HUMAN_PAGES}) loads,
              (SELECT SUM(visits) FROM cf_pages WHERE ${HUMAN_PAGES}) visits,
              (SELECT SUM(loads) FROM cf_pages WHERE human = 1 AND kind = 'embed' AND ${IN}) embeds,
              (SELECT SUM(loads) FROM cf_pages WHERE human = 0 AND ${IN}) bot_loads,
              (SELECT AVG(uniques) FROM cf_daily WHERE ${IN}) avg_uniques,
              (SELECT COUNT(*) FROM cf_daily WHERE ${IN}) days,
              (SELECT MIN(day) FROM page_views WHERE env = 'production' AND bot = 0) telemetry_from`),
  ]);
  const x = res.map((y) => y.results ?? []);
  return Response.json({ range: r, daily: x[0], pages: x[1], videos: x[2], countries: x[3], tech: x[4], meta: x[5][0] ?? {} }, { headers: noStore });
};
