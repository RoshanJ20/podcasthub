/**
 * Shared navigation link configuration for sidebar and mobile nav.
 *
 * Single source of truth for all application navigation items.
 * Consumed by sidebar, mobile nav, and any other navigation surface.
 *
 * Key responsibilities:
 * - Define main, library, personal, and admin nav link arrays
 * - Split admin links into content-management and insights sub-sections so
 *   the desktop sidebar can render a clear hierarchy; also expose the flat
 *   `adminLinks` concatenation for mobile nav and the command palette.
 * - Provide the isRouteActive helper for highlighting active links
 */
import {
  Home,
  Headphones,
  Route,
  BarChart3,
  Users,
  Library,
  Workflow,
  ClipboardList,
} from 'lucide-react';
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
export const personalLinks: NavLink[] = [{ href: '/progress', label: 'Progress', icon: BarChart3 }];

/**
 * Admin "Content Management" section — list views and create flows for both
 * content types. Reaches the brief and learning-graph management tables that
 * were previously only accessible by typing the URL directly.
 */
export const adminContentLinks: NavLink[] = [
  { href: '/admin', label: 'Technical Content', icon: Library },
  { href: '/admin/learning-graphs', label: 'Learning Series', icon: Workflow },
  { href: '/admin/upload', label: 'New Technical Content', icon: Headphones },
  { href: '/admin/learning-graphs/new', label: 'New Learning Series', icon: Route },
];

/**
 * Admin "Insights" section — analytics, audit log, and user management.
 */
export const adminInsightsLinks: NavLink[] = [
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', icon: Users },
];

/**
 * Flat concatenation of all admin links.
 *
 * Preserved so mobile nav and command palette (which do not render section
 * headers) continue to enumerate every admin destination in order.
 */
export const adminLinks: NavLink[] = [...adminContentLinks, ...adminInsightsLinks];

/** Checks whether `pathname` matches `href` exactly or as a path-boundary child. */
function matchesWithBoundary(href: string, pathname: string): boolean {
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

/**
 * Determines whether a nav link should be highlighted as the active route.
 *
 * Root paths (`/` and `/admin`) require an exact match to avoid false
 * positives on every descendant route. All other hrefs use a longest-prefix
 * match with a path-boundary check: a link is active only when its href is
 * the most specific nav href that matches `pathname`. This prevents a list
 * route (e.g. `/admin/learning-graphs`) from highlighting alongside its
 * create route (e.g. `/admin/learning-graphs/new`).
 *
 * @param href     - The link's target href.
 * @param pathname - The current URL pathname from `usePathname()`.
 * @returns `true` when the link should be shown as active.
 *
 * @example
 * isRouteActive('/bulletins', '/bulletins/some-id')                   // true
 * isRouteActive('/admin/learning-graphs', '/admin/learning-graphs/new') // false
 * isRouteActive('/', '/bulletins')                                   // false (exact only)
 */
export function isRouteActive(href: string, pathname: string): boolean {
  // Root-level paths need exact matching to avoid highlighting on every page.
  if (href === '/' || href === '/admin') return pathname === href;

  if (!matchesWithBoundary(href, pathname)) return false;

  // Longest-prefix-wins: if a more specific nav href also matches, defer to it.
  const allHrefs = [...mainLinks, ...libraryLinks, ...personalLinks, ...adminLinks].map(
    (link) => link.href
  );

  for (const otherHref of allHrefs) {
    if (otherHref === href) continue;
    // Root hrefs use exact-match semantics, so they never override a deeper match.
    if (otherHref === '/' || otherHref === '/admin') continue;
    if (otherHref.length > href.length && matchesWithBoundary(otherHref, pathname)) {
      return false;
    }
  }
  return true;
}
