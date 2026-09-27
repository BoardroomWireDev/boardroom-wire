#!/usr/bin/env node
/**
 * Copy Cloudflare's own traffic history for boardroomwire.com into bw-data (cf_daily, cf_pages). The daily
 * collector (collector/, a Cloudflare cron) does this every morning. This is the hand-run version, for
 * backfills and repairs, sharing its code (server/cf-history.ts). Idempotent: each fetched day is replaced.
 *
 *   npm run cf:history                     everything Cloudflare still holds → the live database
 *   npm run cf:history -- --local          → the local copy (.wrangler/state)
 *   npm run cf:history -- --dry            fetch and summarise, write nothing
 *   npm run cf:history -- --days 7         only the last 7 days of per-page detail (daily totals: 60 days)
 *
 * Token: CLOUDFLARE_API_TOKEN (Zone · Analytics · Read) or, on this PC, wrangler's own login.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { fetchDaily, fetchPages, gqlClient, HUMAN } from '../server/cf-history.ts';

const args = process.argv.slice(2);
const DRY = args.includes('--dry'), LOCAL = args.includes('--local');
const DAYS = args.includes('--days') ? Math.max(1, Math.min(30, Number(args[args.indexOf('--days') + 1]) || 30)) : 30;
const DAY_MS = 86_400_000, day = (t) => new Date(t).toISOString().slice(0, 10);

function wranglerToken() {
  const cfg = join(process.env.APPDATA ?? join(homedir(), '.config'), 'xdg.config', '.wrangler', 'config', 'default.toml');
  const read = () => {
    const t = readFileSync(cfg, 'utf8');
    return { token: t.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1], exp: Date.parse(t.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1] ?? '') };
  };
  let r = read();
  if (!r.token || !(r.exp > Date.now() + 120_000)) { execSync('npx wrangler whoami', { stdio: 'ignore' }); r = read(); }   // wrangler refreshes its own token
  return r.token;
}
const gql = gqlClient(process.env.CLOUDFLARE_API_TOKEN || wranglerToken());

// article → video, from the articles' frontmatter
const articleVideo = Object.fromEntries(readdirSync('src/content/articles').filter((f) => f.endsWith('.mdx')).map((f) => {
  const m = readFileSync(join('src/content/articles', f), 'utf8').match(/^collection:\s*["']?([a-z0-9-]+)/m);
  return [f.replace(/\.mdx$/, ''), m?.[1] ?? null];
}));

const daily = await fetchDaily(gql, day(Date.now() - (args.includes('--days') ? 60 : 364) * DAY_MS));
const pages = [], days = [], browsers = {};
let dropped = 0;
for (let i = DAYS - 1; i >= 0; i--) {
  const d = day(Date.now() - i * DAY_MS);
  try {
    const r = await fetchPages(gql, d, articleVideo);
    pages.push(...r.rows); days.push(d); dropped += r.dropped;
    for (const [k, v] of Object.entries(r.browsers)) browsers[k] = (browsers[k] ?? 0) + v;
  } catch (e) { console.log(`  ${d}: skipped (${String(e.message).slice(0, 90)})`); }
}

const sum = (f) => pages.filter(f).reduce((a, r) => a + r.loads, 0);
console.log(`daily totals: ${daily.length} days (${daily[0]?.day} → ${daily.at(-1)?.day})`);
console.log(`per-page detail: ${days.length} days (${days[0]} → ${days.at(-1)}), ${pages.length} rows`);
console.log(`  human page loads ${sum((r) => r.human && r.kind !== 'embed')} · dashboard frames ${sum((r) => r.human && r.kind === 'embed')} · crawler/unknown ${sum((r) => !r.human)} · scanner and other paths dropped ${dropped}`);
console.log('  browser families seen:', Object.entries(browsers).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}${HUMAN.test(k) ? '' : ' ✗'}`).join(', '));
if (DRY) process.exit(0);

const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const now = Date.now(), sql = [];
for (const r of daily) sql.push(`INSERT OR REPLACE INTO cf_daily (day, uniques, requests, page_views, threats, countries, browsers, fetched_at) VALUES (${[r.day, r.uniques, r.requests, r.page_views, r.threats, r.countries, r.browsers, now].map(q).join(', ')});`);
if (days.length) sql.push(`DELETE FROM cf_pages WHERE day IN (${days.map(q).join(', ')});`);
for (let i = 0; i < pages.length; i += 100) {
  sql.push('INSERT INTO cf_pages (day, path, kind, article, video, device, browser, os, country, human, loads, visits) VALUES\n' + pages.slice(i, i + 100)
    .map((r) => `(${[r.day, r.path, r.kind, r.article, r.video, r.device, r.browser, r.os, r.country, r.human, r.loads, r.visits].map(q).join(', ')})`).join(',\n') + ';');
}
sql.push(`INSERT INTO collector_runs (ts, job, ok, detail) VALUES (${now}, 'cloudflare-history', 1, ${q(`by hand: ${daily.length} daily totals; ${days.length} days of pages, ${pages.length} rows`)});`);
const file = join(mkdtempSync(join(tmpdir(), 'cf-history-')), 'import.sql');
writeFileSync(file, sql.join('\n'));
execSync(`npx wrangler d1 execute bw-data ${LOCAL ? '--local' : '--remote'} --file "${file}" -y`, { stdio: 'inherit' });
console.log(`written to the ${LOCAL ? 'local' : 'live'} database`);
