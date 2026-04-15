/**
 * Unit tests for the CommandPalette component.
 *
 * @module __tests__/unit/components/layout/command-palette.test
 *
 * @description
 * Tests cover:
 * - Closed state renders no input
 * - ⌘K keyboard shortcut opens the palette
 * - Page navigation items are rendered when open
 * - Admin section is hidden when isAdmin is false
 * - Admin section is shown when isAdmin is true
 *
 * The shadcn Command/cmdk components are mocked with lightweight React
 * equivalents so that jsdom compatibility issues with cmdk's internal
 * store (subscribe) do not interfere with testing component logic.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Hoisted mock component definitions — must be declared before vi.mock calls
// so that the factory functions can reference them without require().
// ---------------------------------------------------------------------------

const { mockComponents } = vi.hoisted(() => {
  /**
   * Lightweight stand-ins for the shadcn/cmdk Command components.
   * Preserves structural contracts (open, heading, onSelect) without
   * relying on cmdk's internal store which is incompatible with jsdom.
   */
  const mockComponents = {
    /** Renders children only when open is true, simulating dialog visibility. */
    CommandDialog({
      open,
      children,
    }: {
      open: boolean;
      onOpenChange?: (v: boolean) => void;
      children: React.ReactNode;
    }) {
      return open
        ? React.createElement('div', { 'data-testid': 'command-dialog' }, children)
        : null;
    },

    /** Renders a plain text input. */
    CommandInput({ placeholder }: { placeholder?: string }) {
      return React.createElement('input', { placeholder });
    },

    /** Renders children in a scrollable list wrapper. */
    CommandList({ children }: { children: React.ReactNode }) {
      return React.createElement('div', { 'data-testid': 'command-list' }, children);
    },

    /** Renders the "no results" fallback message. */
    CommandEmpty({ children }: { children: React.ReactNode }) {
      return React.createElement('div', { 'data-testid': 'command-empty' }, children);
    },

    /** Renders a labelled group of command items. */
    CommandGroup({ heading, children }: { heading?: string; children: React.ReactNode }) {
      return React.createElement(
        'div',
        {
          'data-testid': `command-group-${heading?.toLowerCase().replace(/\s+/g, '-')}`,
        },
        heading && React.createElement('span', { 'data-testid': 'group-heading' }, heading),
        children
      );
    },

    /** Renders an interactive item that fires onSelect when clicked. */
    CommandItem({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) {
      return React.createElement(
        'div',
        { role: 'option', onClick: onSelect, 'data-testid': 'command-item' },
        children
      );
    },

    /** Renders a visual divider between groups. */
    CommandSeparator() {
      return React.createElement('hr', { 'data-testid': 'command-separator' });
    },
  };

  return { mockComponents };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/command', () => mockComponents);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

// Must be imported after vi.mock declarations so mocks are applied first.
import { CommandPalette } from '@/components/layout/command-palette';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommandPalette', () => {
  // Explicit cleanup ensures document keydown listeners from each rendered
  // component are removed before the next test runs.
  afterEach(() => cleanup());

  it('should render nothing when closed', () => {
    render(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  it('should open on Cmd+K', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('should show page navigation options', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('should not show admin section when isAdmin is false', () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    // "Analytics" is an admin-only destination; it must not appear for non-admins.
    expect(screen.queryByText('Analytics')).toBeNull();
  });

  it('should show admin section when isAdmin is true', () => {
    render(<CommandPalette isAdmin />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });
});
