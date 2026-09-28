/**
 * /data/videos.json — the site's own map of each published video to its pipeline slug and article, built from
 * the articles' frontmatter. The collector's youtube-daily job reads it to key YouTube numbers to the same
 * `video` slug the site's page views carry (db/README.md). Public facts only.
 */
import { getCollection } from 'astro:content';

export async function GET() {
  const articles = await getCollection('articles', (a) => !a.data.draft && !!a.data.youtube);
  const rows = articles.map((a) => ({ youtube: a.data.youtube, slug: a.data.collection ?? null, article: a.id, title: a.data.title }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json' } });
}
