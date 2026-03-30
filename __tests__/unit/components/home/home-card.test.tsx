/**
 * Unit tests for HomeCard component.
 *
 * Verifies both audit brief and series variants render correct structure,
 * links, domain badges, and variant-specific metadata.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { HomeCard } from '@/components/home/home-card';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('HomeCard', () => {
  describe('audit brief variant', () => {
    it('renders title, description, domain badge, year, and primary action label', () => {
      render(
        <HomeCard
          variant="auditBrief"
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
      expect(screen.getByText('Open bulletin')).toBeDefined();
    });

    it('links to /audit-brief/[id]', () => {
      const { container } = render(
        <HomeCard
          variant="auditBrief"
          id="p1"
          title="Test"
          description={null}
          domain="LEAP"
          year={2026}
          tags={[]}
        />
      );

      const link = container.querySelector('a');
      expect(link?.getAttribute('href')).toBe('/audit-brief/p1');
    });

    it('accepts tags prop without rendering them on the card', () => {
      render(
        <HomeCard
          variant="auditBrief"
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
          variant="auditBrief"
          id="p1"
          title="No Description Card"
          description={null}
          domain="LEAP"
          year={2026}
          tags={[]}
        />
      );

      expect(screen.getByText('No Description Card')).toBeDefined();
      expect(container.querySelector('p.text-sm.leading-relaxed')).toBeNull();
    });
  });

  describe('series variant', () => {
    it('renders title, description, domain badge, episode count, completion status, and action label', () => {
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
      expect(screen.getByText('5 episodes')).toBeDefined();
      expect(screen.getByText('2 complete')).toBeDefined();
      expect(screen.getByText('Continue path')).toBeDefined();
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

    it('renders episode count and completed count metadata', () => {
      render(
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

      expect(screen.getByText('4 episodes')).toBeDefined();
      expect(screen.getByText('1 complete')).toBeDefined();
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

      expect(within(container).getByText('0 episodes')).toBeDefined();
      expect(within(container).getByText('0 complete')).toBeDefined();
    });
  });
});
