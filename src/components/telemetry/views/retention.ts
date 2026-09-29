/**
 * Retention: each video's lifetime audience-retention curve (YouTube Analytics), with its chapters. Not scoped by the
 * date range: YouTube reports the curve over a video's life. Pick a video, optionally overlay another (compared by
 * % of video), read where people leave and which chapter it happens in.
 */
import { timeChart, type ChartHandle, type ChartSpec } from '../chart';
import { COLORS, type Ctx } from '../ctx';
import { dayShort, num } from '../fmt';
import { card, empty, grid, h, kpis, note, sortTable } from '../ui';

const mmss = (s: number | null | undefined) => (s == null ? '–' : s >= 3600
  ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`
  : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const pc = (v: number | null | undefined) => (v == null ? '–' : `${Math.round(v * 100)}%`);
const better = (v: number | null | undefined) => (v == null ? '–' : `${Math.round(v * 100)}%`);

export async function render(ctx: Ctx): Promise<Node[]> {
  let sel = ctx.pref<string | null>('ret.video', null), cmp = ctx.pref<string | null>('ret.compare', null);
  const d = await ctx.api('retention', { ...(sel ? { video: sel } : {}), ...(cmp ? { compare: cmp } : {}) });
  if (!d.videos.length) return [note('No retention curves yet. YouTube reports them once a video has enough views; the nightly pull fetches them.', 'warn')];
  const byId = new Map(d.videos.map((v: any) => [v.youtube_id, v]));
  const V: any = byId.get(d.selected?.id) ?? d.videos[0], C: any = d.compare ? byId.get(d.compare.id) : null;
  const out: Node[] = [];

  out.push(note(`Lifetime curves, from publication to the latest reported day; the date range doesn’t apply here. YouTube reports retention once a video has enough views: ${d.videos.length} videos have one so far.`));
  // pickers
  const opt = (v: any, cur: string | null) => h('option', { value: v.youtube_id, selected: v.youtube_id === cur ? true : undefined }, `${v.short ? 'Short · ' : ''}${v.title}`);
  const pickV = h('select', { class: 'pick', 'aria-label': 'Video' }, ...d.videos.map((v: any) => opt(v, V.youtube_id)));
  const pickC = h('select', { class: 'pick', 'aria-label': 'Compare with' }, h('option', { value: '' }, 'Compare with…'),
    ...d.videos.filter((v: any) => v.youtube_id !== V.youtube_id).map((v: any) => opt(v, C?.youtube_id ?? null)));
  pickV.addEventListener('change', () => { ctx.setPref('ret.video', pickV.value); ctx.setPref('ret.compare', null); ctx.go('retention'); });
  pickC.addEventListener('change', () => { ctx.setPref('ret.compare', pickC.value || null); ctx.go('retention'); });

  out.push(kpis([
    { label: 'Still watching at 0:30', value: pc(V.at30), sub: V.duration_s ? `of ${mmss(V.duration_s)}` : undefined, hero: true },
    { label: 'Still watching at 1:00', value: pc(V.at60) },
    { label: 'Still watching halfway', value: pc(V.half), sub: V.duration_s ? `at ${mmss(V.duration_s / 2)}` : undefined },
    { label: 'Still watching at the end', value: pc(V.end) },
    { label: 'Average viewed', value: pc(V.mean), sub: 'of the video, per view' },
    { label: 'Better than', value: better(V.relative), sub: 'of similar-length videos (typical 50%)' },
  ], false));

  // the curve
  const P = d.selected?.points ?? [], Q = d.compare?.points ?? [];
  const byRatio = (pts: any[]) => new Map(pts.map((p: any) => [Number(p.ratio).toFixed(2), p]));
  const mp = byRatio(P), mq = byRatio(Q);
  const x = Array.from({ length: 100 }, (_, i) => ((i + 1) / 100).toFixed(2));
  const chap: [number, string][] = V.chapters ?? [];
  const chapterAt = (sec: number) => [...chap].reverse().find(([s]) => s <= sec)?.[1] ?? null;
  const secOf = (k: string) => (V.duration_s ? Number(k) * V.duration_s : null);
  const xShort = (k: string) => (C || !V.duration_s ? `${Math.round(Number(k) * 100)}%` : mmss(secOf(k)));
  const xLong = (k: string) => {
    const s = secOf(k), c = s != null ? chapterAt(s) : null;
    return `${C ? `${Math.round(Number(k) * 100)}% through` : mmss(s)}${c ? ` · ${c}` : ''}`;
  };
  const series = (m: Map<string, any>, key: 'watch' | 'relative', scale = 100) => x.map((k) => { const p = m.get(k); return p && p[key] != null ? Number(p[key]) * scale : null; });
  const marks = chap.filter(([s]) => s > 0).map(([s]) => ({ x: (Math.max(0.01, Math.min(1, s / (V.duration_s || 1)))).toFixed(2), label: '' }));
  const spec: ChartSpec = {
    x, xShort, xLong, marks: C ? [] : marks,
    panels: [
      { label: 'Still watching', height: 230, yFmt: (v) => `${Math.round(v)}%`, series: [
        { key: 'a', name: C ? V.title : 'Still watching', color: COLORS.yt, kind: C ? 'line' : 'area', values: series(mp, 'watch'), fmt: (v) => `${v.toFixed(0)}%` },
        ...(C ? [{ key: 'b', name: C.title, color: COLORS.web, kind: 'line' as const, values: series(mq, 'watch'), fmt: (v: number) => `${v.toFixed(0)}%` }] : []),
      ] },
      { label: 'Against similar-length videos', height: 110, yFmt: (v) => `${Math.round(v)}`, ref: { value: 50, label: 'typical = 50' }, series: [
        { key: 'ra', name: C ? `${V.title.slice(0, 32)}…` : 'Better than this % of similar videos', color: COLORS.yt, kind: 'line', values: series(mp, 'relative'), fmt: (v) => `${Math.round(v)}` },
        ...(C ? [{ key: 'rb', name: `${C.title.slice(0, 32)}…`, color: COLORS.web, kind: 'line' as const, values: series(mq, 'relative'), fmt: (v: number) => `${Math.round(v)}` }] : []),
      ] },
    ],
  };
  const host = h('div', { class: 'chart-host' });
  let chart: ChartHandle | undefined;
  queueMicrotask(() => { chart = timeChart(host, spec); });
  out.push(grid(card({ title: V.title, sub: `${V.short ? 'Short · ' : ''}${dayShort(String(V.published).slice(0, 10))} ${String(V.published).slice(0, 4)} · ${mmss(V.duration_s)} · ${num(V.views)} views${chap.length ? ` · ${chap.length} chapters, marked` : ''}`,
    chart: () => chart, actions: [h('div', { class: 'ctl-row' }, pickV, pickC)] }, host)));

  // chapters and drops
  const w = (sec: number) => { const k = V.duration_s ? Math.max(0.01, Math.min(1, sec / V.duration_s)).toFixed(2) : null; return k ? mp.get(k)?.watch ?? null : null; };
  const chRows = chap.map(([s, title], i) => {
    const endS = (chap[i + 1]?.[0] ?? V.duration_s) - 1, a = w(Math.max(s, 1)), b = w(endS);
    return { title, s, a, b, lost: a != null && b != null ? a - b : null, len: endS - s };
  });
  const drops: { ratio: number; fall: number }[] = [];
  for (let i = 1; i < P.length; i++) if (P[i].ratio > 0.03 && P[i].ratio <= 0.98 && P[i].watch != null && P[i - 1].watch != null) drops.push({ ratio: P[i].ratio, fall: P[i - 1].watch - P[i].watch });
  drops.sort((a, b) => b.fall - a.fall);
  out.push(grid(
    card({ title: 'Chapters', sub: 'Who is there at the start of each chapter, and how many leave during it', span: 7 }, chRows.length ? sortTable<any>([
      { key: 's', label: 'Starts', num: true, render: (r) => mmss(r.s) },
      { key: 'title', label: 'Chapter', render: (r) => h('span', { class: 'cell-title' }, r.title) },
      { key: 'a', label: 'At start', num: true, render: (r) => pc(r.a) },
      { key: 'lost', label: 'Lost during', num: true, render: (r) => (r.lost == null ? '–' : `${Math.round(r.lost * 100)} pts`) },
      { key: 'rate', label: 'Lost / min', num: true, value: (r) => (r.lost != null && r.len > 0 ? r.lost / (r.len / 60) : null),
        render: (r) => (r.lost != null && r.len > 0 ? `${((100 * r.lost) / (r.len / 60)).toFixed(1)} pts` : '–'), title: 'Percentage points lost per minute of chapter: the fairest way to compare long and short chapters' },
    ], chRows, { key: 's', dir: 'asc' }) : empty('No chapters in this video’s description.', 'Add “0:00 Title” lines to the description and they appear here the next morning.')),
    card({ title: 'Steepest drops', sub: 'The five biggest falls between neighbouring points, leaving out the opening and the end screen', span: 5 }, drops.length ? h('ol', { class: 'drops' },
      ...drops.slice(0, 5).map((dr) => { const s = V.duration_s ? dr.ratio * V.duration_s : null, c = s != null ? chapterAt(s) : null;
        return h('li', {}, h('b', {}, mmss(s)), h('span', {}, c ?? `${Math.round(dr.ratio * 100)}% through`), h('i', {}, `−${(dr.fall * 100).toFixed(1)} pts`)); })) : empty('No curve.'))));

  // every video
  out.push(grid(card({ title: 'Every video with a curve', sub: 'Click a row to open it' }, (() => {
    const t = sortTable<any>([
      { key: 'title', label: 'Video', render: (r) => h('button', { type: 'button', class: 'row-link', 'data-id': r.youtube_id }, h('span', { class: 'cell-title' }, r.title, h('small', {}, `${r.short ? 'Short · ' : ''}${mmss(r.duration_s)}`))) },
      { key: 'at30', label: 'At 0:30', num: true, render: (r) => pc(r.at30) },
      { key: 'half', label: 'Halfway', num: true, render: (r) => pc(r.half) },
      { key: 'end', label: 'At the end', num: true, render: (r) => pc(r.end) },
      { key: 'mean', label: 'Avg viewed', num: true, render: (r) => pc(r.mean) },
      { key: 'relative', label: 'Better than', num: true, render: (r) => better(r.relative), title: 'Share of similar-length YouTube videos this one out-retains (typical 50%)' },
      { key: 'drop', label: 'Steepest drop', value: (r) => r.drop?.fall ?? null, render: (r) => (r.drop ? `${mmss(r.drop.seconds)}${r.drop.chapter ? ` · ${r.drop.chapter}` : ''}` : '–') },
    ], d.videos, { key: 'relative', dir: 'desc' });
    t.addEventListener('click', (e) => {
      const b = (e.target as Element).closest('.row-link') as HTMLElement | null;
      if (b) { ctx.setPref('ret.video', b.dataset.id); ctx.setPref('ret.compare', null); ctx.go('retention'); window.scrollTo({ top: 0 }); }
    });
    return t;
  })())));
  out.push(h('p', { class: 'foot' }, 'From the YouTube Analytics API. “Still watching” is the share of views still playing at that point (it can pass 100% where people rewind). “Better than” is YouTube’s relative retention: how this video holds viewers against all YouTube videos of similar length, where 50% is typical. Curves refresh nightly for videos under 60 days old, weekly for the rest.'));
  return out;
}
