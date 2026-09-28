/** Building blocks for the Wire Telemetry views. Every string from data goes in through textContent. */
import { delta, deltaPts, num } from './fmt';
import type { ChartHandle } from './chart';

type Child = Node | string | number | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, any> = {}, ...kids: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;     // html: only for our own SVG strings
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style') e.setAttribute('style', v);
    else e.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids) if (c != null && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}

export interface CardOpts { title: string; sub?: string; span?: 4 | 5 | 6 | 7 | 8 | 12; actions?: Node[]; chart?: () => ChartHandle | undefined; id?: string }
/** A card; if it holds a chart, its header carries a Chart / Table toggle (the table is the accessible twin). */
export function card(o: CardOpts, ...body: Child[]) {
  const inner = h('div', { class: 'card-body' }, ...body);
  const actions = h('div', { class: 'card-actions' }, ...(o.actions ?? []));
  if (o.chart) {
    let on = false;
    const btn = h('button', { type: 'button', class: 'mini', 'aria-pressed': 'false', title: 'Show the numbers as a table' }, 'Table');
    btn.addEventListener('click', () => {
      on = !on; btn.setAttribute('aria-pressed', String(on)); btn.textContent = on ? 'Chart' : 'Table';
      inner.querySelector('.tv-wrap')?.remove();
      inner.classList.toggle('show-table', on);
      if (on) { const c = o.chart!(); if (c) inner.append(h('div', { class: 'tv-wrap' }, c.table())); }
    });
    actions.append(btn);
  }
  return h('section', { class: `card span-${o.span ?? 12}`, id: o.id },
    h('header', { class: 'card-h' }, h('div', {}, h('h2', {}, o.title), o.sub ? h('p', { class: 'card-sub' }, o.sub) : null), actions),
    inner);
}

export interface Kpi { label: string; value: string; sub?: string; cur?: unknown; prev?: unknown; goodIsUp?: boolean; spark?: string; hero?: boolean; pts?: boolean }
export function kpis(items: Kpi[], showDelta: boolean) {
  return h('section', { class: 'kpis' }, ...items.map((k) => {
    const d = showDelta && k.prev !== undefined ? (k.pts ? deltaPts(k.cur, k.prev) : delta(k.cur, k.prev)) : null;
    const good = d ? (d.dir === 'flat' ? 'flat' : (d.dir === 'up') === (k.goodIsUp ?? true) ? 'good' : 'bad') : null;
    return h('div', { class: `kpi${k.hero ? ' hero' : ''}` },
      h('h3', {}, k.label),
      h('p', { class: 'kpi-v' }, k.value),
      h('div', { class: 'kpi-foot' },
        d ? h('span', { class: `delta ${good}`, title: 'Change against the previous period of the same length' },
          h('span', { 'aria-hidden': 'true' }, d.dir === 'up' ? '▲ ' : d.dir === 'down' ? '▼ ' : '● '), d.text,
          h('span', { class: 'sr' }, d.dir === 'up' ? ' up' : d.dir === 'down' ? ' down' : ''), ' vs previous') : null,
        k.sub ? h('span', { class: 'kpi-sub' }, k.sub) : null),
      k.spark ? h('div', { class: 'kpi-spark', html: k.spark }) : null);
  }));
}

export function barList<T>(rows: T[], label: (r: T) => string, value: (r: T) => number, fmt: (v: number) => string = num, color = 'var(--web)') {
  if (!rows.length) return empty('Nothing in this range yet.');
  const max = Math.max(1, ...rows.map(value));
  return h('ol', { class: 'bars' }, ...rows.map((r) => h('li', {},
    h('span', { class: 'bars-l', title: label(r) }, label(r)), h('b', {}, fmt(value(r))),
    h('i', { style: `--w:${((100 * value(r)) / max).toFixed(1)}%;--c:${color}` }))));
}

export interface Col<T> { key: string; label: string; num?: boolean; value?: (r: T) => number | string | null; render?: (r: T) => Child; title?: string }
/** A table whose numeric headers sort (aria-sort); `limit` rows with a "Show all" toggle. */
export function sortTable<T>(cols: Col<T>[], rows: T[], init: { key: string; dir: 'asc' | 'desc' }, limit = 0) {
  if (!rows.length) return empty('Nothing in this range yet.');
  let sort = init, all = false;
  const wrap = h('div', { class: 'tbl-wrap' });
  const val = (c: Col<T>, r: T) => (c.value ? c.value(r) : (r as any)[c.key]);
  function render() {
    const sorted = [...rows].sort((a, b) => {
      const c = cols.find((x) => x.key === sort.key)!, va = val(c, a), vb = val(c, b);
      const cmp = typeof va === 'number' || typeof vb === 'number' ? (Number(va ?? -Infinity) - Number(vb ?? -Infinity)) : String(va ?? '').localeCompare(String(vb ?? ''));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    const shown = limit && !all ? sorted.slice(0, limit) : sorted;
    const t = h('table', { class: 'tbl' });
    const hr = t.createTHead().insertRow();
    for (const c of cols) {
      const active = c.key === sort.key;
      const th = h('th', { scope: 'col', class: c.num ? 'num' : '', 'aria-sort': active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none', title: c.title },
        h('button', { type: 'button', class: 'th-btn' }, c.label, h('span', { class: 'arrow', 'aria-hidden': 'true' }, active ? (sort.dir === 'asc' ? '↑' : '↓') : '')));
      th.querySelector('button')!.addEventListener('click', () => { sort = { key: c.key, dir: active && sort.dir === 'desc' ? 'asc' : 'desc' }; render(); });
      hr.append(th);
    }
    const body = t.createTBody();
    for (const r of shown) {
      const tr = body.insertRow();
      for (const c of cols) { const td = tr.insertCell(); if (c.num) td.className = 'num'; const v = c.render ? c.render(r) : val(c, r); td.append(v instanceof Node ? v : document.createTextNode(v == null ? '–' : String(v))); }
    }
    wrap.replaceChildren(t);
    if (limit && rows.length > limit) wrap.append(h('button', { type: 'button', class: 'more', onclick: () => { all = !all; render(); } }, all ? 'Show fewer' : `Show all ${rows.length}`));
  }
  render();
  return wrap;
}

export function segmented(options: { id: string; label: string; title?: string }[], value: string, onChange: (id: string) => void, label: string) {
  const g = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  const draw = (v: string) => g.replaceChildren(...options.map((o) => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(o.id === v), title: o.title, class: o.id === v ? 'on' : '' }, o.label);
    b.addEventListener('click', () => { if (o.id !== v) { draw(o.id); onChange(o.id); } });
    return b;
  }));
  draw(value);
  return g;
}

export const empty = (text: string, hint?: string) => h('div', { class: 'empty' }, h('p', {}, text), hint ? h('p', { class: 'empty-hint' }, hint) : null);
export const note = (text: string, kind: 'info' | 'warn' = 'info') => h('p', { class: `note ${kind}`, role: kind === 'warn' ? 'alert' : undefined }, text);
export const chip = (text: string) => h('span', { class: 'chip' }, text);
export const grid = (...kids: Child[]) => h('div', { class: 'grid' }, ...kids);
