/**
 * Unit tests for the PodcastCard component.
 *
 * Verifies rendering of title, domain badge, year, description,
 * thumbnail image, podcast detail link, and tag badges.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PodcastCard } from '@/components/library/podcast-card';

const defaultProps = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  title: 'Introduction to Audit Methodology',
  description: 'A comprehensive overview of audit methodology fundamentals and best practices.',
  domain: 'Audit Methodology',
  year: 2024,
  tags: ['audit', 'methodology', 'fundamentals'],
  thumbnailUrl: 'http://localhost:9000/thumbnails/test.jpg',
};

describe('PodcastCard', () => {
  it('renders the podcast title', () => {
    render(<PodcastCard {...defaultProps} />);
    const els = screen.getAllByText(defaultProps.title);
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the domain', () => {
    render(<PodcastCard {...defaultProps} />);
    const els = screen.getAllByText(defaultProps.domain);
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the year', () => {
    render(<PodcastCard {...defaultProps} />);
    const els = screen.getAllByText(String(defaultProps.year));
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the description', () => {
    render(<PodcastCard {...defaultProps} />);
    const els = screen.getAllByText(defaultProps.description);
    expect(els.length).toBeGreaterThan(0);
  });

  it('renders the thumbnail image', () => {
    render(<PodcastCard {...defaultProps} />);
    const images = screen.getAllByRole('img', { name: defaultProps.title });
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute('src');
  });

  it('links to the correct podcast detail URL', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const link = container.querySelector('[data-testid="podcast-card-link"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe(`/podcast/${defaultProps.id}`);
  });

  it('does not render tags (tags retained in interface but not displayed)', () => {
    render(<PodcastCard {...defaultProps} />);
    for (const tag of defaultProps.tags) {
      expect(screen.queryByText(tag)).toBeNull();
    }
  });

  it('accepts tags prop without rendering them on the card', () => {
    const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
    render(<PodcastCard {...defaultProps} tags={manyTags} />);
    for (const tag of manyTags) {
      expect(screen.queryByText(tag)).toBeNull();
    }
  });

  it('renders without tags when tags array is empty', () => {
    render(<PodcastCard {...defaultProps} tags={[]} />);
    const els = screen.getAllByText(defaultProps.title);
    expect(els.length).toBeGreaterThan(0);
  });
});
