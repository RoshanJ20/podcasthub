/**
 * Integration tests for the admin audit log server component.
 *
 * Covers:
 * - Search params narrow to valid entity/action values only.
 * - Invalid filter values are silently ignored (no Prisma where clause).
 * - Pagination uses skip/take based on the `page` query param.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    adminAuditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/components/admin/audit-log-table', () => ({
  AuditLogTable: () => null,
}));

import AdminAuditLogPage from '@/app/(admin)/admin/audit-log/page';
import { prisma } from '@/lib/db';

const countMock = vi.mocked(prisma.adminAuditLog.count);
const findManyMock = vi.mocked(prisma.adminAuditLog.findMany);

beforeEach(() => {
  countMock.mockReset();
  findManyMock.mockReset();
  countMock.mockResolvedValue(0);
  findManyMock.mockResolvedValue([]);
});

describe('AdminAuditLogPage', () => {
  it('passes a valid entityType filter into Prisma', async () => {
    await AdminAuditLogPage({
      searchParams: Promise.resolve({ entityType: 'audit_brief' }),
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { entityType: 'audit_brief' } })
    );
  });

  it('ignores invalid entityType values', async () => {
    await AdminAuditLogPage({
      searchParams: Promise.resolve({ entityType: 'not-a-real-entity' }),
    });

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('combines entityType and action filters when both are valid', async () => {
    await AdminAuditLogPage({
      searchParams: Promise.resolve({ entityType: 'learning_graph', action: 'hard_delete' }),
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: 'learning_graph', action: 'hard_delete' },
      })
    );
  });

  it('skips (page - 1) * 25 rows for pagination', async () => {
    await AdminAuditLogPage({ searchParams: Promise.resolve({ page: '3' }) });

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 25 }));
  });

  it('defaults to page 1 for missing or invalid page params', async () => {
    await AdminAuditLogPage({ searchParams: Promise.resolve({ page: 'banana' }) });

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 25 }));
  });
});
