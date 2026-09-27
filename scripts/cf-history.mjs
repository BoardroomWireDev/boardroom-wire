#!/usr/bin/env node
/**
 * Copy Cloudflare's own traffic history for boardroomwire.com into bw-data (tables cf_daily and cf_pages,
 * db/migrations/0002) before Cloudflare forgets it. Per-page detail lasts about 30 days, daily totals a
 * year. Idempotent: every day it fetches replaces what the database held for that day.
 *
 *   node scripts/cf-history.mjs              everything Cloudflare still holds → the live database
 *   node scripts/cf-history.mjs --local      → the local copy (.wrangler/state)
 *   node scripts/cf-history.mjs --dry        fetch and summarise, write nothing
 *   node scripts/cf-history.mjs --days 7     only the last 7 days of per-page detail (daily totals: 60 days)
 *
 * Run it at least monthly, or the per-page detail between runs is lost for good.
 * Token: CLOUDFLARE_API_TOKEN (Account Analytics / Zone Analytics: Read) or, on this PC, wrangler's own login.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry'), LOCAL = args.includes('--local');
const DAYS = args.includes('--days') ? Math.max(1, Math.min(30, Number(args[args.indexOf('--days') + 1]) || 30)) : 30;
const ZONE_NAME = 'boardroomwire.com', HOSTS = ['www.boardroomwire.com', 'boardroomwire.com'];
const day = (t) => new Date(t).toISOString().slice(0, 10);
const TODAY = day(Date.now()), DAY_MS = 86_400_000;

/* ------------------------------------------------------------------ auth */
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
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || wranglerToken();
async function cf(path, body) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method: body ? 'POST' : 'GET', body: body && JSON.stringify(body),
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  const j = await r.json();
  if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j;
}
const gql = async (query) => (await cf('/graphql', { query })).data;

/* --------------------------------------------------------- classification */
// article slug → video slug, from the articles' frontmatter
const ARTICLE_VIDEO = Object.fromEntries(readdirSync('src/content/articles').filter((f) => f.endsWith('.mdx')).map((f) => {
  const m = readFileSync(join('src/content/articles', f), 'utf8').match(/^collection:\s*["']?([a-z0-9-]+)/m);
  return [f.replace(/\.mdx$/, ''), m?.[1] ?? null];
}));
function classify(path) {
  const seg = path.split('?')[0].split('/').filter(Boolean);
  if (!seg.length) return { kind: 'home' };
  if (seg[0] === 'wire') return seg[1] ? { kind: 'wire', article: seg[1], video: ARTICLE_VIDEO[seg[1]] ?? null } : { kind: 'wire' };
  if (seg[0] === 'analytics') {
    if (!seg[1]) return { kind: 'analytics' };
    // a dashboard frame inside an article: /analytics/<video>/01-cold-open-collapse(.html). Pages serves them without .html
    if (seg[2] && /^\d\d-[a-z0-9-]+(\.html)?$/.test(seg[2])) return { kind: 'embed', video: seg[1] };
    return { kind: 'analytics', video: seg[1] };
  }
  if (['videos', 'about', 'privacy'].includes(seg[0]) && seg.length === 1) return { kind: seg[0] };
  return null;                                   // /telemetry/ (the owner), the 404, scanners probing for files
}
// Real browser families, as Cloudflare names them. Everything else (crawlers, 'Unknown', scripts) is not human.
const HUMAN = /^(Chrome|ChromeMobile|ChromeMobileiOS|MobileSafari|Safari|Firefox|FirefoxMobile|FirefoxiOS|Edge|EdgeMobile|SamsungInternet|Opera|OperaMobile|YandexBrowser|UCBrowser|Brave|Vivaldi|DuckDuckGo|Silk|AndroidBrowser|Chromium|WebView|GoogleSearchApp|InstagramApp|FacebookApp)$/i;

/* ------------------------------------------------------------------ fetch */
const zones = await cf(`/zones?name=${ZONE_NAME}`);
const ZONE = zones.result?.[0]?.id;
if (!ZONE) throw new Error(`zone ${ZONE_NAME} not found`);

const dailyFrom = day(Date.now() - (args.includes('--days') ? 60 : 364) * DAY_MS);
const d1 = await gql(`query { viewer { zones(filter: {zoneTag: "${ZONE}"}) { httpRequests1dGroups(limit: 400, filter: {date_geq: "${dailyFrom}"}, orderBy: [date_ASC]) {
  dimensions { date } uniq { uniques } sum { requests pageViews threats countryMap { clientCountryName requests } browserMap { uaBrowserFamily pageViews } } } } } }`);
const daily = d1.viewer.zones[0].httpRequests1dGroups.map((g) => ({
  day: g.dimensions.date, uniques: g.uniq.uniques, requests: g.sum.requests, page_views: g.sum.pageViews, threats: g.sum.threats,
  countries: JSON.stringify(g.sum.countryMap.sort((a, b) => b.requests - a.requests).map((c) => [c.clientCountryName, c.requests])),
  browsers: JSON.stringify(g.sum.browserMap.sort((a, b) => b.pageViews - a.pageViews).map((b) => [b.uaBrowserFamily, b.pageViews])),
}));

const pages = new Map(), junk = { loads: 0 }, fetchedDays = [], browsers = {};
for (let i = DAYS - 1; i >= 0; i--) {
  const d = day(Date.now() - i * DAY_MS);
  let rows;
  try {
    rows = (await gql(`query { viewer { zones(filter: {zoneTag: "${ZONE}"}) { httpRequestsAdaptiveGroups(limit: 10000, filter: {date: "${d}",
      edgeResponseContentTypeName: "html", edgeResponseStatus: 200, clientRequestHTTPHost_in: ${JSON.stringify(HOSTS)}}) {
      count sum { visits } dimensions { clientRequestPath clientDeviceType userAgentBrowser userAgentOS clientCountryName } } } } }`)).viewer.zones[0].httpRequestsAdaptiveGroups;
  } catch (e) { console.log(`  ${d}: skipped (${String(e.message).slice(0, 90)})`); continue; }
  fetchedDays.push(d);
  for (const r of rows) {
    const x = r.dimensions, c = classify(x.clientRequestPath);
    browsers[x.userAgentBrowser] = (browsers[x.userAgentBrowser] ?? 0) + r.count;
    if (!c) { junk.loads += r.count; continue; }
    const path = x.clientRequestPath.split('?')[0];
    const key = [d, path, x.clientDeviceType || 'unknown', x.userAgentBrowser || 'Unknown', x.userAgentOS || 'Unknown', x.clientCountryName || 'XX'].join('\u0001');
    const row = pages.get(key) ?? { day: d, path, ...c, device: x.clientDeviceType || 'unknown', browser: x.userAgentBrowser || 'Unknown',
      os: x.userAgentOS || 'Unknown', country: x.clientCountryName || 'XX', human: HUMAN.test(x.userAgentBrowser ?? '') ? 1 : 0, loads: 0, visits: 0 };
    row.loads += r.count; row.visits += r.sum.visits; pages.set(key, row);
  }
}

/* ---------------------------------------------------------------- summary */
const all = [...pages.values()], sum = (f) => all.filter(f).reduce((a, r) => a + r.loads, 0);
console.log(`daily totals: ${daily.length} days (${daily[0]?.day} → ${daily.at(-1)?.day})`);
console.log(`per-page detail: ${fetchedDays.length} days (${fetchedDays[0]} → ${fetchedDays.at(-1)}), ${all.length} rows`);
console.log(`  human page loads ${sum((r) => r.human && r.kind !== 'embed')} · dashboard frames ${sum((r) => r.human && r.kind === 'embed')} · crawler/unknown ${sum((r) => !r.human)} · scanner and other paths dropped ${junk.loads}`);
console.log('  browser families seen:', Object.entries(browsers).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}${HUMAN.test(k) ? '' : ' ✗'}`).join(', '));
if (DRY) process.exit(0);

/* ------------------------------------------------------------------ write */
const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const now = Date.now(), sql = [];
for (const r of daily) sql.push(`INSERT OR REPLACE INTO cf_daily (day, uniques, requests, page_views, threats, countries, browsers, fetched_at) VALUES (${[r.day, r.uniques, r.requests, r.page_views, r.threats, r.countries, r.browsers, now].map(q).join(', ')});`);
if (fetchedDays.length) sql.push(`DELETE FROM cf_pages WHERE day IN (${fetchedDays.map(q).join(', ')});`);
for (let i = 0; i < all.length; i += 100) {
  sql.push(`INSERT INTO cf_pages (day, path, kind, article, video, device, browser, os, country, human, loads, visits) VALUES\n` + all.slice(i, i + 100)
    .map((r) => `(${[r.day, r.path, r.kind, r.article ?? null, r.video ?? null, r.device, r.browser, r.os, r.country, r.human, r.loads, r.visits].map(q).join(', ')})`).join(',\n') + ';');
}
const file = join(mkdtempSync(join(tmpdir(), 'cf-history-')), 'import.sql');
writeFileSync(file, sql.join('\n'));
execSync(`npx wrangler d1 execute bw-data ${LOCAL ? '--local' : '--remote'} --file "${file}" -y`, { stdio: 'inherit' });
console.log(`written to the ${LOCAL ? 'local' : 'live'} database`);
