// Shared content queries.
import { getCollection } from 'astro:content';
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
