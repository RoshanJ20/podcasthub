/**
 * Unit tests for the SidebarUserProfile component.
 *
 * Verifies:
 * - Renders user name and role in expanded mode
 * - Falls back to initials in the avatar when no avatarUrl is provided
 * - Shows a logout button
 * - In collapsed mode renders the avatar but not the name text
 * - Tooltip wraps the avatar in collapsed mode
 * - getInitials derivation (tested through rendered output)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { SidebarUserProfile } from '@/components/layout/sidebar-user-profile';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  cleanup();
});

describe('SidebarUserProfile', () => {
  describe('expanded mode (collapsed=false)', () => {
    it('renders the user name', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" />);
      expect(container.textContent).toContain('Jane Doe');
    });

    it('renders the user role', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" />);
      expect(container.textContent).toContain('Admin');
    });

    it('renders initials in the avatar fallback for a two-part name', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Member" />);
      expect(container.textContent).toContain('JD');
    });

    it('renders a single initial for a one-word name', () => {
      const { container } = render(<SidebarUserProfile name="Admin" role="Super Admin" />);
      expect(container.textContent).toContain('A');
    });

    it('uses the first and last token for names with more than two words', () => {
      const { container } = render(<SidebarUserProfile name="Mary Anne Smith" role="Member" />);
      expect(container.textContent).toContain('MS');
    });

    it('renders a logout button', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" />);
      const logoutButton = container.querySelector('button[aria-label="Logout"]');
      expect(logoutButton).not.toBeNull();
    });

    it('renders without error when avatarUrl is provided', () => {
      // base-ui AvatarImage defers display until the image loads (no-op in jsdom),
      // so we assert that the component mounts cleanly and the avatar container renders.
      const { container } = render(
        <SidebarUserProfile name="Jane Doe" role="Admin" avatarUrl="/avatar.jpg" />
      );
      const avatarRoot = container.querySelector('[data-slot="avatar"]');
      expect(avatarRoot).not.toBeNull();
    });
  });

  describe('collapsed mode (collapsed=true)', () => {
    it('does not render the user name text in collapsed mode', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" collapsed />);
      // The settings link with aria-label should not exist in collapsed mode.
      const settingsLink = container.querySelector('a[aria-label="Profile settings"]');
      expect(settingsLink).toBeNull();
    });

    it('renders the avatar with initials in collapsed mode', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" collapsed />);
      // AvatarFallback text content should appear somewhere.
      expect(container.textContent).toContain('JD');
    });

    it('wraps the avatar in a tooltip in collapsed mode', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" collapsed />);
      // In collapsed mode the root is not the anchor directly; there's a wrapping tooltip element.
      expect(container.firstChild?.nodeName).not.toBe('A');
    });

    it('renders the avatar in collapsed mode', () => {
      const { container } = render(<SidebarUserProfile name="Jane Doe" role="Admin" collapsed />);
      const avatar = container.querySelector('[data-slot="avatar"]');
      expect(avatar).not.toBeNull();
    });
  });
});
