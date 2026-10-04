/**
 * Production: the writer's schedule (4 Oct 2026). Reads /api/telemetry/production (behind Access), which serves what the production repo writes with
 * `bw slate --production --push` from its own files (the repo stays the source of truth; nothing here writes back).
 *   Waiting on you — open decisions across videos and proposals, oldest first;
 *   This week      — the next release and whether it is where the week's rhythm says it should be;
 *   Pipeline       — one column per step; hover a column for what belongs there, a card for the thing itself (thesis, title ideas);
 *   Releases       — six weeks from this Monday: published, date set, projected (dashed: one a Friday, furthest along first).
 * The date-range control does not apply here and is hidden on this tab.
 */
import type { Ctx } from '../ctx';
import { card, empty, grid, h, note } from '../ui';

interface Step { id: string; label: string; expect: string }
interface Item { slug: string; title: string; kind: 'video' | 'idea'; tier: string; step: string; where: string; ask: boolean; thesis: string; titles: string[]; owed: string[]; peg: string; published: string | null; window: string[]; touched: number | null }
interface Release { slug: string; date: string; kind: 'published' | 'window' | 'projected' }
interface Decision { kind: 'ask' | 'proposal'; slug: string; title: string; text: string; opened: string | null; days: number | null; stage: string }
interface Data {
  built: string; today: string; from: string; until: string; steps: Step[]; decisions: Decision[]; cards: Item[]; releases: Release[];
  week: { slug: string; title: string; due: string; projected: boolean; says: string; weekend: boolean; status: string } | null;
  flags: { level: string; text: string }[];
}

const D = (day: string) => new Date(day + 'T12:00:00Z');
const dm = (day: string) => D(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const wdm = (day: string) => D(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const plusDays = (day: string, n: number) => new Date(D(day).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const ago = (n: number | null) => (n == null ? '' : n === 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`);
const STAGE: Record<string, string> = { ideation: 'Ideation', research: 'Research', prepackaging: 'Pre-packaging', outlining: 'Outlining', scripting: 'Scripting', packaging: 'Packaging' };

/* the tip is fixed, so a scroll (the page, or the board sideways) re-places it beside its card, or hides it once the card is left */
let anchor: { el: HTMLElement; place: () => void } | null = null;
addEventListener('scroll', () => {
  if (anchor && anchor.el.isConnected && (anchor.el.matches(':hover') || anchor.el === document.activeElement)) anchor.place();
  else document.getElementById('pt-tip')?.classList.remove('on');
}, { passive: true, capture: true });

export async function render(ctx: Ctx): Promise<Node[]> {
  const d: Data = await ctx.api('production');
  const bySlug = new Map(d.cards.map((c) => [c.slug, c]));
  const stepLabel = new Map(d.steps.map((s) => [s.id, s.label]));
  const nameOf = (slug: string, fallback = '') => ctx.site.short[slug] || (bySlug.get(slug)?.kind === 'idea' ? bySlug.get(slug)!.title : '')
    || slug.split('-').map((w) => (w === 'ai' ? 'AI' : w[0].toUpperCase() + w.slice(1))).join(' ') || fallback;

  /* one floating tip for the whole tab: filled from a node builder, placed beside whatever it describes */
  const tip = h('div', { class: 'pt-tip', role: 'tooltip', id: 'pt-tip' });
  const show = (el: HTMLElement, build: () => Node[]) => {
    tip.replaceChildren(...build()); tip.classList.add('on');
    anchor = { el, place: () => place(el) }; place(el);
  };
  const place = (el: HTMLElement) => {
    const r = el.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 24);
    tip.style.width = `${w}px`;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const below = r.bottom + 8 + tip.offsetHeight < window.innerHeight;
    tip.style.left = `${left}px`; tip.style.top = `${below ? r.bottom + 8 : Math.max(12, r.top - tip.offsetHeight - 8)}px`;
  };
  const hide = () => { tip.classList.remove('on'); anchor = null; };
  const tipped = (el: HTMLElement, build: () => Node[]) => {
    el.setAttribute('aria-describedby', 'pt-tip');
    for (const ev of ['pointerenter', 'focus']) el.addEventListener(ev, () => show(el, build));
    for (const ev of ['pointerleave', 'blur']) el.addEventListener(ev, hide);
    el.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Escape') hide(); });
    return el;
  };
  const itemTip = (c: Item) => () => [
    h('p', { class: 'pt-tip-h' }, c.title),
    c.thesis ? h('p', { class: 'pt-tip-k' }, 'Thesis') : null, c.thesis ? h('p', {}, c.thesis) : null,
    c.titles.length ? h('p', { class: 'pt-tip-k' }, 'Title ideas') : null, c.titles.length ? h('ol', {}, ...c.titles.map((t) => h('li', {}, t))) : null,
    c.owed.length ? h('p', { class: 'pt-tip-k' }, 'Still owed') : null, c.owed.length ? h('p', {}, c.owed.join(' · ')) : null,
    !c.thesis && !c.titles.length && !c.owed.length ? h('p', { class: 'pt-tip-m' }, 'Nothing written down for this step yet.') : null,
  ].filter(Boolean) as Node[];

  const out: Node[] = [tip];

  // waiting on you
  const asks = d.decisions.map((x) => h('li', { class: 'pt-ask' },
    h('span', { class: 'pt-dot', 'aria-hidden': 'true' }),
    h('div', {},
      h('p', { class: 'pt-ask-t' }, x.text),
      h('p', { class: 'pt-ask-m' }, x.kind === 'ask' ? `${nameOf(x.slug)} · ${STAGE[x.stage] || x.stage || 'in production'} · raised ${ago(x.days)}` : `Proposal · ${x.title} · ${ago(x.days)}`))));
  out.push(grid(card({ title: `Waiting on you (${d.decisions.length})`, sub: 'Decisions only you can make, oldest first.', span: 8 },
    asks.length ? h('ol', { class: 'pt-asks' }, ...asks) : empty('Nothing waits on you.')),
  weekCard(d, nameOf)));

  // the pipeline board
  const cols = d.steps.map((s) => (d.cards.some((c) => c.step === s.id) ? 'minmax(120px, 1fr)' : 'minmax(78px, 0.5fr)')).join(' ');
  const board = h('div', { class: 'pt-board', role: 'list', 'aria-label': 'The pipeline, one column per step', style: `grid-template-columns: ${cols}` }, ...d.steps.map((s) => {
    const items = d.cards.filter((c) => c.step === s.id);
    const head = tipped(h('h3', { class: 'pt-col-h', tabindex: '0' }, s.label, h('span', {}, String(items.length))), () => [h('p', { class: 'pt-tip-k' }, 'What belongs here'), h('p', {}, s.expect)]);
    return h('section', { class: `pt-col${items.length ? '' : ' none'}`, role: 'listitem' }, head,
      ...items.map((c) => tipped(h('div', { class: `pt-card${c.ask ? ' ask' : ''}`, tabindex: '0' },
        h('p', { class: 'pt-card-t' }, c.kind === 'idea' ? c.title : nameOf(c.slug)),
        h('p', { class: 'pt-card-m' }, ...[c.where, c.tier, c.published ? `out ${dm(c.published)}` : '', c.owed.length ? `owes ${c.owed.length}` : '', c.touched != null && c.touched > 3 ? `quiet ${c.touched}d` : '', c.peg ? `peg ${c.peg}` : '']
          .filter(Boolean).join(' · ')),
        c.ask ? h('span', { class: 'pt-flag' }, 'Needs you') : null), itemTip(c))));
  }));
  const table = () => {
    const t = h('table', { class: 'tv' });
    t.createTHead().insertRow().append(...['Item', 'Step', 'Thesis', 'Title ideas', 'Owed'].map((x) => h('th', { scope: 'col' }, x)));
    const b = t.createTBody();
    for (const c of d.cards) { const r = b.insertRow(); for (const v of [c.kind === 'idea' ? c.title : nameOf(c.slug), [stepLabel.get(c.step), c.where].filter(Boolean).join(' · '), c.thesis, c.titles.join(' / '), c.owed.join(', ')]) r.insertCell().textContent = v || '–'; }
    return t;
  };
  out.push(grid(card({ title: 'The pipeline', sub: 'Hover or tab to a column for what belongs there, and to a card for its thesis and title ideas.', chart: () => ({ table, update() {}, destroy() {} }) as any },
    h('div', { class: 'pt-board-wrap tc' }, board))));

  // the release calendar
  out.push(grid(calendar(d, nameOf, bySlug, stepLabel, tipped, itemTip)));

  if (d.flags.length) out.push(h('ul', { class: 'pt-flags' }, ...d.flags.map((f) => h('li', { class: f.level }, f.text))));
  const built = new Date(d.built), hrs = Math.floor((Date.now() - built.getTime()) / 3_600_000);
  out.push(h('p', { class: 'foot' }, `Updated ${built.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
    hrs >= 24 ? `. ${Math.floor(hrs / 24)} day${hrs >= 48 ? 's' : ''} old, so it may be behind the work.` : '.', ' It refreshes each time the producer checks in.'));
  return out;
}

function weekCard(d: Data, nameOf: (s: string) => string) {
  const w = d.week;
  if (!w) return card({ title: 'This week', span: 4 }, empty('Nothing is due.', 'Greenlight a pitch to put it on the calendar.'));
  const when = `${w.projected ? 'projected for' : 'due'} ${wdm(w.due)}`;
  const word = w.status === 'ahead' ? 'Ahead' : w.status === 'on track' ? 'On track' : w.status === 'behind' ? 'Behind' : '';
  return card({ title: 'This week', sub: `The next release, against the week’s rhythm`, span: 4 },
    h('p', { class: 'pt-week-n' }, nameOf(w.slug)),
    h('p', { class: 'pt-week-m' }, when),
    word ? h('p', { class: `pt-week-s ${w.status.replace(' ', '-')}` }, h('span', { 'aria-hidden': 'true' }, w.status === 'behind' ? '▼ ' : w.status === 'ahead' ? '▲ ' : '● '), word) : null,
    w.says ? h('p', { class: 'pt-week-x' }, `${w.weekend ? 'By Monday' : 'By today'} it should have ${w.says}.`) : null);
}

function calendar(d: Data, nameOf: (s: string) => string, bySlug: Map<string, Item>, stepLabel: Map<string, string>,
  tipped: (el: HTMLElement, b: () => Node[]) => HTMLElement, itemTip: (c: Item) => () => Node[]) {
  const byDay = new Map<string, Release[]>();
  for (const r of d.releases) byDay.set(r.date, [...(byDay.get(r.date) ?? []), r]);
  const KIND = { published: 'Published', window: 'Date set', projected: 'Projected' };
  const days: Node[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => h('div', { class: 'pt-cal-wd', 'aria-hidden': 'true' }, x));
  for (let day = d.from; day <= d.until; day = plusDays(day, 1)) {
    const rs = byDay.get(day) ?? [], first = day === d.from || day.endsWith('-01');
    days.push(h('div', { class: `pt-cal-d${day === d.today ? ' today' : ''}${day < d.today ? ' past' : ''}${rs.length ? ' has' : ''}` },
      h('p', { class: 'pt-cal-n' }, h('span', { class: 'wide' }, first ? dm(day) : String(+day.slice(8))), h('span', { class: 'narrow' }, wdm(day)), day === d.today ? h('b', {}, 'Today') : null),
      ...rs.map((r) => {
        const c = bySlug.get(r.slug);
        const el = h('div', { class: `pt-rel ${r.kind}`, tabindex: '0' }, h('span', { class: 'pt-rel-t' }, nameOf(r.slug)), h('span', { class: 'pt-rel-k' }, KIND[r.kind]));
        return c ? tipped(el, () => [h('p', { class: 'pt-tip-m' }, `${KIND[r.kind]} · ${wdm(r.date)} · ${[stepLabel.get(c.step), c.where].filter(Boolean).join(' · ')}`), ...itemTip(c)()]) : el;
      })));
  }
  return card({ title: 'Releases', sub: `Six weeks from this Monday. Dashed dates are projected: one release a Friday, the video furthest along first. A set date replaces them.` },
    h('ul', { class: 'pt-legend' }, ...(['published', 'window', 'projected'] as const).map((k) => h('li', {}, h('i', { class: `pt-rel ${k}`, 'aria-hidden': 'true' }), KIND[k]))),
    h('div', { class: 'pt-cal' }, ...days),
    d.releases.length ? null : note('No releases yet in these six weeks.'));
}
