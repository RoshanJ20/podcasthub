/**
 * User profile section for the application sidebar.
 *
 * Key responsibilities:
 * - Display the current user's avatar (initials fallback), name, and role
 * - Provide a settings/profile link via a gear icon
 * - In collapsed mode show only the avatar with a Tooltip containing
 *   the user's name for accessibility
 *
 * Dependencies:
 * - shadcn/ui Avatar components (base-ui based)
 * - shadcn/ui Tooltip components for collapsed-mode label
 * - Next.js Link for profile navigation
 */
'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
 * In expanded mode the avatar, name, role badge, and settings link are shown.
 * In collapsed mode only the avatar is rendered with a right-anchored Tooltip.
 *
 * @param props - See {@link SidebarUserProfileProps}.
 */
export function SidebarUserProfile({
  name,
  role,
  avatarUrl,
  collapsed = false,
}: SidebarUserProfileProps) {
  const initials = getInitials(name);

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
            <TooltipTrigger
              render={
                <Link href="/profile" aria-label={`${name} — go to profile`}>
                  {avatar}
                </Link>
              }
            />
            <TooltipContent side="right">{name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div
      data-testid="sidebar-user-profile"
      className={cn('flex items-center gap-3 rounded-lg px-3 py-2', 'border-t border-border pt-3')}
    >
      {avatar}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>

      <Link
        href="/profile"
        aria-label="Profile settings"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Settings className="size-4" />
      </Link>
    </div>
  );
}
