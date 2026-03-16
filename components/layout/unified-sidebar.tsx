/**
 * Unified application sidebar for desktop viewports.
 *
 * Key responsibilities:
 * - Render the full application navigation (main, personal, and optional admin links)
 * - Display a "Now Playing" widget and the current user's profile at the bottom
 * - Support collapsible icon-only mode with state persisted to localStorage
 * - Animate width transitions via Motion (spring physics) unless the user prefers
 *   reduced motion, in which case a plain styled aside is rendered instead
 *
 * Dependencies:
 * - lib/navigation-config — mainLinks, personalLinks, adminLinks, isRouteActive
 * - components/layout/sidebar-nav-item — SidebarNavItem
 * - components/layout/sidebar-now-playing — SidebarNowPlaying
 * - components/layout/sidebar-user-profile — SidebarUserProfile
 * - lib/animation — transitions spring configs
 * - hooks/use-reduced-motion — useReducedMotion
 * - motion/react — motion.aside for animated width
 * - shadcn/ui Button, Separator
 */
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Library, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import { SidebarNowPlaying } from '@/components/layout/sidebar-now-playing';
import { SidebarUserProfile } from '@/components/layout/sidebar-user-profile';
import { mainLinks, personalLinks, adminLinks, isRouteActive } from '@/lib/navigation-config';
import { transitions } from '@/lib/animation';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';

/** Width of the expanded sidebar in pixels. */
const EXPANDED_WIDTH = 240;

/** Width of the collapsed (icon-only) sidebar in pixels. */
const COLLAPSED_WIDTH = 56;

/** localStorage key used to persist the collapsed state across page loads. */
const STORAGE_KEY = 'sidebar-collapsed';

/**
 * Props for the UnifiedSidebar component.
 */
interface UnifiedSidebarProps {
  /** Full display name of the authenticated user. */
  userName: string;
  /** Role label shown below the user's name, e.g. `"Admin"` or `"Member"`. */
  userRole: string;
  /**
   * When true, the admin navigation section is rendered.
   * Should only be set for users with the admin role.
   */
  isAdmin?: boolean;
}

/**
 * Section heading rendered above a group of nav links.
 *
 * Hidden entirely in collapsed mode to keep the icon-only layout clean.
 *
 * @param label - The uppercase section label text.
 * @param collapsed - Whether the sidebar is in collapsed mode.
 */
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;

  return (
    <p
      className={cn(
        'px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'
      )}
    >
      {label}
    </p>
  );
}

/**
 * Desktop-only sidebar providing primary, personal, and admin navigation.
 *
 * Hidden on mobile via `hidden md:flex` — the MobileTopBar handles small
 * viewports. Collapse state is initialised from localStorage and persisted on
 * every toggle so the user's preference survives page loads.
 *
 * When the user has not opted into reduced motion, the sidebar width is
 * animated via a `motion.aside` element using a spring transition. When
 * reduced motion is preferred, a plain `<aside>` with an inline style is
 * rendered to avoid any animation overhead.
 *
 * @param props - See {@link UnifiedSidebarProps}.
 */
export function UnifiedSidebar({ userName, userRole, isAdmin = false }: UnifiedSidebarProps) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const { theme, setTheme } = useTheme();

  // Initialise from localStorage if available; default to expanded.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  });

  // Persist collapse preference whenever it changes.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  /**
   * Shared inner content rendered inside both the motion and static aside
   * variants. Extracted to avoid duplication.
   */
  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={cn('flex items-center gap-2 px-3 py-4', collapsed && 'justify-center px-2')}>
        {/* Logo mark */}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-orange-500">
          <Library className="size-4 text-white" />
        </div>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center justify-between">
            <span className="text-sm font-semibold tracking-tight">PodcastHub</span>
            {/* ⌘K badge */}
            <kbd
              aria-label="Open command palette with Command K"
              className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Scrollable nav area ─────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        {/* Main navigation */}
        <SectionLabel label="Main" collapsed={collapsed} />
        {mainLinks.map((link) => (
          <SidebarNavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            isActive={isRouteActive(link.href, pathname)}
            collapsed={collapsed}
          />
        ))}

        <div className="my-1" />

        {/* Personal links */}
        <SectionLabel label="Your Stuff" collapsed={collapsed} />
        {personalLinks.map((link) => (
          <SidebarNavItem
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
            isActive={isRouteActive(link.href, pathname)}
            collapsed={collapsed}
          />
        ))}

        {/* Admin section — only rendered for admin users */}
        {isAdmin && (
          <>
            <div className="my-1" />
            <SectionLabel label="Admin" collapsed={collapsed} />
            {adminLinks.map((link) => (
              <SidebarNavItem
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
                isActive={isRouteActive(link.href, pathname)}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>

      {/* ── Now Playing widget ──────────────────────────────────────────── */}
      <div className="px-0 py-2">
        <SidebarNowPlaying collapsed={collapsed} />
      </div>

      <Separator />

      {/* ── User profile ────────────────────────────────────────────────── */}
      <div className="px-2 py-2">
        <SidebarUserProfile name={userName} role={userRole} collapsed={collapsed} />
      </div>

      <Separator />

      {/* ── Theme toggle + Collapse toggle ────────────────────────────── */}
      <div
        className={cn(
          'flex items-center px-2 py-2',
          collapsed ? 'flex-col gap-1' : 'justify-between'
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="size-7"
        >
          <Sun className="size-3.5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-3.5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((prev) => !prev)}
          className="size-7"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>
    </div>
  );

  const baseClassName =
    'hidden md:flex md:flex-col border-r border-border bg-sidebar overflow-hidden shrink-0 sticky top-0 h-screen';

  // Use a plain aside when the user prefers reduced motion to avoid
  // any Motion overhead or janky zero-duration spring physics.
  if (prefersReducedMotion) {
    return (
      <aside data-testid="unified-sidebar" className={baseClassName} style={{ width }}>
        {sidebarContent}
      </aside>
    );
  }

  return (
    <motion.aside
      data-testid="unified-sidebar"
      className={baseClassName}
      animate={{ width }}
      transition={transitions.slow}
    >
      {sidebarContent}
    </motion.aside>
  );
}
