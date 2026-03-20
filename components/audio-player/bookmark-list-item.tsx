/**
 * BookmarkListItem — single bookmark row for the BookmarkPanel.
 *
 * Renders a timestamp seek button, an inline note editor (or read-only note),
 * and edit/delete action buttons. Supports both plain and motion-animated
 * list item elements controlled by the parent.
 *
 * Key responsibilities:
 * - Display bookmark timestamp as a domain-colored, clickable seek button.
 * - Toggle between read-only note display and an inline edit input.
 * - Emit edit, save, cancel, and delete events to the parent BookmarkPanel.
 *
 * Dependencies:
 * - motion/react (motion.li) — passed in as `ItemEl` by the parent
 * - lib/domain-colors — DomainColor type for accent theming
 * - lib/format-time — timestamp formatting utility
 */
'use client';

import type { ElementType } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Pencil, Trash2, Check, X } from 'lucide-react';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

/** Shape of a single bookmark record returned from the API. */
export interface Bookmark {
  id: string;
  auditBriefId: string;
  timestampSeconds: number;
  note: string | null;
  createdAt: string;
}

interface BookmarkListItemProps {
  /** The bookmark data to display. */
  bookmark: Bookmark;
  /**
   * The list-item element to render — either a plain `'li'` (reduced motion)
   * or `motion.li` (full animation). The parent controls this so that motion
   * variant props can be spread onto the element consistently.
   */
  ItemEl: ElementType;
  /** Motion/plain props spread onto the rendered ItemEl. */
  itemProps: Record<string, unknown>;
  /** ID of the bookmark currently being edited, or null if none. */
  editingId: string | null;
  /** Current value of the edit note input. */
  editNote: string;
  /** Domain color used to accent the timestamp button. */
  domainColor?: DomainColor;
  /** Called when the user clicks the timestamp to seek to that position. */
  onSeek?: (time: number) => void;
  /** Called when the user clicks the edit (pencil) button. */
  onStartEdit: (bookmark: Bookmark) => void;
  /** Called when the user confirms a note edit (Enter key or check button). */
  onSaveEdit: (id: string) => void;
  /** Called when the user cancels an in-progress note edit. */
  onCancelEdit: () => void;
  /** Called when the user clicks the delete (trash) button. */
  onDelete: (id: string) => void;
  /** Called on every keystroke in the edit note input. */
  onEditNoteChange: (value: string) => void;
}

/**
 * Renders a single bookmark row within the BookmarkPanel list.
 *
 * @param props - See BookmarkListItemProps for full documentation.
 * @returns A list item element displaying the bookmark timestamp, note, and actions.
 */
export function BookmarkListItem({
  bookmark,
  ItemEl,
  itemProps,
  editingId,
  editNote,
  domainColor,
  onSeek,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onEditNoteChange,
}: BookmarkListItemProps) {
  const isEditing = editingId === bookmark.id;

  return (
    <ItemEl
      key={bookmark.id}
      className="flex items-start gap-2 rounded-md border p-2 text-sm"
      {...itemProps}
    >
      {/* Timestamp — domain-colored, clickable to seek */}
      <button
        onClick={() => onSeek?.(bookmark.timestampSeconds)}
        className="flex shrink-0 items-center gap-1 hover:underline"
        style={{ color: domainColor?.border ?? 'var(--primary)' }}
        aria-label={`Seek to ${formatTime(bookmark.timestampSeconds)}`}
      >
        <Clock className="h-3 w-3" />
        {formatTime(bookmark.timestampSeconds)}
      </button>

      {/* Note display or edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              value={editNote}
              onChange={(e) => onEditNoteChange(e.target.value)}
              className="h-7 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit(bookmark.id);
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onSaveEdit(bookmark.id)}
              aria-label="Save note"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onCancelEdit}
              aria-label="Cancel edit"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground truncate">{bookmark.note || '—'}</span>
        )}
      </div>

      {/* Action buttons — hidden while this row is being edited */}
      {!isEditing && (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onStartEdit(bookmark)}
            aria-label="Edit note"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onDelete(bookmark.id)}
            aria-label="Delete bookmark"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </ItemEl>
  );
}
