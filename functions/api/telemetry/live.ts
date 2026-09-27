/**
 * GET /api/telemetry/live — readers in the last 30 minutes: one point per visitor, at their latest page.
 * Locked behind Cloudflare Access. The dashboard polls it every 30 seconds.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const now = Date.now(), since = now - 30 * 60_000;
  // SQLite returns the other columns from the row that holds MAX(ts): each visitor's latest page.
  const { results } = await env.DB.prepare(`SELECT MAX(ts) ts, city, country, lat, lon, path, source
      FROM page_views WHERE bot = 0 AND ts >= ? GROUP BY visitor ORDER BY ts DESC LIMIT 200`).bind(since).all();
  return Response.json({ now, readers: results.length, points: results }, { headers: { 'Cache-Control': 'no-store' } });
};
