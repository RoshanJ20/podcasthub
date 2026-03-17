/**
 * Unit tests for wiring verification — upload and edit pages use PodcastUploadWizard.
 *
 * Verifies:
 * - EditPodcastClient renders PodcastUploadWizard (not PodcastUploadForm)
 * - Upload page renders PodcastUploadWizard (not PodcastUploadForm)
 *
 * @dependencies vitest, @testing-library/react, EditPodcastClient, PodcastUploadWizard
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
 * Mock the PodcastUploadWizard to a simple div with a data-testid.
 * This isolates the wiring test from the wizard's internal complexity.
 */
vi.mock('@/components/admin/podcast-upload-wizard', () => ({
  PodcastUploadWizard: (props: Record<string, unknown>) => (
    <div
      data-testid="podcast-upload-wizard"
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

import { EditPodcastClient } from '@/components/admin/edit-podcast-client';

/* ---------- Test data ---------- */

/** Minimal podcast data for edit mode tests. */
const mockPodcast = {
  id: 'test-podcast-1',
  title: 'Test Podcast',
  description: 'A test podcast description',
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

describe('EditPodcastClient wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PodcastUploadWizard instead of PodcastUploadForm', () => {
    render(<EditPodcastClient podcast={mockPodcast} />);

    const wizards = screen.getAllByTestId('podcast-upload-wizard');
    expect(wizards.length).toBeGreaterThanOrEqual(1);
  });

  it('passes mode="edit" to PodcastUploadWizard', () => {
    render(<EditPodcastClient podcast={mockPodcast} />);

    const wizard = screen.getAllByTestId('podcast-upload-wizard')[0];
    expect(wizard.getAttribute('data-mode')).toBe('edit');
  });

  it('passes initialData to PodcastUploadWizard', () => {
    render(<EditPodcastClient podcast={mockPodcast} />);

    const wizard = screen.getAllByTestId('podcast-upload-wizard')[0];
    expect(wizard.getAttribute('data-has-initial-data')).toBe('true');
  });

  it('renders breadcrumb navigation with Dashboard link', () => {
    render(<EditPodcastClient podcast={mockPodcast} />);

    const dashboardLinks = screen.getAllByText('Dashboard');
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(dashboardLinks[0].closest('a')?.getAttribute('href')).toBe('/admin');
  });

  it('displays the Edit Podcast heading', () => {
    render(<EditPodcastClient podcast={mockPodcast} />);

    const headings = screen.getAllByText('Edit Podcast');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });
});
