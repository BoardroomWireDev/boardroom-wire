import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const CATEGORIES = [
  'business-of-ai',
  'private-markets',
  'titan-strategy',
  'market-dynamics',
] as const;

const baseSchema = z.object({
  title: z.string(),
  dek: z.string(),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).default([]),
  publishDate: z.coerce.date(),
  draft: z.boolean().default(false),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: ({ image }) =>
    baseSchema.extend({
      image: image().optional(),
      readTime: z.number().int().positive().optional(),
    }),
});

const videos = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/videos' }),
  schema: baseSchema.extend({
    youtubeId: z.string(),
    runtime: z.string().regex(/^\d{1,2}:\d{2}$/, 'use mm:ss or hh:mm format'),
    keyTakeaways: z.array(z.string()).optional(),
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: ({ image }) =>
    baseSchema.extend({
      dashboards: z
        .array(
          z.object({
            title: z.string(),
            image: image().optional(),
            embedUrl: z.string().url().optional(),
          }),
        )
        .optional(),
    }),
});

export const collections = { articles, videos, research };
