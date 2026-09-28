/** Legacy: Cloudflare's own edge counts for the domain, the history before Wire Telemetry and a bot-inclusive cross-check beside it. */
import { fillRange, timeChart, weekly, type ChartHandle } from '../chart';
import { COLORS, titles, type Ctx } from '../ctx';
import { country, dayLong, dayShort, full, num } from '../fmt';
import { barList, card, grid, h, kpis, note, sortTable } from '../ui';

export async function render(ctx: Ctx): Promise<Node[]> {
  const d = await ctx.api('history');
  const m = d.meta, { titleOf, labelOf } = titles(ctx.site);
  const out: Node[] = [];
  const job = ctx.meta.jobs.find((j) => j.job === 'cloudflare-history');
  if (job && (job.last_flag === 0 || !job.last_ok || Date.now() - job.last_ok > 3 * 86_400_000))
    out.push(note(`The daily Cloudflare copy needs attention: ${job.last_detail}. Cloudflare keeps page detail for 30 days, so older detail is lost if it stays down.`, 'warn'));
  out.push(note('Cloudflare’s own counts of the pages it served, not our beacon. “Real browsers” sets crawlers and scripts aside, but some bots pose as browsers, so treat these as a ceiling. There is no source history on this plan.'));

  out.push(kpis([
    { label: 'Page loads', value: num(m.loads), sub: 'real browsers', hero: true },
    { label: 'Visits started', value: num(m.visits), sub: 'arrived from outside the site' },
    { label: 'Dashboard views', value: num(m.embeds), sub: 'inside articles' },
    { label: 'Crawler loads', value: num(m.bot_loads), sub: 'set aside' },
    { label: 'Unique addresses', value: num(m.avg_uniques), sub: 'a day on average, bots included' },
    { label: 'Days on record', value: num(m.days), sub: m.daily_from ? `totals from ${dayShort(m.daily_from)}` : '' },
  ], false));

  const long = d.range.days > 120, daily = fillRange(d.daily, 'day', d.range.from, d.range.to, false);
  const rows = long ? weekly(daily, 'day', ['uniques', 'loads', 'embeds']) : daily;
  const host = h('div', { class: 'chart-host' });
  let chart: ChartHandle | undefined;
  const marks = m.telemetry_from && m.telemetry_from > d.range.from ? [{ x: m.telemetry_from, label: 'Wire Telemetry begins' }] : [];
  queueMicrotask(() => { chart = timeChart(host, {
    x: rows.map((r: any) => r.day), xShort: dayShort, xLong: (k) => (long ? `Week of ${dayLong(k)}` : dayLong(k)), marks, empty: 'No Cloudflare history in this range.',
    panels: [{ height: 220, series: [
      { key: 'uniques', name: 'Unique addresses, bots included', color: COLORS.context, kind: 'context', values: rows.map((r: any) => r.uniques), fmt: full },
      { key: 'loads', name: 'Page loads, real browsers', color: COLORS.web, kind: 'line', values: rows.map((r: any) => r.loads), fmt: full },
    ] }] }); });
  out.push(grid(card({ title: 'Daily traffic', sub: `${long ? 'Weekly' : 'Daily'} · page detail from ${m.pages_from ? dayShort(m.pages_from) : '–'}`, chart: () => chart }, host)));

  out.push(grid(
    card({ title: 'Pages', sub: 'Real browsers', span: 7 }, sortTable<any>([
      { key: 'path', label: 'Page', render: (r) => h('span', { class: 'cell-title' }, labelOf(r.path, r.video, r.article), h('small', {}, r.path)) },
      { key: 'loads', label: 'Loads', num: true, render: (r) => num(r.loads) },
      { key: 'visits', label: 'Visits', num: true, render: (r) => num(r.visits) },
    ], d.pages, { key: 'loads', dir: 'desc' }, 12)),
    card({ title: 'By video', sub: 'Article pages and the dashboards inside them', span: 5 }, sortTable<any>([
      { key: 'video', label: 'Video', render: (r) => h('span', { class: 'cell-title' }, titleOf(r.video) || r.video, h('small', {}, r.video)) },
      { key: 'loads', label: 'Page loads', num: true, render: (r) => num(r.loads) },
      { key: 'embeds', label: 'Dashboards', num: true, render: (r) => num(r.embeds) },
    ], d.videos, { key: 'loads', dir: 'desc' }))));
  const tech = (dim: string) => d.tech.filter((r: any) => r.dim === dim).sort((a: any, b: any) => b.n - a.n);
  out.push(grid(
    card({ title: 'Countries', span: 4 }, barList(d.countries, (r: any) => country(r.country), (r: any) => r.loads)),
    card({ title: 'Devices', span: 4 }, barList(tech('device'), (r: any) => r.v, (r: any) => r.n)),
    card({ title: 'Browsers', span: 4 }, barList(tech('browser').slice(0, 8), (r: any) => r.v, (r: any) => r.n))));
  return out;
}
