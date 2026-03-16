/**
 * Unit tests for the UnifiedSidebar component.
 *
 * Verifies:
 * - The app logo and name "PodcastHub" are rendered
 * - Main nav links (Home) and Library section (Technical Content, Learning Paths) render
 * - The Admin section renders when isAdmin={true}
 * - The Admin section does NOT render when isAdmin is false or undefined
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { usePlayerStore } from '@/stores/player-store';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/stores/player-store', () => ({
  usePlayerStore: vi.fn(() => null),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('motion/react', () => ({
  motion: {
    aside: ({ children, className, style, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <aside className={className} style={style} {...rest}>
        {children}
      </aside>
    ),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  userName: 'Jane Doe',
  userRole: 'Member',
};

beforeEach(() => {
  cleanup();
  vi.mocked(usePlayerStore).mockReturnValue(null as unknown as ReturnType<typeof usePlayerStore>);
  window.localStorage.removeItem('sidebar-collapsed');
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UnifiedSidebar', () => {
  describe('branding', () => {
    it('renders the app name "PodcastHub"', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      expect(container.textContent).toContain('PodcastHub');
    });
  });

  describe('main navigation links', () => {
    it('renders a Home link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/"]');
      expect(anchor).not.toBeNull();
    });

    it('renders a Technical Content link (Library)', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/bulletins"]');
      expect(anchor).not.toBeNull();
    });

    it('renders a Learning Paths link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/learning-path"]');
      expect(anchor).not.toBeNull();
    });

    it('renders Library section label', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const text = container.textContent ?? '';
      expect(text).toContain('Library');
      expect(text).toContain('Technical Content');
      expect(text).toContain('Learning Paths');
    });
  });

  describe('admin section', () => {
    it('renders the Admin section when isAdmin={true}', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} isAdmin={true} />);
      const dashboardLink = container.querySelector('a[href="/admin"]');
      expect(dashboardLink).not.toBeNull();
    });

    it('renders the Admin upload link when isAdmin={true}', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} isAdmin={true} />);
      const uploadLink = container.querySelector('a[href="/admin/upload"]');
      expect(uploadLink).not.toBeNull();
    });

    it('renders the "Admin" section label when isAdmin={true}', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} isAdmin={true} />);
      expect(container.textContent).toContain('Admin');
    });

    it('does NOT render the Admin dashboard link when isAdmin is false', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} isAdmin={false} />);
      const dashboardLink = container.querySelector('a[href="/admin"]');
      expect(dashboardLink).toBeNull();
    });

    it('does NOT render admin links when isAdmin is omitted', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const uploadLink = container.querySelector('a[href="/admin/upload"]');
      expect(uploadLink).toBeNull();
    });
  });
});
