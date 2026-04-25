import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articles = (
    await getCollection('articles', ({ data }) => !data.draft)
  ).sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());

  return rss({
    title: 'Boardroom Wire',
    description: 'Forensic analysis of the companies shaping the future.',
    site: context.site,
    items: articles.map((entry) => ({
      title: entry.data.title,
      description: entry.data.dek,
      pubDate: entry.data.publishDate,
      link: `/articles/${entry.id}/`,
      categories: entry.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
}
