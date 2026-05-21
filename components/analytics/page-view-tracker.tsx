'use client';

/**
 * PageViewTracker — fires one fire-and-forget POST to /api/activity per mount
 * so server-rendered pages can record a `view_audit_brief` or `view_path`
 * event in the user_activity table.
 *
 * Drop one into the rendered tree of an audit-brief or learning-path detail
 * page; the component returns null and has no visual surface. Fetch errors are
 * swallowed because analytics writes must never disrupt the parent page.
 *
 * @example
 *   <PageViewTracker entityType="audit_brief" entityId={params.id} />
 */
import { useEffect } from 'react';
import { withBasePath } from '@/lib/config/base-path';

type EntityType = 'audit_brief' | 'learning_path';

interface PageViewTrackerProps {
  entityType: EntityType;
  entityId: string;
  /** Optional referrer hint persisted in metadata.source. */
  source?: string;
}

export function PageViewTracker({ entityType, entityId, source }: PageViewTrackerProps) {
  useEffect(() => {
    const payload =
      entityType === 'audit_brief'
        ? { activityType: 'view_audit_brief' as const, auditBriefId: entityId }
        : { activityType: 'view_path' as const, graphId: entityId };

    void fetch(withBasePath('/api/activity'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        metadata: source ? { source } : {},
      }),
    }).catch(() => {
      /* swallow — analytics writes must never disrupt the page */
    });
  }, [entityType, entityId, source]);

  return null;
}
