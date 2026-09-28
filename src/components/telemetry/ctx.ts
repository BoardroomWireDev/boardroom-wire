/** What every view gets from the app shell. */
import type { RangeState } from './dates';

export interface Meta {
  sources: { web_from: string | null; yt_from: string | null; yt_to: string | null; cf_from: string | null; cf_pages_from: string | null; videos: number };
  jobs: { job: string; last_ok: number | null; last_ts: number; last_flag: number; last_detail: string }[];
}
export interface SiteData {
  articles: { slug: string; title: string; video: string | null; youtube: string | null }[];
  short: Record<string, string>;        // video slug → short name
  dash: Record<string, string>;         // dashboard path → title
}
export interface Ctx {
  range: RangeState;
  showDelta: boolean;                   // off for "All time"
  meta: Meta;
  site: SiteData;
  api: (name: string, extra?: Record<string, string>) => Promise<any>;
  pref: <T>(key: string, fallback: T) => T;      // per-viewer UI memory (segmented choices)
  setPref: (key: string, v: unknown) => void;
  onLive: (fn: (l: { readers: number; points: any[] }) => void) => void;
  go: (view: string) => void;
}

export const COLORS = { yt: '#AD8C29', web: '#3987e5', context: '#5c5a55' };   // validated pair (dataviz validator, dark, all pairs)

export function titles(site: SiteData) {
  const byVideo = new Map(site.articles.filter((a) => a.video).map((a) => [a.video!, a]));
  const byArticle = new Map(site.articles.map((a) => [a.slug, a]));
  const PAGE: Record<string, string> = { '/': 'Home', '/videos/': 'Videos', '/about/': 'About', '/wire/': 'The Wire', '/analytics/': 'Analytics', '/privacy/': 'Privacy' };
  const titleOf = (video?: string | null, article?: string | null) => (video && byVideo.get(video)?.title) || (article && byArticle.get(article)?.title) || video || article || '';
  const shortOf = (k: string) => site.short[k] || (byArticle.get(k)?.video && site.short[byArticle.get(k)!.video!]) || PAGE[k] || k;
  const labelOf = (path: string, video?: string | null, article?: string | null) => PAGE[path] || site.dash[path] || titleOf(video, article) || path;
  return { titleOf, shortOf, labelOf };
}
