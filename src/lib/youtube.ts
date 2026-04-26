// Shared YouTube data fetcher used by both the ticker and the reel.
//
// Fetches everything in 3 parallel API calls (channel stats + uploads
// playlist + per-video stats), computes derived metrics (top video,
// newest), and caches the result in localStorage for 5 minutes so
// reloads don't burn quota. ~3 quota units per fresh fetch.
//
// `import.meta.env.PUBLIC_YOUTUBE_API_KEY` is replaced at build time
// by Vite — no runtime env-var access needed.

const API_KEY = (import.meta as any).env?.PUBLIC_YOUTUBE_API_KEY ?? '';
const CHANNEL_ID = 'UCthfphsDjHppg9SQv3JTdrg';
const UPLOADS = CHANNEL_ID.replace(/^UC/, 'UU');

const CACHE_KEY = 'bw-channel-data-v3';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export type ReelVideo = {
  id: string;
  title: string;
  thumbnail: string;
};

export type ChannelData = {
  videos: number;
  subs: number;
  views: number;
  topVideo: { id: string; title: string; views: number } | null;
  newest: { id: string; title: string; publishedAt: string } | null;
  reel: ReelVideo[]; // up to 15 latest videos for the homepage carousel
};

const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

// Always use mqdefault — 320×180, true 16:9, available for every YouTube
// video (no fallback chain). Using maxres+letterboxed-fallback meant cards
// had inconsistent visible aspect ratios. mqdefault is plenty of resolution
// for the small reel cards.
const pickThumb = (_thumbnails: any, id: string): string =>
  `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

function loadCache(): ChannelData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data as ChannelData;
  } catch {
    return null;
  }
}

function saveCache(data: ChannelData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage full or disabled — non-fatal
  }
}

async function fetchChannelStats(): Promise<{ videos: number; subs: number; views: number }> {
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${CHANNEL_ID}&key=${API_KEY}`,
  );
  if (!r.ok) throw new Error(`channels HTTP ${r.status}`);
  const data = await r.json();
  const s = data.items?.[0]?.statistics;
  if (!s) throw new Error('No channel stats');
  return {
    videos: Number(s.videoCount || 0),
    subs: Number(s.subscriberCount || 0),
    views: Number(s.viewCount || 0),
  };
}

async function fetchVideoData(): Promise<{
  topVideo: ChannelData['topVideo'];
  newest: ChannelData['newest'];
  reel: ReelVideo[];
}> {
  // 1. List uploads (newest first, max 50)
  const plRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${UPLOADS}&maxResults=50&key=${API_KEY}`,
  );
  if (!plRes.ok) throw new Error(`playlistItems HTTP ${plRes.status}`);
  const plData = await plRes.json();
  const items: any[] = plData.items ?? [];
  if (!items.length) return { topVideo: null, newest: null, reel: [] };

  // Newest = first entry in uploads playlist
  const first = items[0];
  const newestId = first.snippet?.resourceId?.videoId;
  const newest =
    newestId
      ? {
          id: newestId,
          title: decode(first.snippet?.title ?? ''),
          publishedAt: first.snippet?.publishedAt ?? '',
        }
      : null;

  // Reel = latest 15 with thumbnails
  const reel: ReelVideo[] = items.slice(0, 15).map((it) => {
    const id = it.snippet?.resourceId?.videoId ?? '';
    return {
      id,
      title: decode(it.snippet?.title ?? ''),
      thumbnail: pickThumb(it.snippet?.thumbnails, id),
    };
  });

  // 2. Get view counts for all returned videos to find the top one
  const ids = items.map((i) => i.snippet?.resourceId?.videoId).filter(Boolean);
  const vRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(',')}&key=${API_KEY}`,
  );
  if (!vRes.ok) throw new Error(`videos HTTP ${vRes.status}`);
  const vData = await vRes.json();

  let topVideo: ChannelData['topVideo'] = null;
  let topViews = -1;
  for (const v of vData.items ?? []) {
    const views = Number(v.statistics?.viewCount || 0);
    if (views > topViews) {
      topViews = views;
      topVideo = {
        id: v.id,
        title: decode(v.snippet?.title ?? ''),
        views,
      };
    }
  }

  return { topVideo, newest, reel };
}

/**
 * Fetch channel-wide YouTube data. Returns null if no API key is set
 * or any underlying request fails. Result is cached in localStorage
 * for 5 minutes.
 */
export async function fetchChannelData(): Promise<ChannelData | null> {
  if (!API_KEY) return null;
  const cached = loadCache();
  if (cached) return cached;
  try {
    const [channel, video] = await Promise.all([fetchChannelStats(), fetchVideoData()]);
    const data: ChannelData = { ...channel, ...video };
    saveCache(data);
    return data;
  } catch (err) {
    console.warn('[youtube] fetch failed:', err);
    return null;
  }
}

export const fmt = (n: number | string): string => {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
};

export function daysAgo(iso: string): string {
  if (!iso) return '—';
  const d = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (d < 1) return 'today';
  if (d < 2) return '1 day ago';
  if (d < 30) return `${Math.floor(d)} days ago`;
  if (d < 90) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 730) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}
