/**
 * Admin audit log viewer page.
 *
 * Server component that lists every mutation recorded in `admin_audit_logs`
 * (writes emitted by the Phase 0 audit-log helper). Provides basic filtering
 * by entity type and cursor pagination via the `?page=` query param.
 *
 * Access is implicitly gated by the admin layout + NextAuth middleware — the
 * (admin) route group only renders for authenticated admin/superadmin roles.
 */
import { prisma } from '@/lib/db';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import type { AuditLogEntry, AuditLogFilter } from '@/components/admin/audit-log-table';

export const dynamic = 'force-dynamic';

/** Default rows per page; mirrors the project-wide pagination default. */
const PAGE_SIZE = 25;

/** Query params supported by the audit log page. */
interface AuditLogSearchParams {
  page?: string;
  entityType?: string;
  action?: string;
}

/**
 * Parses a positive integer from a raw query-string value, defaulting to 1
 * on missing/invalid input.
 */
function parsePage(raw: string | undefined): number {
  const n = raw ? Number(raw) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/**
 * Narrows an arbitrary string to one of the known entity-type filter values,
 * returning `null` (no filter) for anything else.
 */
function parseEntityType(raw: string | undefined): AuditLogFilter['entityType'] {
  if (!raw) return null;
  if (
    raw === 'audit_brief' ||
    raw === 'learning_graph' ||
    raw === 'transcript' ||
    raw === 'episode'
  ) {
    return raw;
  }
  return null;
}

/**
 * Narrows an arbitrary string to one of the known action filter values.
 */
function parseAction(raw: string | undefined): AuditLogFilter['action'] {
  if (!raw) return null;
  const allowed = [
    'create',
    'update',
    'archive',
    'unarchive',
    'hard_delete',
    'transcript_update',
    'episode_delete',
    'blob_cleanup',
  ] as const;
  if ((allowed as readonly string[]).includes(raw)) {
    return raw as AuditLogFilter['action'];
  }
  return null;
}

/**
 * Renders the admin audit-log viewer with filter-aware pagination.
 *
 * @param searchParams - Route search params: `page`, `entityType`, `action`.
 */
export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<AuditLogSearchParams>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const page = parsePage(params.page);
  const entityType = parseEntityType(params.entityType);
  const action = parseAction(params.action);

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const entries: AuditLogEntry[] = rows.map((row) => ({
    id: row.id,
    actorEmail: row.actorEmail,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    requestId: row.requestId,
    createdAt: row.createdAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every create, update, archive, and delete performed against audit briefs, learning graphs,
          episodes, and transcripts.
        </p>
      </div>

      <AuditLogTable
        entries={entries}
        page={page}
        totalPages={totalPages}
        total={total}
        filter={{ entityType, action }}
      />
    </div>
  );
}
