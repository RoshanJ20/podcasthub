/**
 * Unit tests for lib/admin/audit-log.ts.
 *
 * Covers:
 * - writeAuditLog inserts with the expected column mapping.
 * - writeAuditLog swallows Prisma errors and logs them at warn level.
 * - Optional fields (before, after, requestId) are normalized to null when absent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    adminAuditLog: {
      create: vi.fn(),
    },
  },
}));

import { writeAuditLog } from '@/lib/admin/audit-log';
import { prisma } from '@/lib/db';

const createMock = vi.mocked(prisma.adminAuditLog.create);

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as unknown as Parameters<typeof writeAuditLog>[0]['log'];
}

describe('writeAuditLog', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('inserts the expected row shape', async () => {
    createMock.mockResolvedValue({} as never);

    await writeAuditLog({
      actorId: 'user-1',
      actorEmail: 'admin@example.com',
      action: 'update',
      entityType: 'audit_brief',
      entityId: 'brief-1',
      before: { title: 'Old' },
      after: { title: 'New' },
      requestId: 'req-1',
      log: makeLogger(),
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        actorEmail: 'admin@example.com',
        action: 'update',
        entityType: 'audit_brief',
        entityId: 'brief-1',
        before: { title: 'Old' },
        after: { title: 'New' },
        requestId: 'req-1',
      },
    });
  });

  it('normalizes missing before/after/requestId to null', async () => {
    createMock.mockResolvedValue({} as never);

    await writeAuditLog({
      actorId: null,
      actorEmail: 'admin@example.com',
      action: 'archive',
      entityType: 'audit_brief',
      entityId: 'brief-2',
      log: makeLogger(),
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        actorId: null,
        actorEmail: 'admin@example.com',
        action: 'archive',
        entityType: 'audit_brief',
        entityId: 'brief-2',
        before: null,
        after: null,
        requestId: null,
      },
    });
  });

  it('swallows Prisma errors and logs at warn level', async () => {
    const log = makeLogger();
    createMock.mockRejectedValue(new Error('DB down'));

    await expect(
      writeAuditLog({
        actorId: 'user-1',
        actorEmail: 'admin@example.com',
        action: 'hard_delete',
        entityType: 'learning_graph',
        entityId: 'graph-1',
        log,
      })
    ).resolves.toBeUndefined();

    expect(log.warn).toHaveBeenCalledTimes(1);
    const warnCall = vi.mocked(log.warn).mock.calls[0][0] as Record<string, unknown>;
    expect(warnCall.audit_action).toBe('hard_delete');
    expect(warnCall.audit_entity_type).toBe('learning_graph');
    expect(warnCall.error).toBe('DB down');
  });
});
