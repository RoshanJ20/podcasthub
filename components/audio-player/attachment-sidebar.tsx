/**
 * AttachmentSidebar — file list panel rendered in the 180px right sidebar.
 *
 * Key responsibilities:
 * - Renders the list of bulletin attachment URLs as clickable file buttons.
 * - Highlights the currently active attachment with domain accent colors.
 * - Delegates open/close logic to the parent via `onOpen`.
 *
 * Dependencies:
 * - lib/attachment-utils for extracting human-readable filenames from URLs.
 * - lib/domain-colors for per-domain color tokens.
 * - lucide-react for the FileText icon.
 * - next-themes for resolving the current color scheme.
 */
'use client';

import { FileText } from 'lucide-react';
import { useTheme } from 'next-themes';
import { extractAttachmentName } from '@/lib/attachment-utils';
import type { getDomainColor } from '@/lib/domain-colors';

/** Props for the AttachmentSidebar component. */
export interface AttachmentSidebarProps {
  /** List of attachment URLs belonging to the auditBrief. */
  bulletinUrls: string[];
  /** URL of the currently open attachment, or null when no panel is open. */
  activeAttachmentUrl: string | null;
  /** Domain color tokens used to style the active attachment highlight. */
  domainColor: ReturnType<typeof getDomainColor>;
  /** Callback invoked when the user clicks an attachment button. */
  onOpen: (url: string) => void;
}

/**
 * Renders the attachment file list inside the sticky sidebar.
 *
 * @param props.bulletinUrls - Ordered list of attachment URLs to display.
 * @param props.activeAttachmentUrl - URL of the currently viewed attachment.
 * @param props.domainColor - Domain color tokens for active-item styling.
 * @param props.onOpen - Handler called with the selected URL when clicked.
 * @returns A scrollable list of attachment buttons with active-state styling.
 */
export function AttachmentSidebar({
  bulletinUrls,
  activeAttachmentUrl,
  domainColor,
  onOpen,
}: AttachmentSidebarProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div data-testid="attachment-sidebar" className="space-y-1.5 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Attachments
      </h3>
      {bulletinUrls.map((url, index) => {
        const isActive = activeAttachmentUrl === url;
        return (
          <button
            key={url}
            data-testid={`attachment-file-${index}`}
            data-active={isActive ? 'true' : 'false'}
            title={url.split('/').pop() ?? `Attachment ${index + 1}`}
            onClick={() => onOpen(url)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 ${
              isActive ? 'font-medium' : 'hover:bg-muted'
            }`}
            style={
              isActive
                ? {
                    backgroundColor: isDark ? domainColor.darkBg : domainColor.bg,
                    color: isDark ? domainColor.darkText : domainColor.text,
                    borderLeft: `3px solid ${domainColor.border}`,
                  }
                : undefined
            }
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{extractAttachmentName(url, index)}</span>
          </button>
        );
      })}
    </div>
  );
}
