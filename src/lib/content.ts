// Shared content queries.
import { getCollection } from 'astro:content';
import type { ImageMetadata } from 'astro';
import type { SplashCover } from '../components/SplashComposition.astro';

/** Project covers first (in order), then side-quest covers — entries without a cover are skipped. */
export async function getSplashCovers(): Promise<SplashCover[]> {
  const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;
  const projects = (await getCollection('projects', ({ data }) => !data.draft)).sort(byOrder);
  const quests = (await getCollection('sidequests', ({ data }) => !data.draft)).sort(byOrder);
  return [...projects, ...quests].flatMap(({ id, data }) =>
    data.cover ? [{ id, src: data.cover, alt: data.coverAlt, position: 'coverPosition' in data ? data.coverPosition : undefined }] : [],
  );
}

export interface StageItem {
  id: string;
  /** Value for [data-project] (accent tokens); the NBA Lab entry uses the shorter token name. */
  accentKey: string;
  title: string;
  category?: { en: string; ja: string };
  /** Line under the title on the stage; wins over category and subtitle. */
  stageLine?: { en: string; ja: string };
  /** Shown in the stage subline when there is no category yet. */
  subtitle?: { en: string; ja: string };
  year?: number;
  sideQuest: boolean;
  cover?: ImageMetadata;
  coverAlt?: { en: string; ja: string };
  position: string;
  accent: string;
}

/** Stage slider order (DESIGN.md §8): spotlight projects, then side quests. */
export async function getStageItems(): Promise<StageItem[]> {
  const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;
  const projects = (await getCollection('projects', ({ data }) => !data.draft)).sort(byOrder);
  const quests = (await getCollection('sidequests', ({ data }) => !data.draft)).sort(byOrder);
  return [...projects, ...quests].map(({ id, data }) => ({
    id,
    accentKey: id === 'nba-research-lab' ? 'nba-lab' : id,
    title: data.title,
    category: data.category,
    stageLine: data.stageLine,
    subtitle: data.subtitle,
    year: data.year,
    sideQuest: data.tier === 'sidequest',
    cover: data.cover,
    coverAlt: data.coverAlt,
    position: data.stagePosition ?? ('coverPosition' in data ? data.coverPosition : undefined) ?? 'center',
    accent: data.accent,
  }));
}

/** v1 categories are written "(App design)"; the stage shows them as "App design". */
export function unbracket(text: string): string {
  return text.replace(/^[(（]\s*/, '').replace(/\s*[)）]$/, '');
}
