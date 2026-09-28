/**
 * Overview: YouTube and the site on one timeline. Views and site visits live on very different scales, so they are
 * never put on two y-axes of one plot (the alignment would be arbitrary and invent correlation). Instead:
 *   Side by side — two panels on a shared timeline, each on its own true axis, one crosshair across both;
 *   Indexed      — both on one axis, each as a share of its own average over the range (= 100);
 *   Conversion   — site visitors arriving from YouTube per 1,000 YouTube views, the funnel itself.
 */
import { fillRange, timeChart, weekly, sparkline, zeroFrom, type ChartHandle, type ChartSpec } from '../chart';
import { COLORS, type Ctx } from '../ctx';
import { dayLong, dayShort, full, hours, num, per1k, signed } from '../fmt';
import { card, empty, grid, h, kpis, note, segmented, sortTable } from '../ui';

export async function render(ctx: Ctx): Promise<Node[]> {
  const d = await ctx.api('overview');
  const T = d.totals, P = d.prev;
  const long = d.range.days > 120;
  // every day of the range: site counts are real zeros once Wire Telemetry was counting, gaps before
  const rows0: any[] = zeroFrom(fillRange(d.series, 'day', d.range.from, d.range.to, false), 'day', d.telemetryFrom, ['site_visitors', 'site_from_youtube']);
  // conversion only over days both sources report (YouTube lags 2-3 days; the site was counted from 27 Sep)
  const both = rows0.filter((r) => r.yt_views != null && d.telemetryFrom && r.day >= d.telemetryFrom);
  const bothViews = both.reduce((a, r) => a + Number(r.yt_views), 0), bothFromYt = both.reduce((a, r) => a + Number(r.site_from_youtube ?? 0), 0);
  const rows = long ? weekly(rows0, 'day', ['yt_views', 'yt_minutes', 'yt_subs', 'site_visitors', 'site_from_youtube', 'cf_loads']) : rows0;
  const xLong = (k: string) => (long ? `Week of ${dayLong(k)}` : dayLong(k));
  const ytThrough = d.ytLatest && d.ytLatest < d.range.to ? d.ytLatest : null;
  const spark = (key: string, color: string) => sparkline(rows0.slice(-60).map((r) => r[key]), color);

  const out: Node[] = [];
  out.push(kpis([
    { label: 'YouTube views', value: num(T.yt_views), cur: T.yt_views, prev: P.yt_views, spark: spark('yt_views', COLORS.yt), hero: true },
    { label: 'Watch hours', value: hours(T.yt_minutes), cur: T.yt_minutes, prev: P.yt_minutes },
    { label: 'Net subscribers', value: signed(T.yt_subs), cur: T.yt_subs, prev: P.yt_subs },
    { label: 'Site visitors', value: num(T.site_visitors), cur: T.site_visitors, prev: P.site_visitors, spark: spark('site_visitors', COLORS.web),
      sub: d.telemetryFrom && d.telemetryFrom > d.range.from ? `counted from ${dayShort(d.telemetryFrom)}` : 'Wire Telemetry' },
    { label: 'Site visits per 1,000 views', value: both.length ? per1k(bothFromYt, bothViews) : '–',
      sub: both.length ? `arriving from YouTube · ${both.length} day${both.length === 1 ? '' : 's'} both report` : 'needs a day both YouTube and the site report' },
    { label: 'Clicks to Substack', value: num(T.substack_clicks), cur: T.substack_clicks, prev: P.substack_clicks },
  ], ctx.showDelta));

  // the hero chart
  let mode = ctx.pref<'side' | 'index' | 'conv'>('ov.mode', 'side');
  let siteMeasure = ctx.pref<'visitors' | 'loads'>('ov.site', d.telemetryFrom && d.telemetryFrom <= d.range.from ? 'visitors' : 'loads');
  const host = h('div', { class: 'chart-host' });
  let chart: ChartHandle | undefined;
  const x = rows.map((r) => r.day);
  const col = (k: string) => rows.map((r) => (r[k] == null ? null : Number(r[k])));
  const indexed = (vals: (number | null)[]) => {
    const nz = vals.filter((v): v is number => v != null);
    const mean = nz.reduce((a, b) => a + b, 0) / (nz.length || 1);
    return vals.map((v) => (v == null || !mean ? null : (v / mean) * 100));
  };
  const marks = d.telemetryFrom && d.telemetryFrom > d.range.from ? [{ x: d.telemetryFrom, label: 'Wire Telemetry begins' }] : [];
  const spec = (): ChartSpec => {
    const base = { x, xShort: dayShort, xLong, marks };
    if (mode === 'side') return { ...base, panels: [
      { label: 'YouTube views', height: 150, series: [{ key: 'yt', name: 'YouTube views', color: COLORS.yt, kind: 'area', values: col('yt_views'), fmt: full }] },
      { label: 'The site', height: 120, series: [
        { key: 'cf', name: 'Page loads · Cloudflare, real browsers', color: COLORS.context, kind: 'context', values: col('cf_loads'), fmt: full },
        { key: 'web', name: 'Visitors · Wire Telemetry', color: COLORS.web, kind: 'line', values: col('site_visitors'), fmt: full },
      ] },
    ] };
    if (mode === 'index') {
      const site = siteMeasure === 'visitors' ? col('site_visitors') : col('cf_loads');
      return { ...base, empty: 'Not enough overlapping data to index yet.', panels: [{
        height: 230, yFmt: (v) => String(Math.round(v)), ref: { value: 100, label: 'each series’ average = 100' },
        series: [
          { key: 'yt', name: 'YouTube views', color: COLORS.yt, kind: 'line', values: indexed(col('yt_views')), fmt: (v) => Math.round(v) + ' (index)' },
          { key: 'web', name: siteMeasure === 'visitors' ? 'Site visitors' : 'Site page loads', color: COLORS.web, kind: 'line', values: indexed(site), fmt: (v) => Math.round(v) + ' (index)' },
        ] }] };
    }
    const conv = rows.map((r) => (r.yt_views > 0 && r.site_from_youtube != null ? (1000 * r.site_from_youtube) / r.yt_views : null));
    return { ...base, empty: 'Conversion needs Wire Telemetry and YouTube data on the same days. It fills in as both arrive.', panels: [{
      label: 'Site visitors from YouTube per 1,000 YouTube views', height: 220, yFmt: (v) => v.toFixed(v < 10 ? 1 : 0),
      series: [{ key: 'conv', name: 'Visitors per 1,000 views', color: COLORS.web, kind: 'area', values: conv, fmt: (v) => v.toFixed(1) }] }] };
  };
  const controls = h('div', { class: 'ctl-row' });
  const redraw = () => { chart ? chart.update(spec()) : (chart = timeChart(host, spec())); drawControls(); };
  function drawControls() {
    controls.replaceChildren(segmented([
      { id: 'side', label: 'Side by side', title: 'Two panels on one timeline, each on its own true scale' },
      { id: 'index', label: 'Indexed', title: 'Both on one axis, as a share of their own average' },
      { id: 'conv', label: 'Conversion', title: 'Site visitors from YouTube per 1,000 views' },
    ], mode, (m) => { mode = m as typeof mode; ctx.setPref('ov.mode', m); redraw(); }, 'Chart mode'));
    if (mode === 'index') controls.append(segmented([{ id: 'visitors', label: 'Visitors' }, { id: 'loads', label: 'Page loads' }], siteMeasure,
      (m) => { siteMeasure = m as typeof siteMeasure; ctx.setPref('ov.site', m); redraw(); }, 'Site measure'));
  }
  const sub = [long ? 'Weekly' : 'Daily', ytThrough ? `YouTube reports through ${dayShort(ytThrough)} (it runs 2–3 days behind)` : null].filter(Boolean).join(' · ');
  out.push(grid(card({ title: 'YouTube and the site', sub, chart: () => chart, actions: [controls] }, host)));
  queueMicrotask(redraw);

  // top videos + data health
  const vids = card({ title: 'Top videos in this range', sub: 'YouTube views, and what each sent to the site', span: 8,
    actions: [h('a', { class: 'mini link', href: '#/youtube' }, 'All videos →')] },
    sortTable<any>([
      { key: 'title', label: 'Video', render: (r) => h('span', { class: 'cell-title' }, r.title, h('small', {}, r.short ? 'Short · ' : '', dayShort(String(r.published).slice(0, 10)))) },
      { key: 'views', label: 'Views', num: true, render: (r) => num(r.views) },
      { key: 'minutes', label: 'Watch hrs', num: true, render: (r) => hours(r.minutes) },
      { key: 'subs', label: 'Subs', num: true, render: (r) => signed(r.subs) },
      { key: 'site_visitors', label: 'Site visitors', num: true, value: (r) => (r.slug ? r.site_visitors : null), render: (r) => (r.slug ? num(r.site_visitors) : '–'),
        title: 'Visitors to this video’s article and dashboards (videos with an article only)' },
    ], d.videos, { key: 'views', dir: 'desc' }));
  out.push(grid(vids, health(ctx)));
  if (!d.videos.length) vids.querySelector('.card-body')!.replaceChildren(empty('No YouTube views in this range.'));
  return out;
}

function health(ctx: Ctx) {
  const s = ctx.meta.sources, jobs = new Map(ctx.meta.jobs.map((j) => [j.job, j]));
  const row = (name: string, job: string | null, coverage: string) => {
    const j = job ? jobs.get(job) : null;
    const stale = j && (!j.last_ok || Date.now() - j.last_ok > 3 * 86_400_000 || j.last_flag === 0);
    const when = j?.last_ok ? new Date(j.last_ok).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never';
    return h('li', { class: stale ? 'bad' : 'ok' },
      h('span', { class: 'hl-dot', 'aria-hidden': 'true' }), h('b', {}, name),
      h('span', {}, coverage), job ? h('small', {}, stale ? `Needs attention · last good copy ${when}` : `Copied ${when}`) : h('small', {}, 'Live'));
  };
  return card({ title: 'Data sources', sub: 'What each view draws on, and whether the daily copy is healthy', span: 4 },
    h('ul', { class: 'health' },
      row('YouTube Analytics', 'youtube-daily', s.yt_from ? `from ${dayShort(s.yt_from)} ${s.yt_from.slice(0, 4)}` : 'not connected'),
      row('Wire Telemetry', null, s.web_from ? `from ${dayShort(s.web_from)}` : 'no readers yet'),
      row('Cloudflare history', 'cloudflare-history', s.cf_from ? `totals from ${dayShort(s.cf_from)}, pages from ${dayShort(s.cf_pages_from ?? s.cf_from)}` : '–')),
    note('All days are UTC. YouTube runs 2–3 days behind; impressions and click-through stay in YouTube Studio.'));
}
