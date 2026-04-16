/**
 * Admin action audit logger.
 *
 * Writes rows to the `admin_audit_logs` table for every mutating admin
 * operation (create, update, archive, unarchive, hard_delete, transcript_update,
 * episode_delete, blob_cleanup). Failures are swallowed so audit-log outages
 * never break a user-facing admin action — compliance visibility is secondary
 * to availability.
 *
 * Dependencies:
 * - lib/db.ts (Prisma client)
 * - pino Logger type for warn-level failure reporting
 *
 * @example
 * await writeAuditLog({
 *   actorId: user.userId,
 *   actorEmail: user.email,
 *   action: 'update',
 *   entityType: 'audit_brief',
 *   entityId: brief.id,
 *   before: existing,
 *   after: updated,
 *   requestId,
 *   log,
 * });
 */
import type { Logger } from 'pino';
import { prisma } from '@/lib/db';

/**
 * Discriminated set of admin actions recorded in the audit log.
 *
 * Adding a new action requires updating consumers that filter or render log
 * entries by action type.
 */
export type AuditAction =
  | 'create'
  | 'update'
  | 'archive'
  | 'unarchive'
  | 'hard_delete'
  | 'transcript_update'
  | 'episode_delete'
  | 'blob_cleanup'
  | 'blob_sweep';

/** Entity types that admin actions can target. */
export type AuditEntityType =
  | 'audit_brief'
  | 'learning_graph'
  | 'transcript'
  | 'episode'
  | 'blob_storage';

/** Parameters accepted by `writeAuditLog`. */
export interface WriteAuditLogParams {
  /** User ID of the actor performing the action (null permitted for system events). */
  actorId: string | null;
  /** Email address of the actor (captured for lookups after user deletion). */
  actorEmail: string;
  /** The action being recorded. */
  action: AuditAction;
  /** The type of entity the action targets. */
  entityType: AuditEntityType;
  /** UUID of the entity the action targets. */
  entityId: string;
  /** Optional pre-change snapshot; stored as JSONB. */
  before?: unknown;
  /** Optional post-change snapshot; stored as JSONB. */
  after?: unknown;
  /** Optional middleware-supplied request correlation ID. */
  requestId?: string;
  /** Pino logger for warn-level reporting if the insert fails. */
  log: Logger;
}

/**
 * Persists an admin audit log entry. Never throws.
 *
 * If the underlying insert fails (e.g. DB outage), the error is logged at
 * warn level and the function returns normally. Upstream mutations must
 * remain unaffected.
 *
 * @param params - See `WriteAuditLogParams`.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  const { actorId, actorEmail, action, entityType, entityId, before, after, requestId, log } =
    params;

  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId,
        actorEmail,
        action,
        entityType,
        entityId,
        before: (before ?? null) as never,
        after: (after ?? null) as never,
        requestId: requestId ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.warn(
      {
        audit_action: action,
        audit_entity_type: entityType,
        audit_entity_id: entityId,
        error: message,
      },
      'Failed to write admin audit log entry'
    );
  }
}
