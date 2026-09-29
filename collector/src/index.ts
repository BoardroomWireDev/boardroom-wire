/**
 * bw-collector: the business data store's daily collector (db/README.md). A scheduled Worker with no
 * public URL, bound to the same bw-data database as the site. Two jobs, one cron each:
 *
 *   06:23 UTC  cloudflare-history  Re-copies the last 3 days of Cloudflare's per-page detail and 7 days of
 *              totals, so nothing ages out of Cloudflare's 30-day window (server/cf-history.ts, shared with
 *              scripts/cf-history.mjs).
 *   06:59 UTC  youtube-deep        Audience and retention (server/youtube-deep.ts): the last ten days of each daily
 *              breakdown, this month's period breakdowns, video retention profiles (new videos daily, the rest weekly).
 *   06:41 UTC  youtube-daily       The channel's YouTube Analytics: uploads, channel per day, every video per
 *              day (the last ten re-fetched, older days backfilled newest first), and traffic sources for
 *              recent videos (server/youtube-data.ts). It stays under the free plan's 50 requests per run.
 *
 * Each cron minute runs one job, in its own run. Every run is logged in collector_runs,
 * and the telemetry dashboard warns when a job's last good run is old.
 * To run a job by hand, never deploy a test cron: on 27 Sep 2026 an every-minute schedule kept firing for about
 * four hours after it was changed back (221 extra runs), and with the backfill it pushed D1 over the free plan's
 * 100,000 rows written a day, which blocks every write, the site's beacon included, until 00:00 UTC. Instead run
 * it once, on Cloudflare with the real bindings:
 *   npx wrangler dev --config collector/wrangler.toml --remote --test-scheduled
 *   then open http://localhost:8787/__scheduled?cron=41+6+*+*+*   (23+6+… for cloudflare-history)
 * Deploy: npm run collector:deploy. Secrets: CF_ANALYTICS_TOKEN (npx wrangler secret put … --config
 * collector/wrangler.toml), and the YouTube ones, set by scripts/youtube-auth.mjs.
 */
import { d1Statements, fetchDaily, fetchPages, gqlClient, type ArticleVideo, type PageRow } from '../../server/cf-history';
import { Budget, accessToken, report, youtubeDaily } from '../../server/youtube-data';
import { deepNightly } from '../../server/youtube-deep';

interface Env {
  DB: D1Database;
  /** A Cloudflare API token with Zone · Analytics · Read on boardroomwire.com, and nothing else. */
  CF_ANALYTICS_TOKEN?: string;
  /** Google OAuth (Desktop client) and the channel owner's refresh token, scopes yt-analytics.readonly + youtube.readonly. */
  YT_CLIENT_ID?: string;
  YT_CLIENT_SECRET?: string;
  YT_REFRESH_TOKEN?: string;
}

const DAY_MS = 86_400_000;
const day = (t: number) => new Date(t).toISOString().slice(0, 10);

// article → video, learned from what the site itself reported (page_views carries <meta name="bw:video">)
async function articleVideo(db: D1Database): Promise<ArticleVideo> {
  const { results } = await db.prepare(`SELECT article, MAX(video) video FROM (
      SELECT article, video FROM page_views WHERE article IS NOT NULL AND video IS NOT NULL
      UNION ALL SELECT article, video FROM cf_pages WHERE article IS NOT NULL AND video IS NOT NULL) GROUP BY article`).all<{ article: string; video: string }>();
  return Object.fromEntries(results.map((r) => [r.article, r.video]));
}

async function cloudflareHistory(env: Env): Promise<string> {
  if (!env.CF_ANALYTICS_TOKEN) throw new Error('CF_ANALYTICS_TOKEN is not set');
  const gql = gqlClient(env.CF_ANALYTICS_TOKEN), now = Date.now(), map = await articleVideo(env.DB);
  const daily = await fetchDaily(gql, day(now - 7 * DAY_MS));
  const days = [2, 1, 0].map((i) => day(now - i * DAY_MS)), pages: PageRow[] = [];
  let dropped = 0;
  for (const d of days) { const r = await fetchPages(gql, d, map); pages.push(...r.rows); dropped += r.dropped; }
  await env.DB.batch(d1Statements(env.DB, daily, days, pages, now));
  // an article first seen before the site reported its video gets the video once it is known
  await env.DB.prepare(`UPDATE cf_pages SET video = (SELECT pv.video FROM page_views pv WHERE pv.article = cf_pages.article AND pv.video IS NOT NULL LIMIT 1)
      WHERE video IS NULL AND article IS NOT NULL`).run();
  const human = pages.filter((p) => p.human && p.kind !== 'embed').reduce((a, p) => a + p.loads, 0);
  return `${daily.length} daily totals; ${days.join(', ')}: ${pages.length} page rows, ${human} real-browser loads, ${dropped} scanner loads dropped`;
}

async function youtube(env: Env): Promise<string> {
  if (!env.YT_CLIENT_ID || !env.YT_CLIENT_SECRET || !env.YT_REFRESH_TOKEN) throw new Error('YouTube secrets are not set (run scripts/youtube-auth.mjs)');
  let mapping: Array<{ youtube: string; slug: string | null; article: string }> = [];
  try { const r = await fetch('https://www.boardroomwire.com/data/videos.json'); if (r.ok) mapping = await r.json(); } catch { /* labels can wait a day */ }
  return youtubeDaily(env.DB, { clientId: env.YT_CLIENT_ID, clientSecret: env.YT_CLIENT_SECRET, refreshToken: env.YT_REFRESH_TOKEN }, mapping);
}

async function youtubeDeep(env: Env): Promise<string> {
  if (!env.YT_CLIENT_ID || !env.YT_CLIENT_SECRET || !env.YT_REFRESH_TOKEN) throw new Error('YouTube secrets are not set (run scripts/youtube-auth.mjs)');
  const budget = new Budget(46); budget.used++;
  const token = await accessToken(env.YT_CLIENT_ID, env.YT_CLIENT_SECRET, env.YT_REFRESH_TOKEN);
  const titles = async (ids: string[]) => {                     // names for the videos that suggested ours
    budget.used++;
    const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.slice(0, 50).join(',')}`, { headers: { Authorization: `Bearer ${token}` } });
    const j: any = await r.json();
    return Object.fromEntries((j.items ?? []).map((v: any) => [v.id, `${v.snippet.title} · ${v.snippet.channelTitle}`]));
  };
  return deepNightly(env.DB, (p) => report(token, p, budget), () => budget.left, titles);
}

async function run(db: D1Database, job: string, work: () => Promise<string>) {
  let ok = true, detail: string;
  try { detail = await work(); } catch (e) { ok = false; detail = String((e as Error)?.message ?? e); }
  await db.batch([
    db.prepare('INSERT INTO collector_runs (ts, job, ok, detail) VALUES (?, ?, ?, ?)').bind(Date.now(), job, ok ? 1 : 0, detail.slice(0, 500)),
    db.prepare('DELETE FROM collector_runs WHERE ts < ?').bind(Date.now() - 400 * DAY_MS),
  ]);
}

export default {
  async scheduled(controller, env, ctx) {
    // one job per cron minute, each in its own run (its own 50-request budget). A test schedule must use a job's
    // minute at another hour, e.g. "59 17 * * *", never every minute (see the header).
    const minute = controller.cron.split(' ')[0];
    const table: Record<string, [string, () => Promise<string>]> = {
      '23': ['cloudflare-history', () => cloudflareHistory(env)], '41': ['youtube-daily', () => youtube(env)], '59': ['youtube-deep', () => youtubeDeep(env)],
    };
    const jobs = table[minute] ? [table[minute]] : [];
    ctx.waitUntil((async () => { for (const [job, work] of jobs) await run(env.DB, job, work); })());
  },
} satisfies ExportedHandler<Env>;
