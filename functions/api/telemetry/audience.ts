/**
 * GET /api/telemetry/audience?from=YYYY-MM-DD&to=YYYY-MM-DD — who watches and how (db/migrations/0006).
 * Day-capable breakdowns (where people watch, traffic sources, devices, systems, subscribers, cards) are summed over the
 * exact range. Period-only breakdowns (countries, age and gender, search terms, external sites, suggesting videos,
 * sharing) exist per calendar month, so they cover the months the range touches; `months` says which. Age and gender
 * percentages are weighted across months by each month's views. Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore, parseRange } from '../../../server/range';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const r = parseRange(new URL(request.url));
  const m0 = r.from.slice(0, 7), m1 = r.to.slice(0, 7);
  const [daily, monthly, weights, cover] = await env.DB.batch([
    env.DB.prepare(`SELECT dim, value, SUM(views) views, SUM(minutes) minutes FROM yt_dim_daily WHERE day >= ?1 AND day <= ?2 GROUP BY dim, value ORDER BY dim, views DESC`).bind(r.from, r.to),
    env.DB.prepare(`SELECT dim, month, value, label, views, minutes, pct FROM yt_dim_monthly WHERE month >= ?1 AND month <= ?2`).bind(m0, m1),
    env.DB.prepare(`SELECT substr(day, 1, 7) month, SUM(views) views FROM youtube_channel_daily WHERE substr(day, 1, 7) >= ?1 AND substr(day, 1, 7) <= ?2 GROUP BY month`).bind(m0, m1),
    env.DB.prepare(`SELECT (SELECT MIN(day) FROM yt_dim_daily) daily_from, (SELECT MAX(day) FROM yt_dim_daily) daily_to,
                           (SELECT MIN(month) FROM yt_dim_monthly) monthly_from, (SELECT MAX(month) FROM yt_dim_monthly) monthly_to`),
  ]);
  const byDim = (rows: any[]) => rows.reduce((a: Record<string, any[]>, x) => ((a[x.dim] ??= []).push(x), a), {});
  // period breakdowns: sum views and minutes across months; demo percentages weighted by each month's channel views
  const w = new Map((weights.results as any[]).map((x) => [x.month, Number(x.views) || 0]));
  const acc = new Map<string, any>(), demoW = new Map<string, number>();
  const monthsSeen = new Set<string>();
  for (const x of monthly.results as any[]) {
    monthsSeen.add(x.month);
    const k = `${x.dim}\u0001${x.value}`, a = acc.get(k) ?? { dim: x.dim, value: x.value, label: x.label, views: 0, minutes: 0, pct: 0 };
    a.views += Number(x.views) || 0; a.minutes += Number(x.minutes) || 0; if (x.label) a.label = x.label;
    if (x.dim === 'demo') { const wt = w.get(x.month) ?? 0; a.pct += (Number(x.pct) || 0) * wt; demoW.set(x.value, (demoW.get(x.value) ?? 0) + wt); }
    acc.set(k, a);
  }
  const totalW = Math.max(...[...demoW.values(), 0]);
  for (const a of acc.values()) if (a.dim === 'demo') a.pct = totalW ? a.pct / totalW : 0;
  const per = byDim([...acc.values()].sort((a, b) => (b.views || b.pct) - (a.views || a.pct)));
  const seen = [...monthsSeen].sort();
  return Response.json({ range: r, daily: byDim(daily.results as any[]), monthly: per,
    months: seen.length ? { from: seen[0], to: seen[seen.length - 1] } : null, coverage: cover.results[0] ?? {} }, { headers: noStore });
};
