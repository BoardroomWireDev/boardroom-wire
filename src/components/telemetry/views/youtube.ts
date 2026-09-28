/** YouTube analytics: the channel's own numbers (nightly from the YouTube Analytics API), and what each video sent to the site. */
import { fillRange, timeChart, weekly, sparkline, type ChartHandle, type ChartSpec } from '../chart';
import { COLORS, type Ctx } from '../ctx';
import { YT_SOURCE, dayLong, dayShort, full, hours, num, per1k, signed } from '../fmt';
import { barList, card, empty, grid, h, kpis, note, segmented, sortTable } from '../ui';

export async function render(ctx: Ctx): Promise<Node[]> {
  if (!ctx.meta.sources.yt_from) return [note('YouTube isn’t connected yet. Run npm run yt:auth in the site repo with the channel owner at the keyboard.', 'warn')];
  const d = await ctx.api('youtube');
  const T = d.totals, P = d.prev;
  const out: Node[] = [];
  const job = ctx.meta.jobs.find((j) => j.job === 'youtube-daily');
  if (job && (job.last_flag === 0 || !job.last_ok || Date.now() - job.last_ok > 3 * 86_400_000)) out.push(note(`The nightly YouTube pull needs attention: ${job.last_detail}`, 'warn'));

  const long = d.range.days > 120, { yt_from, yt_to } = ctx.meta.sources;
  const rows0: any[] = fillRange(d.series, 'day', d.range.from, d.range.to, false).map((r: any) =>
    r.views == null && yt_from && yt_to && r.day >= yt_from && r.day <= yt_to ? { ...r, views: 0, minutes: 0, subs: 0 } : r);
  const rows = long ? weekly(rows0, 'day', ['views', 'minutes', 'subs', 'site_from_youtube']) : rows0;
  out.push(kpis([
    { label: 'Views', value: num(T.views), cur: T.views, prev: P.views, hero: true, spark: sparkline(rows0.slice(-60).map((r) => r.views), COLORS.yt) },
    { label: 'Watch hours', value: hours(T.minutes), cur: T.minutes, prev: P.minutes },
    { label: 'Average viewed', value: T.avg_pct == null ? '–' : Math.round(T.avg_pct) + '%', cur: T.avg_pct, prev: P.avg_pct, pts: true, sub: 'of each video, view-weighted' },
    { label: 'Net subscribers', value: signed(T.subs), cur: T.subs, prev: P.subs },
    { label: 'Subscribers per 1,000 views', value: per1k(T.subs, T.views), cur: T.views ? (1000 * T.subs) / T.views : null, prev: P.views ? (1000 * P.subs) / P.views : null },
    { label: 'Site visitors from YouTube', value: num(T.site_from_youtube), cur: T.site_from_youtube, prev: P.site_from_youtube, sub: 'Wire Telemetry' },
  ], ctx.showDelta));

  // the metric chart
  let metric = ctx.pref<'views' | 'minutes' | 'subs'>('yt.metric', 'views');
  const host = h('div', { class: 'chart-host' });
  let chart: ChartHandle | undefined;
  const M = { views: { name: 'Views', fmt: full, get: (r: any) => r.views }, minutes: { name: 'Watch hours', fmt: (v: number) => num(v), get: (r: any) => (r.minutes == null ? null : r.minutes / 60) },
    subs: { name: 'Net subscribers', fmt: (v: number) => signed(v), get: (r: any) => r.subs } } as const;
  const spec = (): ChartSpec => ({
    x: rows.map((r) => r.day), xShort: dayShort, xLong: (k) => (long ? `Week of ${dayLong(k)}` : dayLong(k)), empty: 'No YouTube data in this range.',
    panels: [{ height: 230, series: [{ key: metric, name: M[metric].name, color: COLORS.yt, kind: 'area', values: rows.map(M[metric].get), fmt: M[metric].fmt }], label: M[metric].name }],
  });
  const seg = segmented([{ id: 'views', label: 'Views' }, { id: 'minutes', label: 'Watch hours' }, { id: 'subs', label: 'Subscribers' }], metric,
    (m) => { metric = m as typeof metric; ctx.setPref('yt.metric', m); chart?.update(spec()); }, 'Metric');
  const latest = ctx.meta.sources.yt_to;
  out.push(grid(card({ title: 'Channel performance', sub: `${long ? 'Weekly' : 'Daily'}${latest && latest < d.range.to ? ` · reported through ${dayShort(latest)}` : ''}`, chart: () => chart, actions: [seg] }, host)));
  queueMicrotask(() => { chart = timeChart(host, spec()); });

  // formats + sources
  const fmtRow = (short: number) => d.formats.find((f: any) => f.short === short) ?? {};
  const lf = fmtRow(0), sh = fmtRow(1);
  const cmp = (label: string, a: string, b: string) => h('tr', {}, h('th', { scope: 'row' }, label), h('td', { class: 'num' }, a), h('td', { class: 'num' }, b));
  out.push(grid(
    card({ title: 'Long-form against Shorts', sub: 'Shorts are uploads of 3 minutes or less', span: 5 },
      d.formats.length ? h('table', { class: 'tbl compare' },
        h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', { class: 'num', scope: 'col' }, 'Long-form'), h('th', { class: 'num', scope: 'col' }, 'Shorts'))),
        h('tbody', {},
          cmp('Videos with views', num(lf.videos), num(sh.videos)),
          cmp('Views', num(lf.views), num(sh.views)),
          cmp('Watch hours', hours(lf.minutes), hours(sh.minutes)),
          cmp('Average viewed', lf.avg_pct == null ? '–' : Math.round(lf.avg_pct) + '%', sh.avg_pct == null ? '–' : Math.round(sh.avg_pct) + '%'),
          cmp('Net subscribers', signed(lf.subs), signed(sh.subs)),
          cmp('Subscribers per 1,000 views', per1k(lf.subs, lf.views), per1k(sh.subs, sh.views)))) : empty('No views in this range.')),
    card({ title: 'Where views came from', sub: 'Traffic sources for recent videos, in YouTube Studio’s terms', span: 7 },
      d.sources.length ? barList(d.sources.slice(0, 10), (r: any) => YT_SOURCE[r.source] ?? r.source.replace(/_/g, ' ').toLowerCase(), (r: any) => r.views, num, COLORS.yt)
        : empty('No traffic-source data in this range.', 'Sources are pulled for each new video’s first 60 days, from 28 Sep 2026 on.'))));

  // every video
  let format = ctx.pref<'all' | 'long' | 'short'>('yt.format', 'all');
  const tableHost = h('div');
  const drawTable = () => {
    const vids = d.videos.filter((v: any) => format === 'all' || (format === 'short') === !!v.short);
    tableHost.replaceChildren(sortTable<any>([
      { key: 'title', label: 'Video', render: (r) => h('span', { class: 'cell-title' }, r.title, h('small', {}, r.short ? 'Short · ' : '', r.published ? dayShort(r.published.slice(0, 10)) + ' ' + r.published.slice(0, 4) : '')) },
      { key: 'views', label: 'Views', num: true, render: (r) => num(r.views) },
      { key: 'minutes', label: 'Watch hrs', num: true, render: (r) => hours(r.minutes) },
      { key: 'avg_pct', label: 'Viewed', num: true, render: (r) => (r.avg_pct == null ? '–' : Math.round(r.avg_pct) + '%'), title: 'Average percentage of the video watched' },
      { key: 'subs', label: 'Subs', num: true, render: (r) => signed(r.subs) },
      { key: 'rate', label: 'Subs / 1K', num: true, value: (r) => (r.views ? r.subs / r.views : null), render: (r) => per1k(r.subs, r.views) },
      { key: 'site_views', label: 'Site views', num: true, render: (r) => (r.site_views == null ? '–' : num(r.site_views)), title: 'Views of this video’s article and dashboards' },
      { key: 'site_from_youtube', label: 'From YouTube', num: true, render: (r) => (r.site_from_youtube == null ? '–' : num(r.site_from_youtube)), title: 'Site visitors who arrived from YouTube' },
      { key: 'substack_clicks', label: 'To Substack', num: true, render: (r) => (r.substack_clicks == null ? '–' : num(r.substack_clicks)) },
    ], vids, { key: 'views', dir: 'desc' }, 15));
  };
  drawTable();
  out.push(grid(card({ title: 'Every video', sub: 'Site columns fill for videos with an article on the site', actions: [segmented([{ id: 'all', label: 'All' }, { id: 'long', label: 'Long-form' }, { id: 'short', label: 'Shorts' }], format,
    (f) => { format = f as typeof format; ctx.setPref('yt.format', f); drawTable(); }, 'Format')] }, tableHost)));
  out.push(h('p', { class: 'foot' }, 'From the YouTube Analytics API, read nightly. It runs 2–3 days behind the public view counter, so totals sit below the site ticker. Impressions and click-through rate are not available through the API; they stay in YouTube Studio.'));
  return out;
}
