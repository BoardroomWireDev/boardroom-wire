/**
 * bw-collector: the business data store's daily collector (db/README.md). A scheduled Worker with no
 * public URL, bound to the same bw-data database as the site.
 *
 * Every morning at 06:23 UTC:
 *   1. Cloudflare history. Re-copies the last 3 days of per-page detail and the last 7 days of daily
 *      totals. Each day is replaced whole, so the overlap is harmless, and nothing ages out of
 *      Cloudflare's 30-day window uncopied. The import code is shared with scripts/cf-history.mjs.
 *   2. Phase 2 will add the YouTube Analytics pull here.
 *
 * Every run is logged in collector_runs. The telemetry dashboard warns when the last good run is old.
 * Deploy: npm run collector:deploy. The token is a secret: npx wrangler secret put CF_ANALYTICS_TOKEN
 * --config collector/wrangler.toml
 */
import { d1Statements, fetchDaily, fetchPages, gqlClient, type ArticleVideo, type PageRow } from '../../server/cf-history';

interface Env {
  DB: D1Database;
  /** A Cloudflare API token with Zone · Analytics · Read on boardroomwire.com, and nothing else. */
  CF_ANALYTICS_TOKEN?: string;
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

async function log(db: D1Database, job: string, ok: boolean, detail: string) {
  await db.batch([
    db.prepare('INSERT INTO collector_runs (ts, job, ok, detail) VALUES (?, ?, ?, ?)').bind(Date.now(), job, ok ? 1 : 0, detail.slice(0, 500)),
    db.prepare('DELETE FROM collector_runs WHERE ts < ?').bind(Date.now() - 400 * DAY_MS),
  ]);
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil((async () => {
      try { await log(env.DB, 'cloudflare-history', true, await cloudflareHistory(env)); }
      catch (e) { await log(env.DB, 'cloudflare-history', false, String((e as Error)?.message ?? e)); }
    })());
  },
} satisfies ExportedHandler<Env>;
