/**
 * Unit tests for the AuditBriefCard component.
 *
 * Verifies rendering of title, domain badge, year, description,
 * thumbnail image, audit brief detail link, and tag badges.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditBriefCard } from '@/components/library/audit-brief-card';

const defaultProps = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Introduction to Audit Methodology',
  description: 'A comprehensive overview of audit methodology fundamentals and best practices.',
  domain: 'Audit Methodology',
  year: 2024,
  tags: ['audit', 'methodology', 'fundamentals'],
  thumbnailUrl: 'http://localhost:9000/thumbnails/test.jpg',
};

describe('AuditBriefCard', () => {
  it('renders the audit brief title', () => {
    render(<AuditBriefCard {...defaultProps} />);
    const els = screen.getAllByText(defaultProps.title);
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the domain', () => {
    render(<AuditBriefCard {...defaultProps} />);
    const els = screen.getAllByText(defaultProps.domain);
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the year', () => {
    render(<AuditBriefCard {...defaultProps} />);
    const els = screen.getAllByText(String(defaultProps.year));
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the description', () => {
    render(<AuditBriefCard {...defaultProps} />);
    const els = screen.getAllByText(defaultProps.description);
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the thumbnail image', () => {
    render(<AuditBriefCard {...defaultProps} />);
    const images = screen.getAllByRole('img', { name: defaultProps.title });
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src');
  });

  it('links to the correct audit brief detail URL', () => {
    const { container } = render(<AuditBriefCard {...defaultProps} />);
    const link = container.querySelector('[data-testid="audit-brief-card-link"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe(`/audit-brief/${defaultProps.id}`);
  });

  it('does not render tags (tags retained in interface but not displayed)', () => {
    render(<AuditBriefCard {...defaultProps} />);
    for (const tag of defaultProps.tags) {
      expect(screen.queryByText(tag)).toBeNull();
    }
  });

  it('accepts tags prop without rendering them on the card', () => {
    const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
    render(<AuditBriefCard {...defaultProps} tags={manyTags} />);
    for (const tag of manyTags) {
      expect(screen.queryByText(tag)).toBeNull();
    }
  });

  it('renders without tags when tags array is empty', () => {
    render(<AuditBriefCard {...defaultProps} tags={[]} />);
    const els = screen.getAllByText(defaultProps.title);
    expect(els.length).toBeGreaterThan(0);
  });
});
