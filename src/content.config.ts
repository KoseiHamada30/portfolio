// Content model — CLAUDE.md "Content model (frontmatter)".
// Fields we don't have real content for yet are optional; components show a TODO label
// instead of inventing anything (CLAUDE.md "Ask, don't assume").
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const localized = z.object({ en: z.string(), ja: z.string() });
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      tier: z.literal('spotlight'),
      subtitle: localized.optional(),
      category: localized.optional(),
      year: z.number().optional(),
      role: localized.optional(),
      team: z.array(z.string()).optional(),
      duration: localized.optional(),
      tools: z.array(z.string()).default([]),
      accent: hex,
      cover: image().optional(),
      coverAlt: localized.optional(),
      /** CSS object-position for tight crops (4:5 on phones), e.g. 'left center'. */
      coverPosition: z.string().optional(),
      /** object-position for the tall stage-slider crop (DESIGN.md §8); falls back to coverPosition. */
      stagePosition: z.string().optional(),
      coverVideo: z.string().optional(),
      summary: localized.optional(),
      /** Case-study hero image (defaults to the cover), e.g. v1's project hero. */
      hero: image().optional(),
      /** Japanese version of the hero, when v1 swapped it by language. */
      heroJa: image().optional(),
      heroAlt: localized.optional(),
      /** True once the MDX body is a real case study (CaseStudyLayout); otherwise the placeholder page. */
      caseStudy: z.boolean().default(false),
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
      subtitle: localized.optional(),
      category: localized.optional(),
      tag: localized,
      year: z.number().optional(),
      role: localized.optional(),
      accent: hex,
      cover: image().optional(),
      coverAlt: localized.optional(),
      /** object-position for the tall stage-slider crop (DESIGN.md §8). */
      stagePosition: z.string().optional(),
      summary: localized.optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, sidequests };
