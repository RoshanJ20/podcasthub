/**
 * Shared navigation link configuration for sidebar and mobile nav.
 *
 * Single source of truth for all application navigation items.
 * Consumed by sidebar, mobile nav, and any other navigation surface.
 *
 * Key responsibilities:
 * - Define main, personal, and admin nav link arrays
 * - Export the NavLink interface for type-safe consumers
 * - Provide the isRouteActive helper for highlighting active links
 */
import { Home, Headphones, Route, BarChart3, User, LayoutDashboard, Users } from 'lucide-react';
import type React from 'react';

/**
 * Represents a single navigation link entry.
 */
export interface NavLink {
  /** Target URL for the link. */
  href: string;
  /** Human-readable label shown in the UI. */
  label: string;
  /** Lucide icon component to render beside the label. */
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Primary navigation links shown to all authenticated users.
 */
export const mainLinks: NavLink[] = [{ href: '/', label: 'Home', icon: Home }];

/**
 * Library sub-navigation — shown under the "Library" section header.
 */
export const libraryLinks: NavLink[] = [
  { href: '/bulletins', label: 'Technical Content', icon: Headphones },
  { href: '/learning-path', label: 'Learning Series', icon: Route },
];

/**
 * Personal links scoped to the current user's account.
 */
export const personalLinks: NavLink[] = [
  { href: '/progress', label: 'Progress', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: User },
];

/**
 * Admin-only navigation links. Rendered only when the user holds an admin role.
 */
export const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/upload', label: 'Upload Technical Content', icon: Headphones },
  { href: '/admin/learning-graphs/new', label: 'Upload Learning Series', icon: Route },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

/**
 * Determines whether a nav link should be highlighted as the active route.
 *
 * Root paths (`/` and `/admin`) require an exact match to avoid false
 * positives on every admin sub-route. All other hrefs use a prefix match.
 *
 * @param href     - The link's target href.
 * @param pathname - The current URL pathname from `usePathname()`.
 * @returns `true` when the link should be shown as active.
 *
 * @example
 * isRouteActive('/bulletins', '/bulletins/some-id') // true
 * isRouteActive('/', '/bulletins')                   // false (exact only)
 */
export function isRouteActive(href: string, pathname: string): boolean {
  // Root-level paths need exact matching to avoid highlighting on every page.
  if (href === '/' || href === '/admin') return pathname === href;
  return pathname.startsWith(href);
}
