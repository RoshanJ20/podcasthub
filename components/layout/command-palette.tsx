/**
 * Command palette (⌘K) for quick navigation and actions.
 *
 * @module components/layout/command-palette
 *
 * @description
 * Provides a keyboard-accessible command palette triggered by ⌘K (or Ctrl+K).
 * Uses shadcn Command component (cmdk) for accessible command search.
 *
 * Key responsibilities:
 * - Register global keyboard shortcut (⌘K / Ctrl+K) to open/close the palette
 * - Display navigable sections: Pages, Actions, Admin (conditional on isAdmin prop)
 * - Navigate to selected routes via Next.js router
 * - Toggle light/dark theme via next-themes
 *
 * Dependencies:
 * - @/components/ui/command — shadcn cmdk wrapper
 * - next/navigation — client-side routing
 * - next-themes — theme toggling
 * - lucide-react — icons
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Home,
  Library,
  Route,
  Search,
  User,
  BarChart3,
  Sun,
  Moon,
  LayoutDashboard,
  Upload,
  Users,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

/** Props for the CommandPalette component. */
interface CommandPaletteProps {
  /** When true, renders the Admin section with admin-only navigation items. */
  isAdmin?: boolean;
}

/**
 * CommandPalette — global ⌘K command palette for quick navigation and actions.
 *
 * @param props - Component props.
 * @param props.isAdmin - Whether to display admin-only navigation items.
 * @returns The command dialog, rendered into a portal when open.
 *
 * @example
 * // In a layout component, after resolving the current user's role:
 * <CommandPalette isAdmin={currentUser.role === 'ADMIN'} />
 */
export function CommandPalette({ isAdmin = false }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  /**
   * Registers a document-level keydown listener for ⌘K / Ctrl+K.
   * Cleans up on unmount to prevent memory leaks.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Closes the palette and navigates to the given path.
   *
   * @param path - The route path to navigate to.
   */
  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, episodes, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => navigate('/')}>
            <Home className="mr-2 size-4" />
            Home
          </CommandItem>
          <CommandItem onSelect={() => navigate('/bulletins')}>
            <Library className="mr-2 size-4" />
            Library
          </CommandItem>
          <CommandItem onSelect={() => navigate('/learning-path')}>
            <Route className="mr-2 size-4" />
            Learning Paths
          </CommandItem>
          <CommandItem onSelect={() => navigate('/search')}>
            <Search className="mr-2 size-4" />
            Search
          </CommandItem>
          <CommandItem onSelect={() => navigate('/profile')}>
            <User className="mr-2 size-4" />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => navigate('/progress')}>
            <BarChart3 className="mr-2 size-4" />
            Progress
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
              setOpen(false);
            }}
          >
            {theme === 'dark' ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
            Toggle Theme
          </CommandItem>
        </CommandGroup>

        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              <CommandItem onSelect={() => navigate('/admin')}>
                <LayoutDashboard className="mr-2 size-4" />
                Dashboard
              </CommandItem>
              <CommandItem onSelect={() => navigate('/admin/upload')}>
                <Upload className="mr-2 size-4" />
                Upload
              </CommandItem>
              <CommandItem onSelect={() => navigate('/admin/users')}>
                <Users className="mr-2 size-4" />
                Users
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
