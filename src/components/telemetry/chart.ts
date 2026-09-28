/**
 * Time-series charts for Wire Telemetry, hand-written SVG (dataviz rules: one axis per panel, never two y-scales on
 * one plot; thin marks; hairline solid grid; a crosshair that snaps to the nearest day and one tooltip listing every
 * series; a table view for every chart; the previous render held at reduced opacity while data reloads).
 *
 * A chart is one or more *panels* stacked on a shared x-axis. Two measures of different scale go in two panels
 * (each on its own true axis) or are indexed to a common base in one panel — that is how YouTube views and site
 * visits sit together honestly.
 */

export interface Series {
  key: string; name: string; color: string;
  kind: 'line' | 'area' | 'context';        // context: a quiet grey area behind the story
  values: (number | null)[];
  fmt?: (v: number) => string;
}
export interface Panel { label?: string; height: number; series: Series[]; yFmt?: (v: number) => string; ref?: { value: number; label: string } }
export interface ChartSpec {
  x: string[];                               // day ('2026-09-28') or hour ('2026-09-28T14') keys, or week starts
  xShort: (k: string) => string;
  xLong: (k: string) => string;
  panels: Panel[];
  marks?: { x: string; label: string }[];    // vertical annotations, e.g. "Wire Telemetry began"
  empty?: string;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};
const compact = (v: number) => {
  const a = Math.abs(v);
  return a >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : a >= 1e3 ? `${+(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K` : `${+v.toFixed(a < 10 && v % 1 ? 1 : 0)}`;
};
function niceMax(max: number) {
  if (!(max > 0)) return { top: 1, step: 0.25 };
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw)), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  return { top: Math.ceil(max / step) * step, step };
}

export interface ChartHandle { update(spec: ChartSpec): void; table(): HTMLTableElement; destroy(): void }

export function timeChart(host: HTMLElement, first: ChartSpec): ChartHandle {
  let spec = first;
  host.classList.add('tc');
  const svg = el('svg', { class: 'tc-svg', role: 'img', tabindex: 0 }) as SVGSVGElement;
  const tip = document.createElement('div'); tip.className = 'tc-tip'; tip.setAttribute('role', 'status');
  host.replaceChildren(svg, tip);
  let geo: { left: number; plotW: number; n: number; panels: { top: number; h: number; y: (v: number) => number }[]; bottom: number } | null = null;
  let hover = -1;

  function draw() {
    const W = Math.max(280, host.clientWidth), n = spec.x.length;
    const all = spec.panels.flatMap((p) => p.series.flatMap((s) => s.values)).filter((v): v is number => v != null && Number.isFinite(v));
    svg.replaceChildren();
    const GAP = 18, AXIS = 26, ROW = 17;
    const scales = spec.panels.map((p) => niceMax(Math.max(0, ...p.series.flatMap((s) => s.values).filter((v): v is number => v != null), p.ref?.value ?? 0)));
    const widest = Math.max(...spec.panels.map((p, i) => (p.yFmt ?? compact)(scales[i].top).length));
    const left = 14 + widest * 6.6, right = 14, plotW = W - left - right, band = plotW / Math.max(1, n);
    // legend layout per panel: items flow left to right and wrap when the next one would pass the plot's right edge
    const heads = spec.panels.map((p) => {
      const items: { kind: 'label' | 'key'; s?: Series; x: number; row: number }[] = [];
      let hx = left, row = 0;
      if (p.label) { items.push({ kind: 'label', x: hx, row }); hx += p.label.length * 7.2 + 18; }
      if (p.series.length > 1 || !p.label) for (const s of p.series) {
        const w = 19 + s.name.length * 6.4;
        if (hx > left && hx + w > left + plotW) { hx = left; row++; }
        items.push({ kind: 'key', s, x: hx, row }); hx += w + 18;
      }
      return { items, h: 22 + row * ROW };
    });
    const H = spec.panels.reduce((a, p, i) => a + heads[i].h + p.height + GAP, 0) - GAP + AXIS;
    const HEAD = heads[0]?.h ?? 22;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', String(W)); svg.setAttribute('height', String(H));
    if (!n || !all.some((v) => v !== 0)) {
      const t = el('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'tc-empty' }); t.textContent = spec.empty ?? 'No data in this range yet.';
      svg.append(t); geo = null; return;
    }
    const X = (i: number) => left + (i + 0.5) * band;
    const panels: { top: number; h: number; y: (v: number) => number }[] = [];
    let top = 0;
    spec.panels.forEach((p, pi) => {
      const { top: ymax, step } = scales[pi], py = top + heads[pi].h, h = p.height;
      const y = (v: number) => py + h - (v / ymax) * h;
      panels.push({ top: py, h, y });
      // header: label and legend keys
      const head = el('g', { class: 'tc-head' });
      for (const it of heads[pi].items) {
        const ty = top + it.row * ROW;
        if (it.kind === 'label') { const t = el('text', { x: it.x, y: ty + 13, class: 'tc-plabel' }); t.textContent = p.label!; head.append(t); continue; }
        const s = it.s!;
        const key = s.kind === 'line' ? el('line', { x1: it.x, x2: it.x + 14, y1: ty + 9, y2: ty + 9, stroke: s.color, 'stroke-width': 2, 'stroke-linecap': 'round' })
          : el('rect', { x: it.x, y: ty + 4, width: 12, height: 10, rx: 2, fill: s.color, opacity: s.kind === 'context' ? 0.45 : 0.9 });
        const t = el('text', { x: it.x + 19, y: ty + 13, class: 'tc-legend' }); t.textContent = s.name;
        head.append(key, t);
      }
      svg.append(head);
      // grid + ticks
      for (let v = 0; v <= ymax + 1e-9; v += step) {
        const gy = Math.round(y(v)) + 0.5;
        svg.append(el('line', { x1: left, x2: left + plotW, y1: gy, y2: gy, class: v === 0 ? 'tc-base' : 'tc-grid' }));
        const t = el('text', { x: left - 8, y: gy + 3.5, 'text-anchor': 'end', class: 'tc-tick' }); t.textContent = (p.yFmt ?? compact)(v); svg.append(t);
      }
      if (p.ref) {
        const ry = Math.round(y(p.ref.value)) + 0.5;
        svg.append(el('line', { x1: left, x2: left + plotW, y1: ry, y2: ry, class: 'tc-ref' }));
        const t = el('text', { x: left + 6, y: ry - 5, class: 'tc-reflabel' }); t.textContent = p.ref.label; svg.append(t);
      }
      // series: context areas first, then areas, then lines
      const order = [...p.series].sort((a, b) => ['context', 'area', 'line'].indexOf(a.kind) - ['context', 'area', 'line'].indexOf(b.kind));
      for (const s of order) {
        const runs: [number, number][][] = []; let run: [number, number][] = [];
        s.values.forEach((v, i) => { if (v == null || !Number.isFinite(v)) { if (run.length) runs.push(run); run = []; } else run.push([X(i), y(v)]); });
        if (run.length) runs.push(run);
        for (const r of runs) {
          const line = r.map(([px, pyy], k) => `${k ? 'L' : 'M'}${px.toFixed(1)},${pyy.toFixed(1)}`).join('');
          if (s.kind !== 'line') {
            const base = (py + h).toFixed(1);
            const area = `${line}L${r[r.length - 1][0].toFixed(1)},${base}L${r[0][0].toFixed(1)},${base}Z`;
            svg.append(el('path', { d: area, fill: s.color, opacity: s.kind === 'context' ? 0.28 : 0.12 }));
          }
          if (s.kind !== 'context') {
            if (r.length === 1) svg.append(el('circle', { cx: r[0][0], cy: r[0][1], r: 3, fill: s.color }));
            else svg.append(el('path', { d: line, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
          }
        }
      }
      top = py + h + GAP;
    });
    const bottom = top - GAP;
    // annotations
    for (const m of spec.marks ?? []) {
      const i = spec.x.findIndex((k) => k >= m.x);
      if (i <= 0) continue;
      const mx = Math.round(left + i * band) + 0.5;
      svg.append(el('line', { x1: mx, x2: mx, y1: HEAD - 4, y2: bottom, class: 'tc-mark' }));
      const fitsRight = mx + 8 + m.label.length * 6.2 < left + plotW;
      const t = el('text', { x: fitsRight ? mx + 5 : mx - 5, y: HEAD + 8, 'text-anchor': fitsRight ? 'start' : 'end', class: 'tc-marklabel' }); t.textContent = m.label; svg.append(t);
    }
    // x-axis labels: evenly spaced, first and last always
    const maxLabels = Math.max(2, Math.floor(plotW / 78)), every = Math.max(1, Math.ceil(n / maxLabels));
    const idx = new Set<number>(); for (let i = 0; i < n; i += every) idx.add(i); idx.add(n - 1);
    if (n > 1 && idx.has(n - 1)) { const prev = [...idx].filter((i) => i < n - 1).pop(); if (prev != null && (n - 1 - prev) < every * 0.6) idx.delete(prev); }
    for (const i of idx) {
      const t = el('text', { x: X(i), y: bottom + 17, 'text-anchor': i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle', class: 'tc-tick' });
      if (i === 0 && n > 1) t.setAttribute('x', String(left)); if (i === n - 1 && n > 1) t.setAttribute('x', String(left + plotW));
      t.textContent = spec.xShort(spec.x[i]); svg.append(t);
    }
    svg.setAttribute('aria-label', `${spec.panels.map((p) => p.label ?? p.series.map((s) => s.name).join(' and ')).join('; ')}, ${spec.xLong(spec.x[0])} to ${spec.xLong(spec.x[n - 1])}. Table view available.`);
    geo = { left, plotW, n, panels, bottom };
    // crosshair layer
    const cross = el('g', { class: 'tc-cross', visibility: 'hidden' });
    cross.append(el('line', { class: 'tc-hair', x1: 0, x2: 0, y1: HEAD - 4, y2: bottom }));
    spec.panels.forEach((p, pi) => p.series.forEach((s) => { if (s.kind !== 'context') cross.append(el('circle', { class: 'tc-dot', r: 4, fill: s.color, 'data-p': pi, 'data-s': s.key })); }));
    svg.append(cross);
    svg.append(el('rect', { class: 'tc-hit', x: left, y: 0, width: plotW, height: bottom, fill: 'transparent' }));
    if (hover >= 0) show(Math.min(hover, n - 1));
  }

  function show(i: number) {
    if (!geo) return;
    hover = i;
    const x = geo.left + (i + 0.5) * (geo.plotW / geo.n);
    const cross = svg.querySelector('.tc-cross') as SVGGElement; cross.setAttribute('visibility', 'visible');
    const hair = cross.querySelector('.tc-hair')!; hair.setAttribute('x1', String(x)); hair.setAttribute('x2', String(x));
    cross.querySelectorAll('.tc-dot').forEach((d) => {
      const p = spec.panels[Number(d.getAttribute('data-p'))], s = p.series.find((q) => q.key === d.getAttribute('data-s'))!, v = s.values[i];
      if (v == null) { d.setAttribute('visibility', 'hidden'); return; }
      d.setAttribute('visibility', 'visible'); d.setAttribute('cx', String(x)); d.setAttribute('cy', String(geo!.panels[Number(d.getAttribute('data-p'))].y(v)));
    });
    // tooltip: values lead, names follow; every series at this x
    tip.replaceChildren();
    const h = document.createElement('div'); h.className = 'tc-tip-h'; h.textContent = spec.xLong(spec.x[i]); tip.append(h);
    for (const p of spec.panels) for (const s of p.series) {
      const row = document.createElement('div'); row.className = 'tc-tip-r';
      const key = document.createElement('i'); key.style.background = s.color; if (s.kind === 'context') key.style.opacity = '0.6';
      const val = document.createElement('b'); const v = s.values[i]; val.textContent = v == null ? '–' : (s.fmt ?? compact)(v);
      const name = document.createElement('span'); name.textContent = s.name;
      row.append(key, val, name); tip.append(row);
    }
    tip.classList.add('on');
    const tw = tip.offsetWidth, hostW = host.clientWidth;
    tip.style.left = `${Math.max(0, Math.min(hostW - tw, x + 14 > hostW - tw ? x - tw - 14 : x + 14))}px`;
    tip.style.top = '28px';
  }
  function hide() { hover = -1; tip.classList.remove('on'); svg.querySelector('.tc-cross')?.setAttribute('visibility', 'hidden'); }
  svg.addEventListener('pointermove', (e) => {
    if (!geo) return;
    const r = svg.getBoundingClientRect(), px = e.clientX - r.left;
    if (px < geo.left || px > geo.left + geo.plotW) { hide(); return; }
    show(Math.max(0, Math.min(geo.n - 1, Math.floor(((px - geo.left) / geo.plotW) * geo.n))));
  });
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('keydown', (e) => {
    if (!geo) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(Math.max(0, Math.min(geo.n - 1, (hover < 0 ? geo.n - 1 : hover) + (e.key === 'ArrowRight' ? 1 : -1)))); }
    if (e.key === 'Home') show(0); if (e.key === 'End') show(geo.n - 1); if (e.key === 'Escape') hide();
  });
  svg.addEventListener('blur', hide);
  let queued = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); });
  ro.observe(host);
  draw();

  return {
    update(next) { spec = next; hover = -1; tip.classList.remove('on'); draw(); },
    table() {
      const t = document.createElement('table'); t.className = 'tv';
      const hr = t.createTHead().insertRow();
      const th0 = document.createElement('th'); th0.textContent = 'Date'; th0.scope = 'col'; hr.append(th0);
      const cols = spec.panels.flatMap((p) => p.series);
      for (const s of cols) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = s.name; hr.append(th); }
      const body = t.createTBody();
      for (let i = spec.x.length - 1; i >= 0; i--) {
        const tr = body.insertRow(); const d = tr.insertCell(); d.textContent = spec.xLong(spec.x[i]);
        for (const s of cols) { const c = tr.insertCell(); const v = s.values[i]; c.textContent = v == null ? '–' : (s.fmt ?? compact)(v); }
      }
      return t;
    },
    destroy() { ro.disconnect(); host.replaceChildren(); },
  };
}

/** Sum daily rows into weeks (Monday starts) for long ranges; ratios must be recomputed from the sums by the caller. */
export function weekly<T extends Record<string, any>>(rows: T[], dayKey: string, sumKeys: string[]): (T & { week: string })[] {
  const out = new Map<string, any>();
  for (const r of rows) {
    const d = new Date(r[dayKey] + 'T00:00:00Z'), dow = (d.getUTCDay() + 6) % 7;
    const wk = new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
    const acc = out.get(wk) ?? { ...r, [dayKey]: wk, week: wk, ...Object.fromEntries(sumKeys.map((k) => [k, null])) };
    for (const k of sumKeys) if (r[k] != null) acc[k] = (acc[k] ?? 0) + Number(r[k]);
    out.set(wk, acc);
  }
  return [...out.values()];
}

/** A 12-to-60-point sparkline for stat tiles: the trend in a quiet stroke, the latest point in the accent. */
export function sparkline(values: (number | null)[], color: string, w = 120, h = 28) {
  const v = values.map((x) => (x == null ? null : Number(x)));
  const nums = v.filter((x): x is number => x != null);
  if (nums.length < 2) return '';
  const max = Math.max(...nums), min = Math.min(0, ...nums), n = v.length;
  const X = (i: number) => (i / (n - 1)) * (w - 4) + 2, Y = (x: number) => h - 3 - ((x - min) / (max - min || 1)) * (h - 6);
  let d = '', pen = false; v.forEach((x, i) => { if (x == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(x).toFixed(1)}`; pen = true; });
  const last = v.map((x, i) => [x, i] as const).filter(([x]) => x != null).pop()!;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="#5c5a55" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${X(last[1])}" cy="${Y(last[0] as number)}" r="3" fill="${color}"/></svg>`;
}

/**
 * Every day (or hour) of the range, in order, so the x-axis always spans the range you picked. Rows missing from
 * the data come back as { [key]: day } alone; the caller decides whether a missing value is a real zero (after a
 * source began counting) or a gap (before it, or not reported yet).
 */
export function fillRange<T extends Record<string, any>>(rows: T[], key: string, from: string, to: string, hourly: boolean): T[] {
  const by = new Map(rows.map((r) => [String(r[key]), r]));
  const out: T[] = [];
  if (hourly) {
    const end = Math.min(Date.parse(to) + 86_400_000, Date.now());
    for (let t = Date.parse(from); t < end; t += 3_600_000) { const k = new Date(t).toISOString().slice(0, 13); out.push(by.get(k) ?? ({ [key]: k } as T)); }
  } else {
    for (let t = Date.parse(from); t <= Date.parse(to); t += 86_400_000) { const k = new Date(t).toISOString().slice(0, 10); out.push(by.get(k) ?? ({ [key]: k } as T)); }
  }
  return out;
}
/** Zero-fill `keys` on rows at or after `since` (a source that was counting); leave earlier rows as gaps. */
export function zeroFrom<T extends Record<string, any>>(rows: T[], key: string, since: string | null, keys: string[]): T[] {
  return rows.map((r) => (since && String(r[key]).slice(0, 10) >= since ? { ...r, ...Object.fromEntries(keys.map((k) => [k, r[k] ?? 0])) } : r));
}
