/**
 * Unit tests for the UnifiedSidebar component.
 *
 * Verifies:
 * - The app logo and name "PodcastHub" are rendered
 * - All main nav links (Home, Library, Learning Paths, Search) are rendered
 * - Personal links (Progress, Profile) are rendered
 * - The Admin section renders when isAdmin={true}
 * - The Admin section does NOT render when isAdmin is false or undefined
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { UnifiedSidebar } from '@/components/layout/unified-sidebar';
import { usePlayerStore } from '@/stores/player-store';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock usePathname so the sidebar can determine active links.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Mock the player store — sidebar tests don't exercise playback state.
vi.mock('@/stores/player-store', () => ({
  usePlayerStore: vi.fn(() => null),
}));

// Mock next/image — jsdom does not implement it; replace with a plain <img>.
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// Mock motion/react — no animation in jsdom; render children directly.
vi.mock('motion/react', () => ({
  motion: {
    aside: ({ children, className, style, ...rest }: React.HTMLAttributes<HTMLElement>) => (
      <aside className={className} style={style} {...rest}>
        {children}
      </aside>
    ),
  },
}));

// Suppress matchMedia errors in jsdom — useReducedMotion relies on it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Default props shared across most tests. */
const DEFAULT_PROPS = {
  userName: 'Jane Doe',
  userRole: 'Member',
};

beforeEach(() => {
  cleanup();
  // Ensure the player store mock always returns null (no podcast loaded).
  vi.mocked(usePlayerStore).mockReturnValue(null as unknown as ReturnType<typeof usePlayerStore>);
  // Clear any persisted collapse state between tests.
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

    it('renders a Library link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/bulletins"]');
      expect(anchor).not.toBeNull();
    });

    it('renders a Learning Paths link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/learning-path"]');
      expect(anchor).not.toBeNull();
    });

    it('renders a Search link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/search"]');
      expect(anchor).not.toBeNull();
    });

    it('renders all main nav link labels', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const text = container.textContent ?? '';
      expect(text).toContain('Home');
      expect(text).toContain('Library');
      expect(text).toContain('Learning Paths');
      expect(text).toContain('Search');
    });
  });

  describe('personal links', () => {
    it('renders a Progress link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      const anchor = container.querySelector('a[href="/progress"]');
      expect(anchor).not.toBeNull();
    });

    it('renders a Profile link', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} />);
      // Profile link appears in nav and in the user profile section.
      const anchors = container.querySelectorAll('a[href="/profile"]');
      expect(anchors.length).toBeGreaterThan(0);
    });
  });

  describe('admin section', () => {
    it('renders the Admin section when isAdmin={true}', () => {
      const { container } = render(<UnifiedSidebar {...DEFAULT_PROPS} isAdmin={true} />);
      // The admin dashboard link is only present for admin users.
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
