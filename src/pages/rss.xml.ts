import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const items = (await getCollection('articles', (a) => !a.data.draft))
    .sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
  return rss({
    title: 'Boardroom Wire',
    description: 'Strategic analysis of business and technology: filing-first investigations of the companies shaping AI and finance.',
    site: context.site!,
    items: items.map((a) => ({
      title: a.data.title,
      description: a.data.dek,
      pubDate: a.data.published,
      link: `/wire/${a.id}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
