/**
 * Unit tests for HomeCard component.
 *
 * Verifies both podcast and series variants render correct structure,
 * links, domain badges, and variant-specific metadata.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeCard } from '@/components/home/home-card';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('HomeCard', () => {
  describe('podcast variant', () => {
    it('renders title, description, domain badge, and year', () => {
      render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Analytics Intro"
          description="Overview of tools"
          domain="Audit Technology"
          year={2026}
          tags={['analytics', 'data']}
        />
      );

      expect(screen.getByText('Analytics Intro')).toBeDefined();
      expect(screen.getByText('Overview of tools')).toBeDefined();
      expect(screen.getByText('Audit Technology')).toBeDefined();
      expect(screen.getByText('2026')).toBeDefined();
    });

    it('links to /podcast/[id]', () => {
      const { container } = render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Test"
          description={null}
          domain="LEAP"
          year={2026}
          tags={[]}
        />
      );

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/podcast/p1');
    });

    it('accepts tags prop without rendering them on the card', () => {
      render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="Test"
          description={null}
          domain="LEAP"
          year={2026}
          tags={['search', 'ai']}
        />
      );

      expect(screen.queryByText('search')).toBeNull();
      expect(screen.queryByText('ai')).toBeNull();
    });

    it('handles null description', () => {
      const { container } = render(
        <HomeCard
          variant="podcast"
          id="p1"
          title="No Description Card"
          description={null}
          domain="LEAP"
          year={2026}
          tags={[]}
        />
      );

      expect(screen.getByText('No Description Card')).toBeDefined();
      // No description paragraph should be rendered
      const descriptions = container.querySelectorAll('.line-clamp-1');
      expect(descriptions.length).toBe(0);
    });
  });

  describe('series variant', () => {
    it('renders title, description, domain badge, and episode count', () => {
      render(
        <HomeCard
          variant="series"
          id="s1"
          title="Revenue Series"
          description="ASC 606 deep dive"
          domain="Accounting and Reporting"
          episodeCount={5}
          completedCount={2}
        />
      );

      expect(screen.getByText('Revenue Series')).toBeDefined();
      expect(screen.getByText('ASC 606 deep dive')).toBeDefined();
      expect(screen.getByText('Accounting and Reporting')).toBeDefined();
      expect(screen.getByText(/5 episodes/)).toBeDefined();
    });

    it('links to /learning-path/[id]', () => {
      const { container } = render(
        <HomeCard
          variant="series"
          id="s1"
          title="Test"
          description={null}
          domain="Auditing"
          episodeCount={0}
          completedCount={0}
        />
      );

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/learning-path/s1');
    });

    it('renders progress bar with ARIA attributes', () => {
      const { container } = render(
        <HomeCard
          variant="series"
          id="s1"
          title="Progress Test"
          description={null}
          domain="Auditing"
          episodeCount={4}
          completedCount={1}
        />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('25');
      expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
      expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
    });

    it('handles zero episodes without division error', () => {
      const { container } = render(
        <HomeCard
          variant="series"
          id="s1"
          title="Zero Episodes"
          description={null}
          domain="Auditing"
          episodeCount={0}
          completedCount={0}
        />
      );

      const progressBar = container.querySelector('[role="progressbar"]');
      expect(progressBar).not.toBeNull();
      expect(progressBar?.getAttribute('aria-valuenow')).toBe('0');
    });
  });
});
