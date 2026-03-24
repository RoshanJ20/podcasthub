/**
 * Individual navigation item for the application sidebar.
 *
 * Key responsibilities:
 * - Render a Next.js Link with icon and label
 * - Apply an amber-tinted active state when the link matches the current route
 * - In collapsed (icon-only) mode, wrap the link in a Tooltip so the label
 *   remains accessible
 *
 * Dependencies:
 * - shadcn/ui Tooltip components (base-ui based)
 * - Next.js Link for client-side navigation
 * - cn() utility for conditional class merging
 */
'use client';

import Link from 'next/link';
import type React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Props for the SidebarNavItem component.
 */
interface SidebarNavItemProps {
  /** Target URL for the navigation link. */
  href: string;
  /** Human-readable label displayed when the sidebar is expanded. */
  label: string;
  /** Lucide icon component rendered alongside (or instead of) the label. */
  icon: React.ComponentType<{ className?: string }>;
  /** Whether this item represents the currently active route. */
  isActive: boolean;
  /**
   * When true, the sidebar is in icon-only mode. The label is hidden and
   * a Tooltip is shown on hover to preserve accessibility.
   */
  collapsed?: boolean;
  /** Optional click handler, e.g., to close a mobile drawer. */
  onClick?: () => void;
}

/**
 * Renders a single navigation link for use inside the application sidebar.
 *
 * In expanded mode the icon and label are shown side-by-side. In collapsed
 * mode only the icon is rendered; a right-anchored Tooltip reveals the label.
 *
 * @param props - See {@link SidebarNavItemProps}.
 * @returns A Next.js Link element, optionally wrapped in a Tooltip.
 */
export function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed = false,
  onClick,
}: SidebarNavItemProps) {
  const linkClassName = cn(
    'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color,border-color] duration-150',
    isActive
      ? 'border border-primary/20 bg-primary/10 text-primary shadow-[0_1px_0_0_oklch(100%_0_0/.25)_inset]'
      : 'border border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
    collapsed && 'justify-center px-2'
  );

  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={linkClassName}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={link} />
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return link;
}
