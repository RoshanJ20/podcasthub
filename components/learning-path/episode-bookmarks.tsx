/**
 * EpisodeBookmarks — compact bookmark list for learning path episodes.
 *
 * Key responsibilities:
 * - Fetches bookmarks for a specific episode via GET /api/bookmarks?episodeId=.
 * - Renders a list of timestamp chips with optional notes.
 * - Invokes `onSeek` when a bookmark timestamp is clicked.
 * - Resets state when episodeId changes to prevent stale data.
 *
 * Dependencies:
 * - lib/format-time for human-readable timestamp formatting.
 * - lib/domain-colors for per-domain accent color tokens.
 * - lib/config/base-path for API URL resolution.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatTime } from '@/lib/format-time';
import type { DomainColor } from '@/lib/domain-colors';
import { withBasePath } from '@/lib/config/base-path';

/** Shape of a single episode bookmark returned by the API. */
interface EpisodeBookmark {
  id: string;
  timestampSeconds: number;
  note: string | null;
}

/** Props for the EpisodeBookmarks component. */
interface EpisodeBookmarksProps {
  /** ID of the episode whose bookmarks are displayed. */
  episodeId: string;
  /** Callback invoked when the user clicks a bookmark to seek to its timestamp. */
  onSeek: (time: number) => void;
  /** Domain color tokens used to accent timestamp chips. */
  domainColor?: DomainColor;
  /** Incremented by the parent after a quick-bookmark to trigger a refetch. */
  refreshKey?: number;
}

/**
 * Compact bookmark list for learning path episodes.
 *
 * @param props.episodeId - ID of the episode whose bookmarks are displayed.
 * @param props.onSeek - Callback to seek the episode player to a timestamp in seconds.
 * @param props.domainColor - Domain color tokens for timestamp accent styling.
 * @param props.refreshKey - Incremented after a quick bookmark to trigger refetch.
 * @returns A compact list of bookmarks for the episode, or null if empty.
 */
export function EpisodeBookmarks({
  episodeId,
  onSeek,
  domainColor,
  refreshKey,
}: EpisodeBookmarksProps) {
  const [bookmarks, setBookmarks] = useState<EpisodeBookmark[]>([]);

  /** Reset bookmarks when switching episodes to prevent stale data. */
  useEffect(() => {
    setBookmarks([]);
  }, [episodeId]);

  const fetchBookmarks = useCallback(() => {
    fetch(withBasePath(`/api/bookmarks?episodeId=${episodeId}`))
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => {
        const items = (d.data ?? []) as EpisodeBookmark[];
        items.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
        setBookmarks(items);
      })
      .catch(() => {});
  }, [episodeId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  /** Refetch when a quick bookmark is added from the player controls. */
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchBookmarks();
    }
  }, [refreshKey, fetchBookmarks]);

  if (bookmarks.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Bookmarks
      </p>
      <div className="flex flex-wrap gap-1.5">
        {bookmarks.map((bm) => (
          <button
            key={bm.id}
            onClick={() => onSeek(bm.timestampSeconds)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs transition-colors hover:bg-muted"
            aria-label={`Seek to ${formatTime(bm.timestampSeconds)}`}
          >
            <Clock className="size-3" style={{ color: domainColor?.border }} />
            <span
              className="font-mono tabular-nums"
              style={{ color: domainColor?.border ?? 'var(--primary)' }}
            >
              {formatTime(bm.timestampSeconds)}
            </span>
            {bm.note && (
              <span className="max-w-[120px] truncate text-muted-foreground">{bm.note}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
