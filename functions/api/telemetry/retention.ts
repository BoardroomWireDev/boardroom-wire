/**
 * GET /api/telemetry/retention[?video=ID&compare=ID] — audience retention (db/migrations/0006, yt_retention): every
 * video's lifetime curve summarised (who is still watching at 0:30, 1:00, halfway and the end; how it compares with
 * similar videos; its steepest drop and the chapter it falls in), plus the full curves for the selected video and an
 * optional comparison. Chapters come from the video's description. Locked behind Cloudflare Access.
 */
import type { Env } from '../../../server/env';
import { allowed, locked } from '../../../server/access';
import { noStore } from '../../../server/range';

interface Pt { ratio: number; watch: number | null; relative: number | null; started: number | null; stopped: number | null }

function summarise(pts: Pt[], duration: number | null, chapters: [number, string][] | null) {
  const at = (r: number) => { let best = pts[0]; for (const p of pts) if (Math.abs(p.ratio - r) < Math.abs(best.ratio - r)) best = p; return best?.watch ?? null; };
  const secs = (s: number) => (duration ? Math.min(1, s / duration) : null);
  const rel = pts.map((p) => p.relative).filter((v): v is number => v != null);
  // steepest fall between neighbouring points, past the opening 3% and before the last 2% (every video loses people
  // at both: the click-away and the end screen)
  let drop = { ratio: 0, fall: 0 };
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].ratio <= 0.03 || pts[i].ratio > 0.98 || pts[i].watch == null || pts[i - 1].watch == null) continue;
    const f = (pts[i - 1].watch as number) - (pts[i].watch as number);
    if (f > drop.fall) drop = { ratio: pts[i].ratio, fall: f };
  }
  const chapterAt = (r: number) => (chapters && duration ? [...chapters].reverse().find(([s]) => s <= r * duration)?.[1] ?? null : null);
  return {
    points: pts.length,
    at30: secs(30) != null ? at(secs(30)!) : null, at60: secs(60) != null ? at(secs(60)!) : null,
    half: at(0.5), end: at(1), mean: pts.length ? pts.reduce((a, p) => a + (p.watch ?? 0), 0) / pts.length : null,
    relative: rel.length ? rel.reduce((a, b) => a + b, 0) / rel.length : null,
    drop: drop.fall > 0 ? { ratio: drop.ratio, fall: drop.fall, seconds: duration ? Math.round(drop.ratio * duration) : null, chapter: chapterAt(drop.ratio) } : null,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await allowed(request, env))) return locked();
  if (!env.DB) return Response.json({ error: 'no-database' }, { status: 503 });
  const url = new URL(request.url);
  const [vids, pts, done] = await env.DB.batch([
    env.DB.prepare(`SELECT v.youtube_id, v.title, v.slug, v.short, v.published, v.duration_s, v.chapters,
        (SELECT SUM(views) FROM youtube_daily d WHERE d.youtube_id = v.youtube_id) views
      FROM videos v WHERE EXISTS (SELECT 1 FROM yt_retention r WHERE r.youtube_id = v.youtube_id) ORDER BY v.published DESC`),
    env.DB.prepare(`SELECT youtube_id, ratio, watch, relative, started, stopped FROM yt_retention ORDER BY youtube_id, ratio`),
    env.DB.prepare(`SELECT MAX(fetched_at) at FROM yt_deep_done WHERE item LIKE 'video:%'`),
  ]);
  const by = new Map<string, Pt[]>();
  for (const p of pts.results as any[]) (by.get(p.youtube_id) ?? by.set(p.youtube_id, []).get(p.youtube_id)!).push(p);
  const videos = (vids.results as any[]).map((v) => {
    const chapters = v.chapters ? (JSON.parse(v.chapters) as [number, string][]) : null;
    return { ...v, chapters, ...summarise(by.get(v.youtube_id) ?? [], v.duration_s, chapters) };
  });
  const pick = (id: string | null) => (id && by.has(id) ? { id, points: by.get(id) } : null);
  const first = videos.find((v) => !v.short && v.points >= 50) ?? videos[0];
  return Response.json({
    videos, selected: pick(url.searchParams.get('video')) ?? pick(first?.youtube_id ?? null), compare: pick(url.searchParams.get('compare')),
    refreshed: (done.results[0] as any)?.at ?? null,
  }, { headers: noStore });
};
