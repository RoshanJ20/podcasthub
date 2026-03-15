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
    const { container } = render(<PodcastCard {...defaultProps} />);
    const titleEl = container.querySelector('[data-slot="card-title"]');
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe(defaultProps.title);
  });

  it('renders the domain as a badge', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const domainBadge = container.querySelector('[data-slot="badge"][data-variant="secondary"]');
    expect(domainBadge).not.toBeNull();
    expect(domainBadge!.textContent).toBe(defaultProps.domain);
  });

  it('renders the year', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const yearEl = container.querySelector('.text-xs.text-muted-foreground');
    expect(yearEl).not.toBeNull();
    expect(yearEl!.textContent).toBe(String(defaultProps.year));
  });

  it('renders the description', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const descEl = container.querySelector('[data-slot="card-content"] p');
    expect(descEl).not.toBeNull();
    expect(descEl!.textContent).toBe(defaultProps.description);
  });

  it('applies line-clamp-2 CSS class to the title', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const titleEl = container.querySelector('[data-slot="card-title"]');
    expect(titleEl).not.toBeNull();
    expect(titleEl!.className).toContain('line-clamp-2');
  });

  it('applies line-clamp-3 CSS class to the description', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const descEl = container.querySelector('[data-slot="card-content"] p');
    expect(descEl).not.toBeNull();
    expect(descEl!.className).toContain('line-clamp-3');
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

  it('renders tags as badges', () => {
    const { container } = render(<PodcastCard {...defaultProps} />);
    const tagBadges = container.querySelectorAll('[data-slot="badge"][data-variant="outline"]');
    expect(tagBadges.length).toBe(3);
    const tagTexts = Array.from(tagBadges).map((el) => el.textContent);
    for (const tag of defaultProps.tags) {
      expect(tagTexts).toContain(tag);
    }
  });

  it('renders at most 3 tags', () => {
    const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
    const { container } = render(<PodcastCard {...defaultProps} tags={manyTags} />);
    const tagBadges = container.querySelectorAll('[data-slot="badge"][data-variant="outline"]');
    expect(tagBadges.length).toBe(3);
    const tagTexts = Array.from(tagBadges).map((el) => el.textContent);
    expect(tagTexts).toContain('tag1');
    expect(tagTexts).toContain('tag2');
    expect(tagTexts).toContain('tag3');
    expect(tagTexts).not.toContain('tag4');
    expect(tagTexts).not.toContain('tag5');
  });

  it('renders without tags when tags array is empty', () => {
    const { container } = render(<PodcastCard {...defaultProps} tags={[]} />);
    const tagBadges = container.querySelectorAll('[data-slot="badge"][data-variant="outline"]');
    expect(tagBadges.length).toBe(0);
    const titleEl = container.querySelector('[data-slot="card-title"]');
    expect(titleEl!.textContent).toBe(defaultProps.title);
  });
});
