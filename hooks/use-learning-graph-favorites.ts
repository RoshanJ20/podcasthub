/**
 * @file use-learning-graph-favorites.ts
 * @description Custom React hook for managing the current user's favorite learning graphs.
 *
 * Key responsibilities:
 * - Fetches the user's current favorite learning graph IDs on mount
 * - Provides an optimistic toggle function to add/remove favorites
 * - Reverts optimistic state on API failure or network error
 *
 * Dependencies:
 * - /api/learning-graph-favorites (GET to fetch IDs, POST to toggle)
 *
 * Usage:
 * ```tsx
 * const { isFavorite, toggleFavorite, isLoading } = useLearningGraphFavorites();
 * const favorited = isFavorite('some-learning-graph-id');
 * ```
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { withBasePath } from '@/lib/config/base-path';

/**
 * Manages the current user's favorite learning graphs.
 *
 * Fetches the full list of favorited learning graph IDs on mount. Exposes an
 * optimistic `toggleFavorite` function that immediately updates local state
 * and reverts if the server request fails.
 *
 * @returns An object containing:
 *   - `isFavorite` — predicate function to check if a learning graph is favorited
 *   - `toggleFavorite` — async function to add or remove a favorite (optimistic)
 *   - `isLoading` — true while the initial fetch is in flight
 */
export function useLearningGraphFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    /**
     * Fetches all favorited learning graph IDs for the current user.
     * Silently no-ops if the user is unauthenticated or the request fails,
     * leaving `favoriteIds` as an empty set.
     */
    async function fetchFavorites() {
      try {
        const res = await fetch(withBasePath('/api/learning-graph-favorites'));
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
   * Toggles the favorite status of a learning graph with optimistic UI.
   *
   * Immediately flips the local state, then fires a POST to /api/learning-graph-favorites.
   * If the request fails for any reason, the local state is reverted to its
   * prior value to keep the UI consistent with the server.
   *
   * @param learningGraphId - The ID of the learning graph to add or remove from favorites
   */
  const toggleFavorite = useCallback(async (learningGraphId: string) => {
    const flipId = (prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      if (next.has(learningGraphId)) {
        next.delete(learningGraphId);
      } else {
        next.add(learningGraphId);
      }
      return next;
    };

    // Optimistic update
    setFavoriteIds(flipId);

    try {
      const res = await fetch(withBasePath('/api/learning-graph-favorites'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learningGraphId }),
      });

      if (!res.ok) {
        setFavoriteIds(flipId);
      }
    } catch {
      setFavoriteIds(flipId);
    }
  }, []);

  /**
   * Returns whether the given learning graph ID is in the current user's favorites.
   *
   * @param id - The learning graph ID to check
   * @returns `true` if the learning graph is favorited, `false` otherwise
   */
  const isFavorite = useCallback((id: string): boolean => favoriteIds.has(id), [favoriteIds]);

  return { isFavorite, toggleFavorite, isLoading };
}
