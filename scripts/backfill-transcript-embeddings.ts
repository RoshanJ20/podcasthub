/**
 * One-shot backfill script for transcript pgvector embeddings.
 *
 * Iterates over every transcript whose `embedding` column is NULL or older
 * than the optional cutoff date and regenerates it against the current
 * `fullText` via Azure OpenAI. Idempotent — re-running simply re-encodes
 * whatever still meets the criteria.
 *
 * Usage:
 *   npx tsx scripts/backfill-transcript-embeddings.ts
 *   npx tsx scripts/backfill-transcript-embeddings.ts --cutoff=2026-04-16T00:00:00Z
 *   npx tsx scripts/backfill-transcript-embeddings.ts --dry-run
 *
 * Arguments:
 *   --cutoff=<ISO date>  Reprocess transcripts updated before this date, even if they
 *                        already have an embedding. Useful after corpus-wide prompt
 *                        changes.
 *   --dry-run            Log planned work without calling OpenAI or writing.
 *
 * Environment variables:
 *   DATABASE_URL, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY must be set.
 */
import { prisma } from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { createLogger } from '@/lib/logger';

const log = createLogger('backfill-transcript-embeddings');

/** Parsed CLI flags. */
interface Args {
  cutoff: Date | null;
  dryRun: boolean;
}

/**
 * Parses `--cutoff=...` and `--dry-run` from process.argv.
 */
function parseArgs(argv: string[]): Args {
  let cutoff: Date | null = null;
  let dryRun = false;
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg.startsWith('--cutoff=')) {
      const value = arg.slice('--cutoff='.length);
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid --cutoff value: ${value}`);
      }
      cutoff = parsed;
    }
  }
  return { cutoff, dryRun };
}

/**
 * Fetches the list of transcript IDs that still need backfilling.
 *
 * A transcript qualifies when either:
 * - its `embedding` column is NULL, or
 * - `--cutoff` was provided and `updated_at` is before the cutoff.
 */
async function findCandidates(cutoff: Date | null): Promise<Array<{ id: string }>> {
  if (cutoff) {
    return prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM transcripts
      WHERE embedding IS NULL OR updated_at < ${cutoff}
      ORDER BY updated_at ASC
    `;
  }
  return prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM transcripts
    WHERE embedding IS NULL
    ORDER BY updated_at ASC
  `;
}

/**
 * Entry point. Exits with code 0 on success, non-zero if any transcript
 * fails to regenerate (remaining ones still proceed).
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  log.info(
    { cutoff: args.cutoff?.toISOString() ?? null, dryRun: args.dryRun },
    'Backfill starting'
  );

  const candidates = await findCandidates(args.cutoff);
  log.info({ count: candidates.length }, 'Candidates identified');

  if (candidates.length === 0) {
    log.info('No transcripts to backfill');
    return;
  }

  if (args.dryRun) {
    log.info({ ids: candidates.map((c) => c.id) }, 'Dry run — no writes performed');
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const LOG_EVERY = 25;

  for (const { id } of candidates) {
    const record = await prisma.transcript.findUnique({
      where: { id },
      select: { id: true, auditBriefId: true, transcriptType: true, fullText: true },
    });
    if (!record || !record.fullText.trim()) {
      log.warn({ transcript_id: id }, 'Skipping: transcript missing or has empty fullText');
      continue;
    }

    try {
      const embedding = await generateEmbedding(record.fullText);
      const vectorLiteral = `[${embedding.join(',')}]`;
      await prisma.$executeRaw`UPDATE transcripts SET embedding = ${vectorLiteral}::vector WHERE id = ${id}::uuid`;
      succeeded++;
    } catch (error) {
      failed++;
      log.error(
        { err: error, transcript_id: id, audit_brief_id: record.auditBriefId },
        'Embedding regeneration failed for transcript'
      );
    }

    if ((succeeded + failed) % LOG_EVERY === 0) {
      log.info({ succeeded, failed, total: candidates.length }, 'Progress');
    }
  }

  log.info({ succeeded, failed, total: candidates.length }, 'Backfill complete');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    log.error({ err }, 'Backfill script crashed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
