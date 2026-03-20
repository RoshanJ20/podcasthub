/**
 * @file use-favorites.ts
 * @description Custom React hook for managing the current user's favorite audit briefs.
 *
 * Key responsibilities:
 * - Fetches the user's current favorite audit brief IDs on mount
 * - Provides an optimistic toggle function to add/remove favorites
 * - Reverts optimistic state on API failure or network error
 *
 * Dependencies:
 * - /api/favorites (GET to fetch IDs, POST to toggle)
 *
 * Usage:
 * ```tsx
 * const { isFavorite, toggleFavorite, isLoading } = useFavorites();
 * const favorited = isFavorite('some-audit-brief-id');
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Manages the current user's favorite audit briefs.
 *
 * Fetches the full list of favorited audit brief IDs on mount. Exposes an
 * optimistic `toggleFavorite` function that immediately updates local state
 * and reverts if the server request fails.
 *
 * @returns An object containing:
 *   - `isFavorite` — predicate function to check if an audit brief is favorited
 *   - `toggleFavorite` — async function to add or remove a favorite (optimistic)
 *   - `isLoading` — true while the initial fetch is in flight
 */
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /**
     * Fetches all favorited audit brief IDs for the current user.
     * Silently no-ops if the user is unauthenticated or the request fails,
     * leaving `favoriteIds` as an empty set.
     */
    async function fetchFavorites() {
      try {
        const res = await fetch('/api/favorites');
        if (!res.ok) return;
        const json = (await res.json()) as { data: string[] };
        setFavoriteIds(new Set(json.data));
      } catch {
        // Not logged in or network error — treat as no favorites
      } finally {
        setIsLoading(false);
      }
    }
    fetchFavorites();
  }, []);

  /**
   * Toggles the favorite status of an audit brief with optimistic UI.
   *
   * Immediately flips the local state, then fires a POST to /api/favorites.
   * If the request fails for any reason, the local state is reverted to its
   * prior value to keep the UI consistent with the server.
   *
   * @param auditBriefId - The ID of the audit brief to add or remove from favorites
   */
  const toggleFavorite = useCallback(async (auditBriefId: string) => {
    // Helper to flip the presence of auditBriefId in a set — used for both
    // the optimistic update and the revert on failure.
    const flipId = (prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      if (next.has(auditBriefId)) {
        next.delete(auditBriefId);
      } else {
        next.add(auditBriefId);
      }
      return next;
    };

    // Optimistic update — flip immediately so the UI responds without waiting
    setFavoriteIds(flipId);

    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditBriefId }),
      });

      if (!res.ok) {
        // Server rejected the change — revert by flipping again
        setFavoriteIds(flipId);
      }
    } catch {
      // Network error — revert by flipping again
      setFavoriteIds(flipId);
    }
  }, []);

  /**
   * Returns whether the given audit brief ID is in the current user's favorites.
   *
   * @param id - The audit brief ID to check
   * @returns `true` if the audit brief is favorited, `false` otherwise
   */
  const isFavorite = useCallback((id: string): boolean => favoriteIds.has(id), [favoriteIds]);

  return { isFavorite, toggleFavorite, isLoading };
}
