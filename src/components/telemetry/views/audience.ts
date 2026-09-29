/**
 * Audience: who watches the channel and how they find it (YouTube Analytics). Day-level breakdowns follow the date range
 * exactly; countries, age and gender, search terms, external sites, suggesting videos and sharing only exist per calendar
 * month, so they cover the months the range touches (said on each card).
 */
import { COLORS, type Ctx } from '../ctx';
import { YT_SOURCE, country, hours, num } from '../fmt';
import { barList, card, empty, grid, h, kpis, note } from '../ui';

const LOCATION: Record<string, string> = {
  BROWSE: 'Home and browse', CHANNEL: 'Channel page', EMBEDDED: 'Embedded on other sites', EXTERNAL_APP: 'Other apps', MOBILE: 'YouTube mobile',
  SEARCH: 'Search results', WATCH: 'Watch page', YT_OTHER: 'Other YouTube pages', SHORTS_FEED: 'Shorts feed', SHORTS_CONTENT_LINKS: 'Links in Shorts',
};
const SHARE: Record<string, string> = {
  COPY_PASTE: 'Copied link', TEXT_MESSAGE: 'Text message', WHATS_APP: 'WhatsApp', WHATS_APP_BUSINESS: 'WhatsApp Business', MAIL: 'Email', GMAIL: 'Gmail',
  DIRECT_SYSTEM_ACTIVITY_DIALOG: 'Phone share sheet', FACEBOOK_MESSENGER: 'Messenger', TWITTER: 'X', SHARE_TO_SNAPCHAT_CAMERA: 'Snapchat', EMBED: 'Embed code',
  LINKEDIN: 'LinkedIn', GOOGLE_KEEP: 'Google Keep', SAMSUNG_MESSAGES: 'Samsung Messages', SAMSUNG_NOTES: 'Samsung Notes', KAKAO: 'KakaoTalk',
};
const DEVICE: Record<string, string> = { MOBILE: 'Phones', TV: 'TVs', DESKTOP: 'Computers', TABLET: 'Tablets', GAME_CONSOLE: 'Game consoles', UNKNOWN_PLATFORM: 'Unknown' };
const OS: Record<string, string> = {
  ANDROID: 'Android', IOS: 'iOS', WINDOWS: 'Windows', MACINTOSH: 'macOS', SMART_TV: 'Smart TVs', ROKUOS: 'Roku', AMAZON_FIREOS: 'Fire TV', WEBOS: 'LG webOS',
  APPLE_TVOS: 'Apple TV', PLAYSTATION: 'PlayStation', XBOX: 'Xbox', VIDAA: 'Hisense Vidaa', LINUX: 'Linux', CHROME_OS: 'ChromeOS', CHROMECAST: 'Chromecast',
  NINTENDO_SWITCH: 'Nintendo Switch', TIZEN: 'Samsung Tizen', HIPTOP: 'Hiptop',
};
// external "sites" that are really Android apps, reported by package name
const APP: Record<string, string> = {
  'com.google.android.apps.messaging': 'Google Messages', 'com.sec.android.app.launcher': 'Samsung home screen', 'linkedin.android': 'LinkedIn app',
  'com.samsung.android.messaging': 'Samsung Messages', 'com.yahoo.mobile.client.android.mail': 'Yahoo Mail app', 'com.microsoft.office.outlook': 'Outlook app',
  'org.mozilla.firefox': 'Firefox', 'org.thoughtcrime.securesms': 'Signal', 'thoughtcrime.securesms': 'Signal', 'reddit.frontpage': 'Reddit app',
  'facebook.messenger': 'Messenger', 'com.Slack': 'Slack', 'android.gm': 'Gmail app', 'skype.teams': 'Microsoft Teams', 'com.textra': 'Textra',
};
const title = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const AGE = (a: string) => a.replace(/^age/, '').replace(/-$/, '+').replace('-', '–');
const GENDER: Record<string, string> = { female: 'Women', male: 'Men', genderUserSpecified: 'Self-described' };
const monthName = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export async function render(ctx: Ctx): Promise<Node[]> {
  if (!ctx.meta.sources.yt_from) return [note('YouTube isn’t connected yet.', 'warn')];
  const d = await ctx.api('audience');
  const D = d.daily ?? {}, M = d.monthly ?? {};
  const out: Node[] = [];
  if (!Object.keys(D).length && !Object.keys(M).length) return [note('No audience data for this range yet. It covers the channel from its first upload; the nightly pull keeps it current.')];
  const monthsLabel = d.months ? (d.months.from === d.months.to ? monthName(d.months.from) : `${monthName(d.months.from)} – ${monthName(d.months.to)}`) : '–';
  const sum = (rows: any[] = [], f = (r: any) => Number(r.views) || 0) => rows.reduce((a, r) => a + f(r), 0);
  const share = (rows: any[] = [], pred: (r: any) => boolean) => { const t = sum(rows); return t ? sum(rows.filter(pred)) / t : null; };
  const pct = (v: number | null) => (v == null ? '–' : `${Math.round(v * 100)}%`);

  const subs = D.subscribed ?? [], src = D.source ?? [], dev = D.device ?? [], loc = D.location ?? [];
  const topCountry = (M.country ?? [])[0];
  out.push(kpis([
    { label: 'Views from subscribers', value: pct(share(subs, (r) => r.value === 'SUBSCRIBED')), sub: 'the rest are new or occasional viewers', hero: true },
    { label: 'Watched on phones', value: pct(share(dev, (r) => r.value === 'MOBILE')), sub: `${pct(share(dev, (r) => r.value === 'TV'))} on TVs` },
    { label: src.length ? `From ${(YT_SOURCE[src[0].value] ?? title(src[0].value)).toLowerCase()}` : 'Top traffic source', value: pct(share(src, (r) => r === src[0])), sub: 'the biggest traffic source' },
    { label: 'From YouTube search', value: pct(share(src, (r) => r.value === 'YT_SEARCH')), sub: 'of views' },
    { label: topCountry ? `Views from ${country(topCountry.value)}` : 'Top country', value: topCountry ? pct(topCountry.views / Math.max(1, sum(M.country))) : '–', sub: `the top country · ${monthsLabel}` },
    { label: 'Played on other sites', value: num(sum(loc.filter((r: any) => r.value === 'EMBEDDED'))), sub: 'embedded players, your site included' },
  ], false));

  const views = (r: any) => Number(r.views) || 0;
  out.push(grid(
    card({ title: 'How viewers found the channel', sub: 'Traffic sources, in YouTube Studio’s terms', span: 7 },
      barList(src.slice(0, 12), (r: any) => YT_SOURCE[r.value] ?? title(r.value), views, num, COLORS.yt)),
    card({ title: 'Countries', sub: monthsLabel, span: 5 }, barList((M.country ?? []).slice(0, 12), (r: any) => country(r.value), views, num, COLORS.yt))));

  const subRow = (v: string, label: string) => { const r = subs.find((x: any) => x.value === v); return r ? { label, views: r.views, minutes: r.minutes } : null; };
  const subRows = [subRow('SUBSCRIBED', 'Subscribers'), subRow('UNSUBSCRIBED', 'Not subscribed')].filter(Boolean) as any[];
  out.push(grid(
    card({ title: 'Where they watched', sub: 'Playback locations', span: 4 },
      barList(loc, (r: any) => LOCATION[r.value] ?? title(r.value), views, num, COLORS.yt)),
    card({ title: 'Devices', span: 4 }, barList(dev, (r: any) => DEVICE[r.value] ?? title(r.value), views, num, COLORS.yt)),
    card({ title: 'Subscribers against not', sub: 'Views, and minutes watched per view', span: 4 }, subRows.length ? h('div', {},
      barList(subRows, (r: any) => r.label, views, num, COLORS.yt),
      h('p', { class: 'kpi-sub', style: 'margin-top:12px' }, ...subRows.map((r) => `${r.label}: ${(r.minutes / Math.max(1, r.views)).toFixed(1)} min a view. `))) : empty('No data.'))));

  // monthly breakdowns
  const ages = new Map<string, number>(), genders = new Map<string, number>();
  for (const r of M.demo ?? []) { const [a, g] = String(r.value).split('|'); ages.set(a, (ages.get(a) ?? 0) + r.pct); genders.set(g, (genders.get(g) ?? 0) + r.pct); }
  const ageRows = [...ages].map(([k, v]) => ({ k, v })).sort((a, b) => a.k.localeCompare(b.k));
  const genderRows = [...genders].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const p1 = (v: number) => `${v.toFixed(1)}%`;
  out.push(grid(
    card({ title: 'Operating systems', span: 4 }, barList((D.os ?? []).slice(0, 8), (r: any) => OS[r.value] ?? title(r.value), views, num, COLORS.yt)),
    card({ title: 'Age and gender', sub: `Signed-in viewers · ${monthsLabel}`, span: 8 }, ageRows.length ? h('div', { class: 'two-col' },
      h('div', {}, h('h4', {}, 'Age'), barList(ageRows, (r: any) => AGE(r.k), (r: any) => r.v, p1, COLORS.yt)),
      h('div', {}, h('h4', {}, 'Gender'), barList(genderRows, (r: any) => GENDER[r.k] ?? r.k, (r: any) => r.v, p1, COLORS.yt))) : empty('YouTube needs enough signed-in viewers to report this.'))));
  out.push(grid(
    card({ title: 'Searches that found the channel', sub: `Top 25 each month · ${monthsLabel}`, span: 6 }, barList((M.search ?? []).slice(0, 15), (r: any) => r.value, views, num, COLORS.yt)),
    card({ title: 'External sites and apps', sub: `Top 25 each month · ${monthsLabel}`, span: 6 }, barList((M.ext ?? []).slice(0, 15), (r: any) => APP[r.value] ?? r.value, views, num, COLORS.yt))));
  out.push(grid(
    card({ title: 'Videos that suggested yours', sub: `“Suggested videos” traffic, top 25 each month · ${monthsLabel}`, span: 8 },
      barList((M.related ?? []).slice(0, 15), (r: any) => (r.label || r.value).trim(), views, num, COLORS.yt)),
    card({ title: 'Shares', sub: monthsLabel, span: 4 }, barList((M.sharing ?? []).slice(0, 10), (r: any) => SHARE[r.value] ?? title(r.value), views, num, COLORS.yt))));
  const cards = D.card ?? [];
  if (cards.length) out.push(grid(card({ title: 'Cards', sub: 'Info-card teasers and clicks' }, barList(cards, (r: any) => title(r.value), views, num, COLORS.yt))));
  out.push(h('p', { class: 'foot' }, `From the YouTube Analytics API, read nightly. Sources, playback locations, devices, systems and subscribers follow the date range exactly. Countries, age and gender, searches, external sites, suggesting videos and shares only exist for whole months, so they cover ${monthsLabel}. Watch time in this view: ${hours(sum(src, (r: any) => Number(r.minutes) || 0))} hours.`));
  return out;
}
