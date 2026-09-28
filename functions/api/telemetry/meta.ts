/**
 * GET /api/telemetry/meta — what the dashboard needs before it asks for anything else: how far back each source
 * goes (so "All time" resolves per view), and the collector's health for each job. Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore } from '../../../server/range';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const one = (sql: string) => env.DB.prepare(sql);
  const [src, jobs] = await env.DB.batch([
    one(`SELECT
        (SELECT MIN(day) FROM page_views WHERE env = 'production' AND bot = 0) web_from,
        (SELECT MIN(day) FROM youtube_channel_daily) yt_from, (SELECT MAX(day) FROM youtube_channel_daily) yt_to,
        (SELECT MIN(day) FROM cf_daily) cf_from, (SELECT MIN(day) FROM cf_pages) cf_pages_from,
        (SELECT COUNT(*) FROM videos) videos`),
    one(`SELECT job, MAX(CASE WHEN ok = 1 THEN ts END) last_ok, MAX(ts) last_ts,
        (SELECT ok FROM collector_runs r2 WHERE r2.job = r.job ORDER BY ts DESC LIMIT 1) last_flag,
        (SELECT detail FROM collector_runs r2 WHERE r2.job = r.job ORDER BY ts DESC LIMIT 1) last_detail
      FROM collector_runs r GROUP BY job`),
  ]);
  return Response.json({ sources: src.results[0] ?? {}, jobs: jobs.results, now: Date.now() }, { headers: noStore });
};
