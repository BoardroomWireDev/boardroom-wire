/** Revenue: the channel's YouTube Partner Program earnings, estimated, in US dollars (YouTube Analytics, monetary scope). */
import { fillRange, timeChart, weekly, sparkline, type ChartHandle, type ChartSpec } from '../chart';
import { COLORS, type Ctx } from '../ctx';
import { dayLong, dayShort, num } from '../fmt';
import { card, empty, grid, h, kpis, note, segmented, sortTable } from '../ui';

export const usd = (v: unknown, digits = 2) => (v == null || !Number.isFinite(Number(v)) ? '–'
  : Number(v) >= 10_000 ? `$${num(v)}` : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`);
const rpm = (rev: unknown, views: unknown) => (Number(views) > 0 && rev != null ? (1000 * Number(rev)) / Number(views) : null);

export async function render(ctx: Ctx): Promise<Node[]> {
  const d = await ctx.api('revenue');
  const T = d.totals, P = d.prev, M = d.meta ?? {};
  const out: Node[] = [];
  if (!M.monetized_from) return [note('No revenue recorded yet. It appears once the nightly pull runs with the revenue permission.', 'warn')];

  const long = d.range.days > 120;
  // every day of the range; days before monetization or not yet reported stay gaps
  const rows0 = fillRange(d.series, 'day', d.range.from, d.range.to, false);
  const rows = long ? weekly(rows0, 'day', ['revenue', 'views', 'ad_impressions', 'monetized_playbacks', 'gross_revenue']) : rows0;
  if (long) for (const r of rows as any[]) r.cpm = null;                      // CPM can't be summed; weekly shows revenue and RPM only

  out.push(kpis([
    { label: 'Estimated revenue', value: usd(T.revenue), cur: T.revenue, prev: P.revenue, hero: true, sub: 'your share, US dollars',
      spark: sparkline(rows0.slice(-60).map((r: any) => r.revenue ?? null), COLORS.yt) },
    { label: 'RPM', value: usd(rpm(T.revenue, T.views)), cur: rpm(T.revenue, T.views), prev: rpm(P.revenue, P.views), sub: 'revenue per 1,000 views' },
    { label: 'CPM', value: usd(T.cpm), cur: T.cpm, prev: P.cpm, sub: 'advertisers per 1,000 ad impressions' },
    { label: 'Monetized playbacks', value: num(T.monetized_playbacks), cur: T.monetized_playbacks, prev: P.monetized_playbacks,
      sub: T.views ? `${Math.round((100 * (T.monetized_playbacks || 0)) / T.views)}% of views` : undefined },
    { label: 'YouTube Premium', value: usd(T.red_revenue), cur: T.red_revenue, prev: P.red_revenue, sub: 'part of the estimate' },
    { label: 'Gross revenue', value: usd(T.gross_revenue), cur: T.gross_revenue, prev: P.gross_revenue, sub: 'what advertisers paid' },
  ], ctx.showDelta));

  // the chart
  let metric = ctx.pref<'revenue' | 'rpm' | 'cpm'>('rev.metric', 'revenue');
  if (long && metric === 'cpm') metric = 'revenue';
  const host = h('div', { class: 'chart-host' });
  let chart: ChartHandle | undefined;
  const get = { revenue: (r: any) => (r.revenue == null ? null : Number(r.revenue)), rpm: (r: any) => rpm(r.revenue, r.views), cpm: (r: any) => (r.cpm == null ? null : Number(r.cpm)) };
  const names = { revenue: 'Estimated revenue', rpm: 'RPM (per 1,000 views)', cpm: 'CPM (per 1,000 ad impressions)' };
  const spec = (): ChartSpec => ({
    x: rows.map((r: any) => r.day), xShort: dayShort, xLong: (k) => (long ? `Week of ${dayLong(k)}` : dayLong(k)), empty: 'No revenue in this range.',
    marks: M.monetized_from > d.range.from && M.monetized_from <= d.range.to ? [{ x: M.monetized_from, label: 'Monetization begins' }] : [],
    panels: [{ label: names[metric], height: 230, yFmt: (v) => `$${v >= 1000 ? num(v) : v % 1 ? v.toFixed(v < 10 ? 2 : 0) : v}`,
      series: [{ key: metric, name: names[metric], color: COLORS.yt, kind: metric === 'revenue' ? 'area' : 'line', values: rows.map(get[metric]), fmt: (v) => usd(v) }] }],
  });
  const opts = [{ id: 'revenue', label: 'Revenue' }, { id: 'rpm', label: 'RPM' }, ...(long ? [] : [{ id: 'cpm', label: 'CPM' }])];
  const seg = segmented(opts, metric, (m) => { metric = m as typeof metric; ctx.setPref('rev.metric', m); chart?.update(spec()); }, 'Metric');
  const through = M.latest && M.latest < d.range.to ? ` · reported through ${dayShort(M.latest)}` : '';
  out.push(grid(card({ title: 'Earnings over time', sub: `${long ? 'Weekly' : 'Daily'}${through}`, chart: () => chart, actions: [seg] }, host)));
  queueMicrotask(() => { chart = timeChart(host, spec()); });

  // by video
  let format = ctx.pref<'all' | 'long' | 'short'>('rev.format', 'all');
  const total = Number(T.revenue) || 0, tableHost = h('div');
  const drawTable = () => {
    const vids = d.videos.filter((v: any) => format === 'all' || (format === 'short') === !!v.short);
    tableHost.replaceChildren(vids.length ? sortTable<any>([
      { key: 'title', label: 'Video', render: (r) => h('span', { class: 'cell-title' }, r.title, h('small', {}, r.short ? 'Short · ' : '', r.published ? `${dayShort(r.published.slice(0, 10))} ${r.published.slice(0, 4)}` : '')) },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => usd(r.revenue) },
      { key: 'share', label: 'Share', num: true, value: (r) => (total ? r.revenue / total : 0), render: (r) => (total ? `${Math.round((100 * r.revenue) / total)}%` : '–') },
      { key: 'views', label: 'Views', num: true, render: (r) => num(r.views) },
      { key: 'rpm', label: 'RPM', num: true, value: (r) => rpm(r.revenue, r.views), render: (r) => usd(rpm(r.revenue, r.views)) },
      { key: 'cpm', label: 'CPM', num: true, render: (r) => usd(r.cpm) },
      { key: 'monetized_playbacks', label: 'Monetized plays', num: true, render: (r) => num(r.monetized_playbacks) },
    ], vids, { key: 'revenue', dir: 'desc' }, 15) : empty('No revenue from these videos in this range.'));
  };
  drawTable();
  out.push(grid(card({ title: 'By video', sub: 'Estimated revenue in this range, and what each view earned',
    actions: [segmented([{ id: 'all', label: 'All' }, { id: 'long', label: 'Long-form' }, { id: 'short', label: 'Shorts' }], format,
      (f) => { format = f as typeof format; ctx.setPref('rev.format', f); drawTable(); }, 'Format')] }, tableHost)));

  // months + formats
  const fmtRow = (s: number) => d.formats.find((f: any) => f.short === s) ?? {};
  const lf = fmtRow(0), sh = fmtRow(1);
  const cmp = (label: string, a: string, b: string) => h('tr', {}, h('th', { scope: 'row' }, label), h('td', { class: 'num' }, a), h('td', { class: 'num' }, b));
  const thisMonth = new Date().toISOString().slice(0, 7);
  out.push(grid(
    card({ title: 'By month', sub: 'A month’s estimate is final around the middle of the next', span: 7 }, d.months.length ? sortTable<any>([
      { key: 'month', label: 'Month', render: (r) => h('span', {}, new Date(r.month + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        r.month >= thisMonth ? h('small', { class: 'tag' }, ' · in progress') : null) },
      { key: 'revenue', label: 'Revenue', num: true, render: (r) => usd(r.revenue) },
      { key: 'rpm', label: 'RPM', num: true, value: (r) => rpm(r.revenue, r.views), render: (r) => usd(rpm(r.revenue, r.views)) },
      { key: 'cpm', label: 'CPM', num: true, render: (r) => usd(r.cpm) },
      { key: 'monetized_playbacks', label: 'Monetized plays', num: true, render: (r) => num(r.monetized_playbacks) },
    ], d.months, { key: 'month', dir: 'desc' }) : empty('No revenue in this range.')),
    card({ title: 'Long-form against Shorts', sub: 'Shorts are uploads of 3 minutes or less', span: 5 }, d.formats.length ? h('table', { class: 'tbl compare' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', { class: 'num', scope: 'col' }, 'Long-form'), h('th', { class: 'num', scope: 'col' }, 'Shorts'))),
      h('tbody', {},
        cmp('Estimated revenue', usd(lf.revenue), usd(sh.revenue)),
        cmp('Views', num(lf.views), num(sh.views)),
        cmp('RPM', usd(rpm(lf.revenue, lf.views)), usd(rpm(sh.revenue, sh.views))),
        cmp('Videos that earned', num(lf.videos), num(sh.videos)))) : empty('No revenue in this range.'))));

  out.push(h('p', { class: 'foot' }, `Estimated earnings from the YouTube Partner Program, in US dollars, from the YouTube Analytics API (read nightly, 2–3 days behind). Monetized since ${dayShort(M.monetized_from)} ${M.monetized_from.slice(0, 4)}. YouTube revises estimates until a month is finalised; the nightly pull re-reads the last ten days. RPM is revenue per 1,000 views, as in Studio.`));
  return out;
}
