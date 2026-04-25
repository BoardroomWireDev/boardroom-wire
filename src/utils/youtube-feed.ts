// Build-time fetcher for the public YouTube channel RSS feed.
// No API key required. Fetches happen during `astro build` / `astro dev`.
// Falls back to an empty array on any failure so the build never breaks.

export type YouTubeVideo = {
  id: string;
  title: string;
  publishedAt: string; // ISO 8601
  thumbnail: string;
};

const CACHED_CHANNEL_ID = 'UCthfphsDjHppg9SQv3JTdrg'; // @BoardroomWire — verified 2026-04-25

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));

async function resolveChannelId(input: string): Promise<string | null> {
  // Already a channel ID
  if (/^UC[\w-]{20,}$/.test(input)) return input;

  // channel/UC... URL
  const direct = input.match(/channel\/(UC[\w-]+)/);
  if (direct) return direct[1];

  // @handle URL or bare @handle — fetch the page and extract externalId.
  const handle = input.match(/@([\w.-]+)/)?.[1];
  if (!handle) return null;

  const res = await fetch(`https://www.youtube.com/@${handle}`, {
    headers: {
      // Some YouTube responses gate on UA; pass a realistic one.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();
  return (
    html.match(/"externalId":"(UC[\w-]+)"/)?.[1] ??
    html.match(/"browseId":"(UC[\w-]+)"/)?.[1] ??
    html.match(/channel\/(UC[\w-]+)/)?.[1] ??
    null
  );
}

async function fetchFeed(channelId: string): Promise<YouTubeVideo[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];

  return entries
    .map((entry) => {
      const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? '';
      const titleRaw = entry.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
      const publishedAt =
        entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? '';
      return {
        id,
        title: decodeEntities(titleRaw),
        publishedAt,
        thumbnail: thumbnailUrl(id),
      };
    })
    .filter((v): v is YouTubeVideo => Boolean(v.id));
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

/**
 * Fetch the latest videos from a YouTube channel.
 * Accepts a @handle URL, channel/UC... URL, bare @handle, or bare UC... ID.
 * Returns [] on any failure (offline, channel removed, parse failure).
 */
export async function fetchLatestVideos(
  channelInput: string = CACHED_CHANNEL_ID,
): Promise<YouTubeVideo[]> {
  try {
    const channelId =
      (await resolveChannelId(channelInput)) ?? CACHED_CHANNEL_ID;
    return await fetchFeed(channelId);
  } catch (err) {
    console.warn('[youtube-feed] fetch failed, returning empty list:', err);
    return [];
  }
}
