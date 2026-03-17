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
import { BookmarkPlus, Pencil, Trash2, Clock, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';

interface Bookmark {
  id: string;
  podcastId: string;
  timestampSeconds: number;
  note: string | null;
  createdAt: string;
}

interface BookmarkPanelProps {
  podcastId: string;
  onSeek?: (time: number) => void;
  /** Domain color for accent theming. */
  domainColor?: DomainColor;
}

export function BookmarkPanel({ podcastId, onSeek, domainColor }: BookmarkPanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
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
      console.warn('Failed to fetch bookmarks:', error);
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
                <ItemEl
                  key={bm.id}
                  className="flex items-start gap-2 rounded-md border p-2 text-sm"
                  {...itemMotionProps(bm.id)}
                >
                  {/* Timestamp — domain-colored, clickable to seek */}
                  <button
                    onClick={() => onSeek?.(bm.timestampSeconds)}
                    className="flex shrink-0 items-center gap-1 hover:underline"
                    style={{ color: domainColor?.border ?? 'var(--primary)' }}
                    aria-label={`Seek to ${formatTime(bm.timestampSeconds)}`}
                  >
                    <Clock className="h-3 w-3" />
                    {formatTime(bm.timestampSeconds)}
                  </button>

                  {/* Note display or edit */}
                  <div className="flex-1 min-w-0">
                    {editingId === bm.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="h-7 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(bm.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => saveEdit(bm.id)}
                          aria-label="Save note"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={cancelEdit}
                          aria-label="Cancel edit"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground truncate">{bm.note || '—'}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {editingId !== bm.id && (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => startEdit(bm)}
                        aria-label="Edit note"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleDelete(bm.id)}
                        aria-label="Delete bookmark"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </ItemEl>
              ))}
            </AnimatePresence>
          </ListEl>
        </ScrollArea>
      )}
    </div>
  );
}
