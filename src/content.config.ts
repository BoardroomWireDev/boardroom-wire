/**
 * Content collections.
 *
 * `articles` — the long-form pieces published under /wire/. One MDX file per
 * article in src/content/articles/. Inside the body, a dashboard is embedded
 * with `<DashboardEmbed collection="cursor" slug="where-the-dollar-goes" />`
 * — the component is passed to the MDX renderer by the article page, so no
 * import line is needed in the file.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    /** One-sentence standfirst. Also the meta description and the RSS summary. */
    dek: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Eyebrow above the headline. */
    kicker: z.string().default('Investigation'),
    /** YouTube video id (11 chars). Omit until the video is live. */
    youtube: z.string().optional(),
    /** Slug of the analytics collection whose dashboards this article embeds. */
    collection: z.string().optional(),
    /** Hero / OG image: a dashboard in `collection`, or an image path. */
    hero: z.union([
      z.object({ dashboard: z.string() }),
      z.object({ image: z.string(), alt: z.string() }),
    ]),
    tags: z.array(z.string()).default([]),
    /** Drafts build locally and on previews but are hidden from the production index, feed and sitemap. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
