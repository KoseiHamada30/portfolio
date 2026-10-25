// Content model — CLAUDE.md "Content model (frontmatter)".
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const localized = z.object({ en: z.string(), ja: z.string() });

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      tier: z.literal('spotlight'),
      subtitle: localized,
      category: localized,
      year: z.number(),
      role: localized,
      team: localized.optional(),
      duration: localized,
      tools: z.array(z.string()),
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      cover: image(),
      coverVideo: z.string().optional(),
      summary: localized,
      draft: z.boolean().default(false),
    }),
});

const sidequests = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/sidequests' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      tier: z.literal('sidequest'),
      subtitle: localized,
      category: localized,
      year: z.number(),
      role: localized,
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      cover: image(),
      summary: localized,
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, sidequests };
