/**
 * Unit tests for the PageViewTracker client component.
 *
 * Behaviour under test:
 * - Fires exactly one POST to /api/activity on mount.
 * - Does not fire again on a re-render with the same props.
 * - Fires again when entityId changes.
 * - Maps entityType to the correct activityType and FK field.
 * - Forwards optional `source` into metadata.
 * - Swallows fetch failures (component still returns null cleanly).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/lib/config/base-path', () => ({
  withBasePath: (p: string) => `/auditbrief${p}`,
}));

import { PageViewTracker } from '@/components/analytics/page-view-tracker';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response);
});

function lastFetchCall() {
  const mock = global.fetch as ReturnType<typeof vi.fn>;
  const call = mock.mock.calls[mock.mock.calls.length - 1];
  return { url: call[0], body: JSON.parse(call[1].body) };
}

describe('PageViewTracker', () => {
  it('fires exactly one POST on mount for entityType=audit_brief', () => {
    render(<PageViewTracker entityType="audit_brief" entityId={UUID} />);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const { url, body } = lastFetchCall();
    expect(url).toBe('/auditbrief/api/activity');
    expect(body).toMatchObject({
      activityType: 'view_audit_brief',
      auditBriefId: UUID,
    });
    expect(body.graphId).toBeUndefined();
  });

  it('fires for entityType=learning_path with graphId set', () => {
    render(<PageViewTracker entityType="learning_path" entityId={UUID} />);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const { body } = lastFetchCall();
    expect(body).toMatchObject({
      activityType: 'view_path',
      graphId: UUID,
    });
    expect(body.auditBriefId).toBeUndefined();
  });

  it('includes source in metadata when provided', () => {
    render(<PageViewTracker entityType="audit_brief" entityId={UUID} source="home" />);

    const { body } = lastFetchCall();
    expect(body.metadata).toEqual({ source: 'home' });
  });

  it('omits metadata.source when prop is undefined', () => {
    render(<PageViewTracker entityType="audit_brief" entityId={UUID} />);

    const { body } = lastFetchCall();
    expect(body.metadata).toEqual({});
  });

  it('does not refire on re-render with identical props', () => {
    const { rerender } = render(<PageViewTracker entityType="audit_brief" entityId={UUID} />);
    rerender(<PageViewTracker entityType="audit_brief" entityId={UUID} />);
    rerender(<PageViewTracker entityType="audit_brief" entityId={UUID} />);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fires again when entityId changes', () => {
    const { rerender } = render(<PageViewTracker entityType="audit_brief" entityId="id-A" />);
    rerender(<PageViewTracker entityType="audit_brief" entityId="id-B" />);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(lastFetchCall().body.auditBriefId).toBe('id-B');
  });

  it('renders null and survives a fetch rejection', () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const { container } = render(<PageViewTracker entityType="audit_brief" entityId={UUID} />);
    expect(container.firstChild).toBeNull();
  });
});
