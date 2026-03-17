/**
 * SidebarBookmarks — compact bookmark list for the 180px attachment sidebar.
 *
 * Key responsibilities:
 * - Fetches bookmarks for the current podcast via GET /api/bookmarks.
 * - Renders an inline add form that captures the current player timestamp.
 * - Posts new bookmarks via POST /api/bookmarks and refreshes the list.
 * - Invokes `onSeek` when a bookmark timestamp chip is clicked.
 *
 * Dependencies:
 * - stores/player-store for reading the current playback time.
 * - lib/format-time for human-readable timestamp formatting.
 * - lib/domain-colors for per-domain accent color tokens.
 * - lucide-react for the Plus icon.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePlayerStore } from '@/stores/player-store';
import { formatTime } from '@/lib/format-time';
import type { getDomainColor } from '@/lib/domain-colors';

/** Shape of a single bookmark record returned by the API. */
export interface SidebarBookmark {
  id: string;
  timestampSeconds: number;
  note: string | null;
}

/** Props for the SidebarBookmarks component. */
export interface SidebarBookmarksProps {
  /** ID of the podcast whose bookmarks are displayed. */
  podcastId: string;
  /** Callback invoked when the user clicks a bookmark to seek to its timestamp. */
  onSeek: (time: number) => void;
  /** Domain color tokens used to accent timestamp chips. */
  domainColor: ReturnType<typeof getDomainColor>;
}

/**
 * Slim bookmark list for the 180px sidebar with inline add.
 *
 * @param props.podcastId - ID of the podcast whose bookmarks are displayed.
 * @param props.onSeek - Callback to seek the player to a timestamp in seconds.
 * @param props.domainColor - Domain color tokens for timestamp accent styling.
 * @returns A compact list of bookmarks with an inline add form.
 */
export function SidebarBookmarks({ podcastId, onSeek, domainColor }: SidebarBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<SidebarBookmark[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const currentTime = usePlayerStore((s) => s.currentTime);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchBookmarks = useCallback(() => {
    fetch(`/api/bookmarks?podcastId=${podcastId}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => {
        const items = (d.data ?? []) as SidebarBookmark[];
        items.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
        setBookmarks(items);
      })
      .catch(() => {});
  }, [podcastId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  useEffect(() => {
    if (isAdding && inputRef.current) inputRef.current.focus();
  }, [isAdding]);

  /** Add bookmark at current time with optional note. */
  const handleAdd = async () => {
    const ts = Math.floor(currentTime);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId,
          timestampSeconds: ts,
          note: newNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setIsAdding(false);
        setNewNote('');
        fetchBookmarks();
      }
    } catch {
      /* non-critical */
    }
  };

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bookmarks
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          aria-label="Add bookmark"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline add form */}
      {isAdding && (
        <div className="mb-2 space-y-1.5">
          <div
            className="rounded bg-muted/60 px-1.5 py-1 text-xs font-mono tabular-nums"
            style={{ color: domainColor.border }}
          >
            {formatTime(Math.floor(currentTime))}
          </div>
          <input
            ref={inputRef}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') {
                setIsAdding(false);
                setNewNote('');
              }
            }}
            placeholder="Note (optional)..."
            className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className="flex-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewNote('');
              }}
              className="rounded px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {bookmarks.length === 0 && !isAdding ? (
        <p className="text-xs text-muted-foreground">No bookmarks yet</p>
      ) : (
        <div className="space-y-0.5">
          {bookmarks.map((bm) => (
            <button
              key={bm.id}
              onClick={() => onSeek(bm.timestampSeconds)}
              className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted"
            >
              <span
                className="shrink-0 font-mono tabular-nums"
                style={{ color: domainColor.border }}
              >
                {formatTime(bm.timestampSeconds)}
              </span>
              {bm.note && <span className="truncate text-muted-foreground">{bm.note}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
