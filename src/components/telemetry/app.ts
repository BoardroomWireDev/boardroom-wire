/**
 * Wire Telemetry, the app shell: a collapsible icon sidebar (Overview · Web · YouTube · Legacy), one date-range
 * control that scopes every view, a live-readers pill, and hash routing (#/youtube?preset=28d or ?from=…&to=…) so a
 * view and range can be bookmarked. While a view reloads, the previous render stays on screen at reduced opacity.
 */
import { PRESETS, addDays, describe, spanDays, today, type RangeState } from './dates';
import type { Ctx, Meta, SiteData } from './ctx';
import * as overview from './views/overview';
import * as web from './views/web';
import * as youtube from './views/youtube';
import * as legacy from './views/legacy';

const VIEWS: Record<string, { title: string; sub: string; mod: { render: (c: Ctx) => Promise<Node[]> }; earliest: (m: Meta) => string | null }> = {
  overview: { title: 'Overview', sub: 'YouTube and the site together', mod: overview, earliest: (m) => m.sources.yt_from ?? m.sources.cf_from },
  web: { title: 'Web analytics', sub: 'Wire Telemetry · the site’s own readers', mod: web, earliest: (m) => m.sources.web_from },
  youtube: { title: 'YouTube', sub: 'The channel’s own analytics', mod: youtube, earliest: (m) => m.sources.yt_from },
  legacy: { title: 'Legacy', sub: 'Cloudflare’s edge history, before Wire Telemetry', mod: legacy, earliest: (m) => m.sources.cf_from },
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const store = {
  get<T>(k: string, f: T): T { try { const v = localStorage.getItem('bwt.' + k); return v == null ? f : JSON.parse(v); } catch { return f; } },
  set(k: string, v: unknown) { try { localStorage.setItem('bwt.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const site: SiteData = JSON.parse($('tele-site').textContent || '{}');
const envQ = new URLSearchParams(location.search).get('env');

let view = 'overview', range: RangeState = { preset: '28d', from: addDays(today(), -27), to: today() }, meta: Meta | null = null, token = 0;
let liveSubs: ((l: any) => void)[] = [];

/* ------------------------------------------------------------------ data */
async function get(path: string) {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-store' });
  if (r.status === 403) throw Object.assign(new Error('locked'), { code: 'locked' });
  if (r.status === 503) throw Object.assign(new Error('no-db'), { code: 'no-db' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
const api = (name: string, extra: Record<string, string> = {}) =>
  get(`/api/telemetry/${name}?${new URLSearchParams({ from: range.from, to: range.to, ...(envQ ? { env: envQ } : {}), ...extra })}`);

/* ----------------------------------------------------------- the route */
function readHash() {
  const [path, q] = location.hash.replace(/^#\/?/, '').split('?');
  const p = new URLSearchParams(q || '');
  if (VIEWS[path]) view = path;
  const preset = p.get('preset'), from = p.get('from'), to = p.get('to');
  if (preset && PRESETS.some((x) => x.id === preset)) range = { preset, from: '', to: '' };
  else if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) range = { preset: null, from: from <= to ? from : to, to: from <= to ? to : from };
  else if (!path) { const s = store.get<RangeState | null>('range', null); if (s) range = s; view = store.get('view', 'overview'); }
}
function resolve() {
  if (range.preset) { const p = PRESETS.find((x) => x.id === range.preset)!; range = { preset: p.id, ...p.resolve((meta && VIEWS[view].earliest(meta)) || '') }; }
  if (range.to > today()) range.to = today();
}
function writeHash() {
  const q = range.preset ? `preset=${range.preset}` : `from=${range.from}&to=${range.to}`;
  history.replaceState(null, '', `${location.pathname}${location.search}#/${view}?${q}`);
  store.set('range', range.preset ? { preset: range.preset, from: '', to: '' } : range); store.set('view', view);
}

/* ------------------------------------------------------------- render */
async function render() {
  resolve(); writeHash();
  const my = ++token, V = VIEWS[view], d = describe(range), main = $('main');
  document.title = `${V.title} · Wire Telemetry`;
  document.querySelectorAll<HTMLAnchorElement>('.nav a[data-view]').forEach((a) => {
    if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  $('view-title').textContent = V.title;
  $('view-sub').textContent = V.sub;
  $('range-label').textContent = d.label;
  const span = `${d.days} day${d.days === 1 ? '' : 's'} · vs previous ${d.days}`;
  $('range-dates').textContent = range.preset === 'all' ? `${d.dates} · all time` : range.preset ? `${d.dates} · ${span}` : span;   // a custom range already shows its dates as the label
  main.setAttribute('aria-busy', 'true'); main.classList.add('loading');
  liveSubs = [];
  try {
    const ctx: Ctx = {
      range, meta: meta!, site, api, showDelta: range.preset !== 'all',
      pref: (k, f) => store.get(k, f), setPref: (k, v) => store.set(k, v),
      onLive: (fn) => { liveSubs.push(fn); if (lastLive) fn(lastLive); }, go: (v) => { view = v; render(); },
    };
    const nodes = await V.mod.render(ctx);
    if (my !== token) return;
    main.replaceChildren(...nodes);
  } catch (e: any) {
    if (my !== token) return;
    if (e.code === 'locked') return fatal('Locked.', 'Wire Telemetry opens only through Cloudflare Access, for the Boardroom Wire account.');
    if (e.code === 'no-db') return fatal('Not connected.', 'The database is not bound to the site.');
    main.replaceChildren(Object.assign(document.createElement('p'), { className: 'note warn', textContent: `Couldn’t load this view: ${e.message || e}` }));
    console.error(e);
  } finally {
    if (my === token) { main.classList.remove('loading'); main.removeAttribute('aria-busy'); }
  }
}
function fatal(h: string, p: string) { $('state-h').textContent = h; $('state-p').textContent = p; $('state').hidden = false; }

/* ------------------------------------------------------------ sidebar */
const shell = $('app');
const setCollapsed = (c: boolean) => { shell.classList.toggle('collapsed', c); $('collapse').setAttribute('aria-expanded', String(!c)); $('collapse').title = c ? 'Expand the sidebar' : 'Collapse the sidebar'; store.set('collapsed', c); };
setCollapsed(store.get('collapsed', false));
$('collapse').addEventListener('click', () => setCollapsed(!shell.classList.contains('collapsed')));
document.querySelectorAll<HTMLAnchorElement>('.nav a[data-view]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); if (a.dataset.view === view) return; view = a.dataset.view!;
  if (range.preset === 'all') range = { preset: 'all', from: '', to: '' };          // "All time" re-resolves per view
  render(); $('main').focus({ preventScroll: true }); window.scrollTo({ top: 0 });
}));
document.addEventListener('keydown', (e) => {                                     // g then o / w / y / l
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'g') { gPressed = Date.now(); return; }
  const map: Record<string, string> = { o: 'overview', w: 'web', y: 'youtube', l: 'legacy' };
  if (Date.now() - gPressed < 900 && map[e.key]) { view = map[e.key]; if (range.preset === 'all') range = { preset: 'all', from: '', to: '' }; render(); }
});
let gPressed = 0;

/* --------------------------------------------------------- date picker */
const btn = $('range-btn'), pop = $('range-pop'), list = $('range-list'), fromI = $<HTMLInputElement>('range-from'), toI = $<HTMLInputElement>('range-to');
function openPicker() {
  list.replaceChildren(...PRESETS.map((p) => {
    const b = document.createElement('button'); b.type = 'button'; b.role = 'menuitemradio'; b.className = 'preset';
    b.setAttribute('aria-checked', String(range.preset === p.id));
    const earliest = meta && VIEWS[view].earliest(meta), r = p.resolve(earliest || '');
    b.innerHTML = `<span class="ck" aria-hidden="true"></span><span class="pl"></span><span class="pd"></span>`;
    (b.querySelector('.pl') as HTMLElement).textContent = p.label;
    (b.querySelector('.pd') as HTMLElement).textContent = p.id === 'today' ? '' : `${spanDays(r.from, r.to)}d`;
    b.addEventListener('click', () => { range = { preset: p.id, from: '', to: '' }; closePicker(); render(); });
    return b;
  }));
  fromI.value = range.from; toI.value = range.to; fromI.max = toI.max = today();
  const earliest = (meta && VIEWS[view].earliest(meta)) || '2025-01-01'; fromI.min = toI.min = earliest < '2025-01-01' ? earliest : '2025-01-01';
  pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  (list.querySelector('[aria-checked="true"]') as HTMLElement ?? list.firstElementChild as HTMLElement)?.focus();
}
function closePicker(refocus = true) { if (pop.hidden) return; pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); if (refocus) btn.focus(); }
btn.addEventListener('click', () => (pop.hidden ? openPicker() : closePicker()));
document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target as Node) && !btn.contains(e.target as Node)) closePicker(false); });
pop.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); closePicker(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const items = [...list.querySelectorAll<HTMLElement>('.preset')], i = items.indexOf(document.activeElement as HTMLElement);
    if (i >= 0) { e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); }
  }
});
$('range-form').addEventListener('submit', (e) => {
  e.preventDefault();
  let f = fromI.value, t = toI.value;
  if (!f || !t) return;
  if (f > t) [f, t] = [t, f];
  range = { preset: null, from: f, to: t > today() ? today() : t }; closePicker(); render();
});
$('range-prev').addEventListener('click', () => shift(-1));
$('range-next').addEventListener('click', () => shift(1));
function shift(dir: number) {                                                      // step the whole range back or forward by its own length
  const n = spanDays(range.from, range.to);
  let f = addDays(range.from, dir * n), t = addDays(range.to, dir * n);
  if (t > today()) { t = today(); f = addDays(t, -(n - 1)); }
  range = { preset: null, from: f, to: t }; render();
}

/* --------------------------------------------------------------- live */
let lastLive: any = null;
async function live() {
  try {
    const l = await get(`/api/telemetry/live${envQ ? `?env=${envQ}` : ''}`);
    lastLive = l; $('live-n').textContent = String(l.readers); $('live').classList.toggle('active', l.readers > 0);
    liveSubs.forEach((fn) => fn(l));
  } catch { /* the view shows errors */ }
}

/* -------------------------------------------------------------- start */
(async () => {
  readHash();
  try { meta = await get('/api/telemetry/meta'); }
  catch (e: any) { if (e.code === 'locked') return fatal('Locked.', 'Wire Telemetry opens only through Cloudflare Access, for the Boardroom Wire account.'); meta = { sources: {} as any, jobs: [] }; }
  window.addEventListener('hashchange', () => { readHash(); render(); });
  await render();
  live(); setInterval(live, 30_000);
  setInterval(async () => { try { meta = await get('/api/telemetry/meta'); } catch { /* keep the last */ } }, 300_000);
})();
