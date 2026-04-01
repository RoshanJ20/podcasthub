/**
 * User profile section for the application sidebar.
 *
 * Key responsibilities:
 * - Display the current user's avatar (initials fallback), name, and role
 * - Provide a logout button
 * - In collapsed mode show only the avatar with a Tooltip containing
 *   the user's name for accessibility
 *
 * Dependencies:
 * - shadcn/ui Avatar, Tooltip components
 * - Next.js Link for profile navigation
 */
'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createLogger } from '@/lib/logger';
import { withBasePath } from '@/lib/config/base-path';

const log = createLogger('sidebar-user-profile');

/**
 * Props for the SidebarUserProfile component.
 */
interface SidebarUserProfileProps {
  /** Full display name of the current user. */
  name: string;
  /** User's role label, e.g. `"Admin"` or `"Member"`. */
  role: string;
  /**
   * Optional URL to the user's avatar image. When absent the component
   * falls back to the user's initials rendered inside the avatar circle.
   */
  avatarUrl?: string | null;
  /**
   * When true, the sidebar is in collapsed (icon-only) mode. Only the
   * avatar is rendered; a Tooltip reveals the user's name on hover.
   */
  collapsed?: boolean;
}

/**
 * Derives two-character initials from a full name for the avatar fallback.
 *
 * Uses the first character of the first and last space-separated token.
 * Falls back to a single character when only one token is present.
 *
 * @param name - The user's full display name.
 * @returns Upper-cased initials, e.g. `"JD"` for `"Jane Doe"`.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Renders the current user's profile area at the bottom of the sidebar.
 *
 * In expanded mode the avatar, name, role badge, settings link, and logout
 * button are shown. In collapsed mode only the avatar is rendered with a
 * right-anchored Tooltip linking to the profile page.
 *
 * @param props - See {@link SidebarUserProfileProps}.
 */
export function SidebarUserProfile({
  name,
  role,
  avatarUrl,
  collapsed = false,
}: SidebarUserProfileProps) {
  const router = useRouter();
  const initials = getInitials(name);

  /**
   * Calls the logout API endpoint and redirects to the login page.
   */
  const handleLogout = async () => {
    try {
      await fetch(withBasePath('/api/auth/logout'), { method: 'POST' });
      router.push('/login');
    } catch (err) {
      log.error({ error: err instanceof Error ? err.message : String(err) }, 'Logout failed');
    }
  };

  const avatar = (
    <Avatar>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback aria-label={initials}>{initials}</AvatarFallback>
    </Avatar>
  );

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span aria-label={name}>{avatar}</span>} />
            <TooltipContent side="right">{name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div
      data-testid="sidebar-user-profile"
      className="flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 transition-colors hover:border-border-default dark:hover:border-border-subtle hover:bg-secondary/55"
    >
      <Avatar className="size-7 text-[11px]">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback aria-label={initials} className="text-[11px]">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>

      <button
        onClick={handleLogout}
        aria-label="Logout"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
