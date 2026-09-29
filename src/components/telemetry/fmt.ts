/** Formatting shared by every Wire Telemetry view. Numbers compact the same way everywhere. */

export const num = (v: unknown): string => {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e4) return Math.round(n / 1e3) + 'K';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
};
export const full = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? '–' : Math.round(Number(v)).toLocaleString('en-GB'));
export const signed = (v: unknown) => (v == null || !Number.isFinite(Number(v)) ? '–' : (Number(v) > 0 ? '+' : '') + num(v));
export const pct = (v: unknown, digits = 0) => (v == null || !Number.isFinite(Number(v)) ? '–' : Number(v).toFixed(digits) + '%');
export const hours = (minutes: unknown) => (minutes == null ? '–' : num(Number(minutes) / 60));
export const dur = (ms: unknown) => {
  const m = Number(ms);
  if (!m) return '–';
  const s = Math.round(m / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};
export const per1k = (a: unknown, b: unknown) => (Number(b) > 0 ? ((1000 * Number(a || 0)) / Number(b)).toFixed(1) : '–');

const regions = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
export const country = (c: string | null | undefined) => (c && regions ? regions.of(c) ?? c : c) || 'Unknown';

const D = (day: string) => new Date(day.length > 10 ? day.slice(0, 13) + ':00:00Z' : day + 'T00:00:00Z');
export const dayShort = (day: string) => (day.length > 10 ? day.slice(11, 13) + ':00' : D(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
export const dayLong = (day: string) => (day.length > 10
  ? D(day).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  : D(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }));
export const dayYear = (day: string) => D(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Delta against the previous period: { text, dir } where dir is up / down / flat. */
export function delta(cur: unknown, prev: unknown): { text: string; dir: 'up' | 'down' | 'flat' } | null {
  const c = Number(cur || 0), p = Number(prev || 0);
  if (!Number.isFinite(c) || !Number.isFinite(p) || prev == null) return null;
  if (p === 0) return c === 0 ? { text: 'no change', dir: 'flat' } : { text: 'new', dir: 'up' };
  const ch = ((c - p) / Math.abs(p)) * 100;
  if (Math.abs(ch) < 0.5) return { text: '0%', dir: 'flat' };
  return { text: `${ch > 0 ? '+' : '−'}${Math.abs(ch) >= 10 ? Math.round(Math.abs(ch)) : Math.abs(ch).toFixed(1)}%`, dir: ch > 0 ? 'up' : 'down' };
}

/** Change of a rate in percentage points, e.g. 27% → 24.4% is −2.6 pts. */
export function deltaPts(cur: unknown, prev: unknown): { text: string; dir: 'up' | 'down' | 'flat' } | null {
  if (cur == null || prev == null || !Number.isFinite(Number(cur)) || !Number.isFinite(Number(prev))) return null;
  const d = Number(cur) - Number(prev);
  if (Math.abs(d) < 0.05) return { text: '0 pts', dir: 'flat' };
  return { text: `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts`, dir: d > 0 ? 'up' : 'down' };
}

export const YT_SOURCE: Record<string, string> = {
  SUBSCRIBER: 'Home and subscription feeds', YT_SEARCH: 'YouTube search', RELATED_VIDEO: 'Suggested videos', EXT_URL: 'Other sites and apps',
  NO_LINK_OTHER: 'Direct or unknown', NOTIFICATION: 'Notifications', PLAYLIST: 'Playlists', YT_PLAYLIST_PAGE: 'Playlist pages', YT_CHANNEL: 'Channel page',
  YT_OTHER_PAGE: 'Other YouTube pages', END_SCREEN: 'End screens', SHORTS: 'Shorts feed', HASHTAGS: 'Hashtags', ANNOTATION: 'Cards',
  CAMPAIGN_CARD: 'Campaign cards', ADVERTISING: 'Ads', NO_LINK_EMBEDDED: 'Embedded players', SOUND_PAGE: 'Sound pages', LIVE_REDIRECT: 'Live redirects',
  VIDEO_REMIXES: 'Remixes', PRODUCT_PAGE: 'Product pages', SHORTS_CONTENT_LINKS: 'Links in Shorts',
};
export const WEB_SOURCE: Record<string, string> = {
  youtube: 'YouTube', x: 'X', substack: 'Substack', google: 'Google', bing: 'Bing', duckduckgo: 'DuckDuckGo', linkedin: 'LinkedIn',
  reddit: 'Reddit', 'hacker-news': 'Hacker News', meta: 'Facebook / Instagram', 'ai-assistant': 'AI assistants', direct: 'Direct or unknown', other: 'Other sites',
};
export const NET: Record<string, string> = { isp: 'Home and mobile internet', hosting: 'Data centres and VPNs', org: 'Organisations', unknown: 'Unknown' };
