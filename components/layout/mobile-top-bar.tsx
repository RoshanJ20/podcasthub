/**
 * Top navigation bar for mobile viewports.
 *
 * Key responsibilities:
 * - Render a slim (h-12) bar visible only on small screens (hidden on md+)
 * - Provide a hamburger button that opens a left-anchored Sheet with the full
 *   sidebar navigation (main, personal, admin links, now-playing, user profile)
 * - Display a centred logo mark and app name
 * - Provide a theme toggle (Sun / Moon) on the right
 *
 * Dependencies:
 * - lib/navigation-config — mainLinks, personalLinks, adminLinks, isRouteActive
 * - components/layout/sidebar-nav-item — SidebarNavItem
 * - components/layout/sidebar-now-playing — SidebarNowPlaying
 * - components/layout/sidebar-user-profile — SidebarUserProfile
 * - shadcn/ui Sheet, Button, Separator
 * - next-themes — useTheme for dark/light toggle
 */
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Library, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import { SidebarNowPlaying } from '@/components/layout/sidebar-now-playing';
import { SidebarUserProfile } from '@/components/layout/sidebar-user-profile';
import { mainLinks, personalLinks, adminLinks, isRouteActive } from '@/lib/navigation-config';

/**
 * Props for the MobileTopBar component.
 */
interface MobileTopBarProps {
  /** Full display name of the authenticated user. */
  userName: string;
  /** Role label, e.g. `"Admin"` or `"Member"`. */
  userRole: string;
  /**
   * When true, the admin navigation section is rendered inside the drawer.
   * Should only be true for users with the admin role.
   */
  isAdmin?: boolean;
}

/**
 * Slim top bar rendered on mobile viewports (hidden on md and above).
 *
 * The hamburger button opens a shadcn Sheet from the left side of the screen.
 * Inside the Sheet the full sidebar navigation is replicated: every nav item
 * receives an onClick handler that closes the drawer so navigation feels
 * instant and natural on touch devices.
 *
 * @param props - See {@link MobileTopBarProps}.
 */
export function MobileTopBar({ userName, userRole, isAdmin = false }: MobileTopBarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  /** Closes the navigation drawer. Passed to every SidebarNavItem. */
  const closeDrawer = () => setOpen(false);

  /** Toggles between dark and light themes. */
  const handleThemeToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header
      data-testid="mobile-top-bar"
      className="flex h-12 items-center justify-between border-b border-border bg-background px-3 md:hidden"
    >
      {/* ── Left: hamburger drawer trigger ─────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
              className="size-9"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>

        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center gap-2 px-4 py-4">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-orange-500">
                <Library className="size-4 text-white" />
              </div>
              <span className="text-sm font-semibold tracking-tight">PodcastHub</span>
            </div>

            <Separator />

            {/* Scrollable nav links */}
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
              {/* Main navigation */}
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Main
              </p>
              {mainLinks.map((link) => (
                <SidebarNavItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  isActive={isRouteActive(link.href, pathname)}
                  onClick={closeDrawer}
                />
              ))}

              <div className="my-1" />

              {/* Personal links */}
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Your Stuff
              </p>
              {personalLinks.map((link) => (
                <SidebarNavItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  isActive={isRouteActive(link.href, pathname)}
                  onClick={closeDrawer}
                />
              ))}

              {/* Admin section — conditional on isAdmin prop */}
              {isAdmin && (
                <>
                  <div className="my-1" />
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Admin
                  </p>
                  {adminLinks.map((link) => (
                    <SidebarNavItem
                      key={link.href}
                      href={link.href}
                      label={link.label}
                      icon={link.icon}
                      isActive={isRouteActive(link.href, pathname)}
                      onClick={closeDrawer}
                    />
                  ))}
                </>
              )}
            </nav>

            {/* Now Playing widget */}
            <div className="py-2">
              <SidebarNowPlaying collapsed={false} />
            </div>

            <Separator />

            {/* User profile */}
            <div className="px-2 py-2">
              <SidebarUserProfile name={userName} role={userRole} collapsed={false} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Centre: logo + app name ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-orange-500">
          <Library className="size-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">PodcastHub</span>
      </div>

      {/* ── Right: theme toggle ──────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={handleThemeToggle}
        className="size-9"
      >
        {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </Button>
    </header>
  );
}
