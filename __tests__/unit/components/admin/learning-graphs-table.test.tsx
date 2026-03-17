/**
 * Unit tests for the admin LearningGraphsTable component.
 *
 * Tests cover:
 * - Table renders without a Published column (auto-publish removes this)
 * - Table renders graph rows with correct data
 * - Empty state renders with correct colSpan
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LearningGraphsTable } from '@/components/admin/learning-graphs-table';

/* Mock next/navigation for useRouter usage inside the component */
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

const mockGraphs = [
  {
    id: 'graph-1',
    title: 'Audit Basics',
    domain: 'Auditing',
    pathType: 'linear',
    createdAt: new Date('2025-06-01'),
    _count: { episodes: 3 },
  },
  {
    id: 'graph-2',
    title: 'Advanced LEAP',
    domain: 'LEAP',
    pathType: 'graph',
    createdAt: new Date('2025-07-01'),
    _count: { episodes: 5 },
  },
];

describe('LearningGraphsTable', () => {
  it('does not render a Published column header', () => {
    render(<LearningGraphsTable graphs={mockGraphs} />);

    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);

    expect(headerTexts).not.toContain('Published');
    expect(headerTexts).toContain('Title');
    expect(headerTexts).toContain('Domain');
    expect(headerTexts).toContain('Type');
    expect(headerTexts).toContain('Episodes');
    expect(headerTexts).toContain('Actions');
  });

  it('does not render publish/draft toggle buttons', () => {
    render(<LearningGraphsTable graphs={mockGraphs} />);

    expect(screen.queryByText('Published')).toBeNull();
    expect(screen.queryByText('Draft')).toBeNull();
  });

  it('renders graph rows with correct data', () => {
    render(<LearningGraphsTable graphs={mockGraphs} />);

    /* Use getAllByText since text may appear in multiple elements (e.g. link + cell) */
    expect(screen.getAllByText('Audit Basics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Advanced LEAP').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Auditing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('LEAP').length).toBeGreaterThan(0);
  });

  it('renders empty state with correct colSpan when no graphs', () => {
    render(<LearningGraphsTable graphs={[]} />);

    const emptyCell = screen.getByText(/No learning series yet/);
    expect(emptyCell).toBeDefined();
    /* colSpan should be 5 (Title, Domain, Type, Episodes, Actions) */
    expect(emptyCell.getAttribute('colspan')).toBe('5');
  });
});
