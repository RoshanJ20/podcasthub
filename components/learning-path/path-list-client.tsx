'use client';

/**
 * Client wrapper for the learning path listing page.
 *
 * Fetches per-user progress and favorites on mount so the progress bars
 * and heart icons on each PathCard reflect the authenticated user's state.
 * Provides search, domain filter, favorites filter, and sort controls
 * matching the bulletins page pattern.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PathCard } from './path-card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LEARNING_SERIES_DOMAINS } from '@/lib/schemas/common';
import { useLearningGraphFavorites } from '@/hooks/use-learning-graph-favorites';
import { withBasePath } from '@/lib/config/base-path';

interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  episodeCount: number;
}

interface PathListClientProps {
  paths: LearningPath[];
}

export function PathListClient({ paths }: PathListClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { isFavorite, toggleFavorite } = useLearningGraphFavorites();

  const showFavorites = searchParams.get('favorites') === 'true';

  /** Update a URL search param and push, resetting pagination. */
  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `?${qs}` : '?');
    },
    [searchParams, router]
  );

  const toggleFavoritesFilter = useCallback(() => {
    updateParams('favorites', showFavorites ? '' : 'true');
  }, [showFavorites, updateParams]);

  /** Filter paths by search query (title + description + domain). */
  const filteredPaths = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.domain?.toLowerCase().includes(q) ?? false)
    );
  }, [paths, searchQuery]);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch(withBasePath('/api/progress'));
        if (!response.ok) return;
        const progressResponse = await response.json();
        const counts: Record<string, number> = {};
        for (const progress of progressResponse.data ?? []) {
          const graphId = progress.graphId ?? progress.graph?.id;
          if (graphId) {
            counts[graphId] = (counts[graphId] || 0) + 1;
          }
        }
        setProgressMap(counts);
      } catch {
        // Not logged in — show 0 progress
      }
    }
    fetchProgress();
  }, []);

  return (
    <>
      {/* Header: title left, filters right — matches bulletins page */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Learning Series</h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Favorites filter toggle */}
          <button
            type="button"
            onClick={toggleFavoritesFilter}
            aria-label={showFavorites ? 'Show all' : 'Show favorites only'}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-[color,background-color,border-color] duration-150',
              showFavorites
                ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400'
                : 'border-border bg-background text-muted-foreground hover:border-red-200 hover:text-red-500 dark:hover:border-red-500/30'
            )}
          >
            <Heart
              className={cn(
                'size-3.5',
                showFavorites ? 'fill-red-500 text-red-500' : 'fill-transparent'
              )}
            />
            Favorites
          </button>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-9 w-56 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Domain filter */}
          <Select
            value={searchParams.get('domain') ?? 'all'}
            onValueChange={(val) => updateParams('domain', val ?? 'all')}
          >
            <SelectTrigger className="w-44" aria-label="Filter by domain">
              <SelectValue>{searchParams.get('domain') ?? 'All Domains'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {LEARNING_SERIES_DOMAINS.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <StaggeredGrid className="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPaths.map((path) => (
          <StaggeredGridItem key={path.id}>
            <PathCard
              id={path.id}
              title={path.title}
              description={path.description}
              domain={path.domain}
              episodeCount={path.episodeCount}
              completedCount={progressMap[path.id] ?? 0}
              isFavorite={isFavorite(path.id)}
              onToggleFavorite={() => toggleFavorite(path.id)}
            />
          </StaggeredGridItem>
        ))}
      </StaggeredGrid>

      {filteredPaths.length === 0 && searchQuery.trim() && (
        <p className="text-muted-foreground text-center py-8 text-sm">
          No series matching &ldquo;{searchQuery.trim()}&rdquo;
        </p>
      )}

      {filteredPaths.length === 0 && !searchQuery.trim() && (
        <p className="text-muted-foreground text-center py-8">
          {showFavorites ? 'No favorited series yet.' : 'No learning series available yet.'}
        </p>
      )}
    </>
  );
}
