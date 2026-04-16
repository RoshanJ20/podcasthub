/**
 * Orphan blob sweep logic for Azure Blob Storage.
 *
 * Key responsibilities:
 * - Collect all storage keys referenced by database records across AuditBrief,
 *   LearningGraph, and Episode models.
 * - Compare blob storage contents against referenced keys to find orphans.
 * - Used by the POST /api/admin/blob-sweep endpoint.
 *
 * Dependencies:
 * - lib/db (Prisma client)
 * - lib/storage-cleanup (toKey normalizer)
 */
import { prisma } from '@/lib/db';
import { toKey } from '@/lib/storage-cleanup';

/**
 * Queries all three models that store blob references and returns every
 * referenced storage key as a deduplicated Set.
 *
 * All records are included (active + archived) because archived content
 * still owns its blobs. Absolute URLs and nulls are filtered out via toKey().
 *
 * @returns Set of bare storage keys referenced by at least one DB record
 */
export async function collectAllReferencedKeys(): Promise<Set<string>> {
  const keys = new Set<string>();

  const addKey = (value: string | null | undefined): void => {
    const key = toKey(value);
    if (key) keys.add(key);
  };

  // AuditBrief: thumbnailUrl, audioShortUrl, audioLongUrl, bulletinUrls
  const auditBriefs = await prisma.auditBrief.findMany({
    select: {
      thumbnailUrl: true,
      audioShortUrl: true,
      audioLongUrl: true,
      bulletinUrls: true,
    },
  });

  for (const brief of auditBriefs) {
    addKey(brief.thumbnailUrl);
    addKey(brief.audioShortUrl);
    addKey(brief.audioLongUrl);
    for (const url of brief.bulletinUrls) {
      addKey(url);
    }
  }

  // LearningGraph: thumbnailUrl only
  const learningGraphs = await prisma.learningGraph.findMany({
    select: { thumbnailUrl: true },
  });

  for (const graph of learningGraphs) {
    addKey(graph.thumbnailUrl);
  }

  // Episode: thumbnailUrl, audioUrl
  const episodes = await prisma.episode.findMany({
    select: { thumbnailUrl: true, audioUrl: true },
  });

  for (const episode of episodes) {
    addKey(episode.thumbnailUrl);
    addKey(episode.audioUrl);
  }

  return keys;
}

/**
 * Finds blob keys that exist in storage but are not referenced by any DB record.
 *
 * @param allBlobKeys - Every blob name in the container (from listAllBlobKeys)
 * @param referencedKeys - Set of keys referenced by DB records (from collectAllReferencedKeys)
 * @returns Array of orphaned blob keys to delete
 */
export function findOrphanedKeys(allBlobKeys: string[], referencedKeys: Set<string>): string[] {
  return allBlobKeys.filter((key) => !referencedKeys.has(key));
}
