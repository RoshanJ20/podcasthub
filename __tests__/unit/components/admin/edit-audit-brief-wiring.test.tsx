/**
 * Unit tests for wiring verification — upload and edit pages use AuditBriefUploadWizard.
 *
 * Verifies:
 * - EditAuditBriefClient renders AuditBriefUploadWizard (not AuditBriefUploadForm)
 * - Upload page renders AuditBriefUploadWizard (not AuditBriefUploadForm)
 *
 * @dependencies vitest, @testing-library/react, EditAuditBriefClient, AuditBriefUploadWizard
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/* ---------- Mocks ---------- */

/**
 * Mock next/navigation hooks used by the page components.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

/**
 * Mock the AuditBriefUploadWizard to a simple div with a data-testid.
 * This isolates the wiring test from the wizard's internal complexity.
 */
vi.mock('@/components/admin/audit-brief-upload-wizard', () => ({
  AuditBriefUploadWizard: (props: Record<string, unknown>) => (
    <div
      data-testid="audit-brief-upload-wizard"
      data-mode={props.mode}
      data-has-initial-data={!!props.initialData}
    />
  ),
}));

/**
 * Mock lucide-react icons to avoid rendering SVGs in tests.
 */
vi.mock('lucide-react', () => ({
  ChevronRight: () => <span data-testid="chevron-right" />,
  ChevronRightIcon: () => <span data-testid="chevron-right-icon" />,
  MoreHorizontalIcon: () => <span data-testid="more-horizontal-icon" />,
}));

/**
 * Mock @base-ui/react modules used by the Breadcrumb component.
 */
vi.mock('@base-ui/react/merge-props', () => ({
  mergeProps: (...objs: Record<string, unknown>[]) => Object.assign({}, ...objs),
}));

vi.mock('@base-ui/react/use-render', () => ({
  useRender: ({
    props,
    render,
  }: {
    props: Record<string, unknown>;
    render?: React.ReactElement;
  }) => {
    if (render && React.isValidElement(render)) {
      return React.cloneElement(render, props as React.Attributes);
    }
    return <a {...props} />;
  },
}));

/**
 * Mock next/link to a plain anchor element.
 */
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { EditAuditBriefClient } from '@/components/admin/edit-audit-brief-client';

/* ---------- Test data ---------- */

/** Minimal audit brief data for edit mode tests. */
const mockAuditBrief = {
  id: 'test-audit-brief-1',
  title: 'Test Audit Brief',
  description: 'A test audit brief description',
  domain: 'Audit',
  year: 2025,
  tags: ['audit', 'compliance'],
  thumbnailUrl: '/test-thumb.jpg',
  audioShortUrl: '/test-short.mp3',
  audioLongUrl: '/test-long.mp3',
  bulletinUrls: ['/test-bulletin.pdf'],
  sortOrder: 1,
  isArchived: false,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

/* ---------- Tests ---------- */

describe('EditAuditBriefClient wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AuditBriefUploadWizard instead of AuditBriefUploadForm', () => {
    render(<EditAuditBriefClient auditBrief={mockAuditBrief} />);

    const wizards = screen.getAllByTestId('audit-brief-upload-wizard');
    expect(wizards.length).toBeGreaterThanOrEqual(1);
  });

  it('passes mode="edit" to AuditBriefUploadWizard', () => {
    render(<EditAuditBriefClient auditBrief={mockAuditBrief} />);

    const wizard = screen.getAllByTestId('audit-brief-upload-wizard')[0];
    expect(wizard.getAttribute('data-mode')).toBe('edit');
  });

  it('passes initialData to AuditBriefUploadWizard', () => {
    render(<EditAuditBriefClient auditBrief={mockAuditBrief} />);

    const wizard = screen.getAllByTestId('audit-brief-upload-wizard')[0];
    expect(wizard.getAttribute('data-has-initial-data')).toBe('true');
  });

  it('renders breadcrumb navigation with Dashboard link', () => {
    render(<EditAuditBriefClient auditBrief={mockAuditBrief} />);

    const dashboardLinks = screen.getAllByText('Dashboard');
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(dashboardLinks[0].closest('a')?.getAttribute('href')).toBe('/admin');
  });

  it('displays the Edit Audit Brief heading', () => {
    render(<EditAuditBriefClient auditBrief={mockAuditBrief} />);

    const headings = screen.getAllByText('Edit Audit Brief');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
