/**
 * Admin sidebar navigation component.
 *
 * Provides navigation links for all admin sections with active link
 * highlighting. On mobile viewports, the sidebar renders as a slide-out
 * Sheet triggered by a hamburger menu button.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, Route, Users, BarChart3, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Upload', href: '/admin/upload', icon: Upload },
  { label: 'Learning Paths', href: '/admin/learning-graphs', icon: Route, disabled: true },
  { label: 'Users', href: '/admin/users', icon: Users, disabled: true },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, disabled: true },
];

/**
 * Renders the admin sidebar with navigation links.
 *
 * Desktop: always-visible vertical sidebar.
 * Mobile: collapsible Sheet triggered by a menu button.
 */
export function AdminSidebar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent pathname={pathname} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-muted/40 md:min-h-screen">
        <NavContent pathname={pathname} />
      </aside>
    </>
  );
}

/** Shared navigation content rendered in both desktop sidebar and mobile sheet. */
function NavContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="px-3 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Podcast Hub</h2>
        <p className="text-sm text-muted-foreground">Admin Panel</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground/50 cursor-not-allowed"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                <span className="ml-auto text-xs">Soon</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
