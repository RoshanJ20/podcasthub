/**
 * Bookmark panel for the podcast detail page.
 *
 * Displays a staggered-animated list of user bookmarks sorted by timestamp.
 * Supports adding, editing, deleting, and seeking to bookmarks.
 * Uses domain color for timestamp accent and layout animations for add/remove.
 *
 * Dependencies:
 * - motion/react for stagger entrance and layout animations
 * - lib/animation for transition/variant tokens
 * - lib/domain-colors for DomainColor type
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayerStore } from '@/stores/player-store';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { variants, transitions, staggerContainer } from '@/lib/animation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookmarkPlus, X, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';
import { createLogger } from '@/lib/logger';
import { BookmarkListItem, type Bookmark } from './bookmark-list-item';

const log = createLogger('bookmark-panel');

interface BookmarkPanelProps {
  podcastId: string;
  onSeek?: (time: number) => void;
  /** Domain color for accent theming. */
  domainColor?: DomainColor;
  /** When true, renders a collapsed header with bookmark count badge, expandable on click. */
  compact?: boolean;
}

export function BookmarkPanel({
  podcastId,
  onSeek,
  domainColor,
  compact = false,
}: BookmarkPanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const reducedMotion = useReducedMotion();

  const currentTime = usePlayerStore((s) => s.currentTime);

  const fetchBookmarks = useCallback(async () => {
    try {
      const response = await fetch(`/api/bookmarks?podcastId=${podcastId}`);
      if (!response.ok) return;
      const bookmarksResponse = await response.json();
      const items: Bookmark[] = bookmarksResponse.data ?? [];
      items.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
      setBookmarks(items);
    } catch (error) {
      log.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to fetch bookmarks'
      );
    } finally {
      setLoading(false);
    }
  }, [podcastId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  /** Add a bookmark at the current playback time. */
  const handleAdd = async () => {
    if (!addingNote) {
      setAddingNote(true);
      return;
    }

    const timestampSeconds = Math.floor(currentTime);
    try {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId,
          timestampSeconds,
          note: newNote.trim() || undefined,
        }),
      });
      if (!response.ok) {
        toast.error('Failed to add bookmark');
        return;
      }
      toast.success(`Bookmark added at ${formatTime(timestampSeconds)}`);
      setAddingNote(false);
      setNewNote('');
      await fetchBookmarks();
    } catch {
      toast.error('Failed to add bookmark');
    }
  };

  /** Cancel adding a bookmark. */
  const cancelAdd = () => {
    setAddingNote(false);
    setNewNote('');
  };

  /** Delete a bookmark. */
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/bookmarks/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        toast.error('Failed to delete bookmark');
        return;
      }
      await fetchBookmarks();
    } catch {
      toast.error('Failed to delete bookmark');
    }
  };

  /** Start editing a bookmark note. */
  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditNote(bookmark.note ?? '');
  };

  /** Save an edited bookmark note. */
  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/bookmarks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editNote.trim() }),
      });
      if (!response.ok) {
        toast.error('Failed to update bookmark');
        return;
      }
      setEditingId(null);
      setEditNote('');
      await fetchBookmarks();
    } catch {
      toast.error('Failed to update bookmark');
    }
  };

  /** Cancel editing. */
  const cancelEdit = () => {
    setEditingId(null);
    setEditNote('');
  };

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading bookmarks...</div>;
  }

  /* Compact collapsed view: header with bookmark count badge, expandable on click. */
  if (compact && !isExpanded) {
    return (
      <div className="rounded-xl border border-border bg-card p-3">
        <button
          onClick={() => setIsExpanded(true)}
          aria-label="Toggle bookmarks"
          className="flex w-full items-center justify-between text-sm"
        >
          <span className="font-medium">Bookmarks</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
            {bookmarks.length}
          </span>
        </button>
      </div>
    );
  }

  /** Use animated or plain elements depending on reduced-motion preference. */
  const ListEl = reducedMotion ? 'ul' : motion.ul;
  const ItemEl = reducedMotion ? 'li' : motion.li;

  const listProps = reducedMotion
    ? {}
    : { variants: staggerContainer, initial: 'hidden' as const, animate: 'visible' as const };

  const itemMotionProps = (id: string) =>
    reducedMotion
      ? {}
      : {
          key: id,
          layout: true as const,
          variants: variants.fadeUp,
          transition: transitions.normal,
          exit: { opacity: 0, x: -20, transition: transitions.fast },
        };

  return (
    <div className="space-y-4 p-4">
      {/* Compact expanded header: collapse button to return to collapsed state */}
      {compact && isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          aria-label="Toggle bookmarks"
          className="flex w-full items-center justify-between text-sm"
        >
          <span className="font-medium">Bookmarks</span>
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Add bookmark controls */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleAdd} aria-label="Add bookmark">
          <BookmarkPlus className="mr-1 h-4 w-4" />
          Add Bookmark
        </Button>
        {addingNote && (
          <>
            <Input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Optional note..."
              className="h-8 flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') cancelAdd();
              }}
            />
            <Button size="sm" variant="ghost" onClick={cancelAdd} aria-label="Cancel add">
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Bookmark list */}
      {bookmarks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No bookmarks yet. Click the bookmark button to save your place.
        </p>
      ) : (
        <ScrollArea className="max-h-100">
          <ListEl className="space-y-2" {...listProps}>
            <AnimatePresence>
              {bookmarks.map((bm) => (
                <BookmarkListItem
                  key={bm.id}
                  bookmark={bm}
                  ItemEl={ItemEl}
                  itemProps={itemMotionProps(bm.id)}
                  editingId={editingId}
                  editNote={editNote}
                  domainColor={domainColor}
                  onSeek={onSeek}
                  onStartEdit={startEdit}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  onDelete={handleDelete}
                  onEditNoteChange={setEditNote}
                />
              ))}
            </AnimatePresence>
          </ListEl>
        </ScrollArea>
      )}
    </div>
  );
}
