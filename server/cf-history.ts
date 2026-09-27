/**
 * Cloudflare's own traffic history for boardroomwire.com → cf_daily and cf_pages (db/migrations/0002).
 *
 * Shared by the daily collector (collector/src/index.ts, a Cloudflare cron) and the hand-run
 * scripts/cf-history.mjs (backfills and repairs). Node 24 imports this file directly by stripping types,
 * so keep to erasable TypeScript: annotations and `import type` only, no enums or namespaces.
 *
 * Cloudflare keeps daily totals for a year but per-page detail for only about 30 days, and caps each
 * per-page query at one 30-day window. Hence one query per day.
 */

export const ZONE_ID = '732c9df45425b7e3175de2bacfe73033';          // boardroomwire.com
export const HOSTS = ['www.boardroomwire.com', 'boardroomwire.com'];

// Real browser families, as Cloudflare names them. Everything else (crawlers, 'Unknown', Curl, ChromeHeadless) is not human.
export const HUMAN = /^(Chrome|ChromeMobile|ChromeMobileiOS|MobileSafari|Safari|Firefox|FirefoxMobile|FirefoxiOS|Edge|EdgeMobile|SamsungInternet|Opera|OperaMobile|YandexBrowser|UCBrowser|Brave|Vivaldi|DuckDuckGo|Silk|AndroidBrowser|Chromium|WebView|GoogleSearchApp|InstagramApp|FacebookApp)$/i;

export type Gql = (query: string) => Promise<any>;
export function gqlClient(token: string): Gql {
  return async (query: string) => {
    const r = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', body: JSON.stringify({ query }),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const j: any = await r.json();
    if (j.errors?.length) throw new Error(JSON.stringify(j.errors).slice(0, 300));
    return j.data;
  };
}

export interface DailyRow { day: string; uniques: number; requests: number; page_views: number; threats: number; countries: string; browsers: string }
export interface PageRow {
  day: string; path: string; kind: string; article: string | null; video: string | null;
  device: string; browser: string; os: string; country: string; human: number; loads: number; visits: number;
}
export type ArticleVideo = Record<string, string | null>;

/** The site's page kinds (as page_views.kind), 'embed' for a dashboard frame inside an article, or null to drop the path. */
export function classify(path: string, articleVideo: ArticleVideo): { kind: string; article: string | null; video: string | null } | null {
  const seg = path.split('?')[0].split('/').filter(Boolean);
  const k = (kind: string, article: string | null = null, video: string | null = null) => ({ kind, article, video });
  if (!seg.length) return k('home');
  if (seg[0] === 'wire') return seg[1] ? k('wire', seg[1], articleVideo[seg[1]] ?? null) : k('wire');
  if (seg[0] === 'analytics') {
    if (!seg[1]) return k('analytics');
    // /analytics/<video>/01-cold-open-collapse(.html): Pages serves the dashboard frames without .html
    if (seg[2] && /^\d\d-[a-z0-9-]+(\.html)?$/.test(seg[2])) return k('embed', null, seg[1]);
    return k('analytics', null, seg[1]);
  }
  if (['videos', 'about', 'privacy'].includes(seg[0]) && seg.length === 1) return k(seg[0]);
  return null;                                   // /telemetry/ (the owner), the 404, scanners probing for files
}

export async function fetchDaily(gql: Gql, from: string): Promise<DailyRow[]> {
  const d = await gql(`query { viewer { zones(filter: {zoneTag: "${ZONE_ID}"}) { httpRequests1dGroups(limit: 400, filter: {date_geq: "${from}"}, orderBy: [date_ASC]) {
    dimensions { date } uniq { uniques } sum { requests pageViews threats countryMap { clientCountryName requests } browserMap { uaBrowserFamily pageViews } } } } } }`);
  return d.viewer.zones[0].httpRequests1dGroups.map((g: any) => ({
    day: g.dimensions.date, uniques: g.uniq.uniques, requests: g.sum.requests, page_views: g.sum.pageViews, threats: g.sum.threats,
    countries: JSON.stringify([...g.sum.countryMap].sort((a: any, b: any) => b.requests - a.requests).map((c: any) => [c.clientCountryName, c.requests])),
    browsers: JSON.stringify([...g.sum.browserMap].sort((a: any, b: any) => b.pageViews - a.pageViews).map((b: any) => [b.uaBrowserFamily, b.pageViews])),
  }));
}

/** One day of per-page detail: HTML 200s on the site's own hosts, grouped by page, device, browser, OS and country. */
export async function fetchPages(gql: Gql, day: string, articleVideo: ArticleVideo) {
  const d = await gql(`query { viewer { zones(filter: {zoneTag: "${ZONE_ID}"}) { httpRequestsAdaptiveGroups(limit: 10000, filter: {date: "${day}",
    edgeResponseContentTypeName: "html", edgeResponseStatus: 200, clientRequestHTTPHost_in: ${JSON.stringify(HOSTS)}}) {
    count sum { visits } dimensions { clientRequestPath clientDeviceType userAgentBrowser userAgentOS clientCountryName } } } } }`);
  const rows = new Map<string, PageRow>(), browsers: Record<string, number> = {};
  let dropped = 0;
  for (const r of d.viewer.zones[0].httpRequestsAdaptiveGroups) {
    const x = r.dimensions, c = classify(x.clientRequestPath, articleVideo);
    browsers[x.userAgentBrowser] = (browsers[x.userAgentBrowser] ?? 0) + r.count;
    if (!c) { dropped += r.count; continue; }
    const row: PageRow = {
      day, path: x.clientRequestPath.split('?')[0], ...c, device: x.clientDeviceType || 'unknown', browser: x.userAgentBrowser || 'Unknown',
      os: x.userAgentOS || 'Unknown', country: x.clientCountryName || 'XX', human: HUMAN.test(x.userAgentBrowser ?? '') ? 1 : 0, loads: 0, visits: 0,
    };
    const key = [row.path, row.device, row.browser, row.os, row.country].join('\u0001');
    const acc = rows.get(key) ?? row;
    acc.loads += r.count; acc.visits += r.sum.visits; rows.set(key, acc);
  }
  return { rows: [...rows.values()], dropped, browsers };
}

/** D1 statements that replace the given days: daily totals upserted, each fetched day's page rows swapped whole. */
export function d1Statements(db: D1Database, daily: DailyRow[], days: string[], pages: PageRow[], fetchedAt: number): D1PreparedStatement[] {
  const out: D1PreparedStatement[] = [];
  const upsert = db.prepare('INSERT OR REPLACE INTO cf_daily (day, uniques, requests, page_views, threats, countries, browsers, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const r of daily) out.push(upsert.bind(r.day, r.uniques, r.requests, r.page_views, r.threats, r.countries, r.browsers, fetchedAt));
  for (const d of days) out.push(db.prepare('DELETE FROM cf_pages WHERE day = ?').bind(d));
  const ins = db.prepare('INSERT INTO cf_pages (day, path, kind, article, video, device, browser, os, country, human, loads, visits) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const r of pages) out.push(ins.bind(r.day, r.path, r.kind, r.article, r.video, r.device, r.browser, r.os, r.country, r.human, r.loads, r.visits));
  return out;
}
