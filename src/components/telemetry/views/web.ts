/** Web analytics: Wire Telemetry, the site's own first-party readership (from 27 Sep 2026; bots out). */
import { fillRange, timeChart, weekly, sparkline, zeroFrom, type ChartHandle } from '../chart';
import { COLORS, titles, type Ctx } from '../ctx';
import { NET, WEB_SOURCE, country, dayLong, dayShort, dur, full, num } from '../fmt';
import { readerMap } from '../map';
import { barList, card, chip, empty, grid, h, kpis, note, sortTable } from '../ui';

export async function render(ctx: Ctx): Promise<Node[]> {
  const d = await ctx.api('report');
  const T = d.totals, P = d.prev, { titleOf, shortOf, labelOf } = titles(ctx.site);
  const out: Node[] = [];
  if (!T.views) out.push(note(ctx.meta.sources.web_from
    ? 'No readers recorded in this range. Try a longer range, or Legacy for the weeks before Wire Telemetry began.'
    : 'No readers recorded yet. Wire Telemetry counts from the day it went live (27 September 2026); see Legacy for the weeks before.', 'info'));

  const long = d.range.days > 120;
  const filled = zeroFrom(fillRange(d.series, 'k', d.range.from, d.range.to, d.range.hourly), 'k', ctx.meta.sources.web_from, ['views', 'visitors', 'from_youtube']);
  const rows = long ? weekly(filled, 'k', ['views', 'visitors', 'from_youtube']) : filled;
  out.push(kpis([
    { label: 'Visitors', value: num(T.visitors), cur: T.visitors, prev: P.visitors, sub: 'counted per day', hero: true,
      spark: filled.length > 2 && !d.range.hourly ? sparkline(filled.map((r: any) => r.visitors ?? null), COLORS.web) : undefined },
    { label: 'Page views', value: num(T.views), cur: T.views, prev: P.views, sub: T.visitors ? `${(T.views / T.visitors).toFixed(1)} per visitor` : undefined },
    { label: 'Time on page', value: dur(T.engaged), cur: T.engaged, prev: P.engaged, sub: 'average, while visible' },
    { label: 'Single-page visits', value: T.bounce == null ? '–' : Math.round(T.bounce * 100) + '%', cur: T.bounce == null ? null : T.bounce * 100, prev: P.bounce == null ? null : P.bounce * 100, pts: true, goodIsUp: false, sub: 'left after one page' },
    { label: 'Clicks to YouTube', value: num(T.out?.youtube ?? 0), cur: T.out?.youtube ?? 0, prev: P.out?.youtube ?? 0 },
    { label: 'Clicks to Substack', value: num(T.out?.substack ?? 0), cur: T.out?.substack ?? 0, prev: P.out?.substack ?? 0, sub: T.out?.x ? `${num(T.out.x)} to X` : undefined },
  ], ctx.showDelta));

  // map + countries
  const mapHost = h('div');
  const map = readerMap(mapHost);
  map.set(d.cities, []);
  ctx.onLive((l) => map.set(d.cities, l.points));
  out.push(grid(
    card({ title: 'Where readers are', sub: `${d.cities.length} cities · city-level, from Cloudflare’s edge`, span: 8 }, mapHost),
    card({ title: 'Countries', span: 4 }, barList(d.countries.slice(0, 12), (r: any) => country(r.country), (r: any) => r.visitors))));

  // readers over time
  const host = h('div', { class: 'chart-host' });
  let chart: ChartHandle | undefined;
  const hourly = d.range.hourly;
  queueMicrotask(() => { chart = timeChart(host, {
    x: rows.map((r: any) => r.k), xShort: dayShort, xLong: (k) => (long ? `Week of ${dayLong(k)}` : dayLong(k)),
    empty: 'No readers in this range yet.',
    panels: [{ height: 200, series: [
      { key: 'views', name: 'Page views', color: COLORS.context, kind: 'context', values: rows.map((r: any) => r.views), fmt: full },
      { key: 'visitors', name: 'Visitors', color: COLORS.web, kind: 'line', values: rows.map((r: any) => r.visitors), fmt: full },
    ] }] }); });
  out.push(grid(card({ title: 'Readers over time', sub: hourly ? 'By hour, UTC' : long ? 'By week' : 'By day', chart: () => chart }, host)));

  out.push(grid(
    card({ title: 'How they found the site', span: 4 }, barList(d.sources, (r: any) => WEB_SOURCE[r.source] ?? r.source, (r: any) => r.visitors)),
    card({ title: 'Referring sites', span: 4 }, barList(d.referrers, (r: any) => r.host, (r: any) => r.views)),
    card({ title: 'Clicks out', span: 4 }, barList(d.outbound, (r: any) => r.target, (r: any) => r.clicks))));

  out.push(grid(card({ title: 'By video', sub: 'Each video’s article and its dashboards' }, sortTable<any>([
    { key: 'k', label: 'Video', render: (r) => h('span', { class: 'cell-title' }, titleOf(r.video, r.article), h('small', {}, r.video || r.article)) },
    { key: 'views', label: 'Views', num: true, render: (r) => num(r.views) },
    { key: 'visitors', label: 'Visitors', num: true, render: (r) => num(r.visitors) },
    { key: 'engaged', label: 'Time on page', num: true, render: (r) => dur(r.engaged) },
    { key: 'from_youtube', label: 'From YouTube', num: true, value: (r) => (r.views ? r.from_youtube / r.views : 0), render: (r) => (r.views ? Math.round((100 * r.from_youtube) / r.views) + '%' : '–') },
    { key: 'dashboard_views', label: 'Dashboard views', num: true, render: (r) => num(r.dashboard_views) },
  ], d.videos, { key: 'views', dir: 'desc' }))));

  out.push(grid(
    card({ title: 'Organisations reading', sub: 'Network owners · home and mobile internet hidden', span: 6 }, sortTable<any>([
      { key: 'org', label: 'Organisation', render: (r) => h('span', { class: 'cell-title' }, r.org, h('small', {}, [r.city, country(r.country)].filter(Boolean).join(', '), ` · AS${r.asn}`)) },
      { key: 'visitors', label: 'Visitors', num: true, render: (r) => num(r.visitors) },
      { key: 'pages', label: 'Read', render: (r) => [...new Set(String(r.pages || '').split(',').map(shortOf))].slice(0, 3).join(' · ') },
    ], d.orgs, { key: 'visitors', dir: 'desc' }, 10)),
    card({ title: 'Campaign links', sub: 'utm tags', span: 6 }, sortTable<any>([
      { key: 'source', label: 'Source / medium', render: (r) => [r.source, r.medium].filter(Boolean).join(' / ') || '–' },
      { key: 'campaign', label: 'Campaign' },
      { key: 'views', label: 'Views', num: true, render: (r) => num(r.views) },
    ], d.campaigns, { key: 'views', dir: 'desc' }, 10))));

  out.push(grid(
    card({ title: 'Pages', span: 8 }, sortTable<any>([
      { key: 'path', label: 'Page', render: (r) => h('span', { class: 'cell-title' }, labelOf(r.path, r.video, r.article), h('small', {}, r.path)) },
      { key: 'views', label: 'Views', num: true, render: (r) => num(r.views) },
      { key: 'visitors', label: 'Visitors', num: true, render: (r) => num(r.visitors) },
      { key: 'engaged', label: 'Time', num: true, render: (r) => dur(r.engaged) },
      { key: 'scroll', label: 'Scroll', num: true, render: (r) => (r.scroll == null ? '–' : Math.round(r.scroll) + '%') },
    ], d.pages, { key: 'views', dir: 'desc' }, 12)),
    card({ title: 'Cities', span: 4 }, barList(d.cities.slice(0, 12), (r: any) => `${r.city || 'Unknown'}, ${country(r.country)}`, (r: any) => r.visitors))));

  const dims: [string, string][] = [['device', 'Device'], ['browser', 'Browser'], ['os', 'System'], ['net', 'Network']];
  out.push(grid(card({ title: 'Devices and networks' }, h('div', { class: 'tech' }, ...dims.map(([k, name]) => h('div', {}, h('h4', {}, name),
    barList(d.tech.filter((r: any) => r.dim === k).sort((a: any, b: any) => b.n - a.n).slice(0, 6), (r: any) => (k === 'net' ? NET[r.v] ?? r.v : r.v || 'Unknown'), (r: any) => r.n)))))));

  out.push(h('p', { class: 'foot' }, `Visitors are counted per day with a code that changes daily, so someone reading on two days counts twice. ${num(T.bots)} crawler and script page views left out. Organisations are the registered owners of readers’ networks, a best guess. `, chip('Wire Telemetry · first-party, no cookies')));
  if (!d.pages.length && T.views) out.push(empty('No page detail.'));
  return out;
}
