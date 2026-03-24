'use client';

/**
 * Client wrapper for the learning path listing page.
 *
 * Fetches per-user progress on mount so the progress bars on each
 * PathCard reflect the authenticated user's actual completion state
 * instead of always showing 0%.
 */
import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { PathCard } from './path-card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
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
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  /** Filter paths by search query (title + description). */
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
        // Count completed episodes per graph
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
      {/* Header: title left, search right — matches bulletins page */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Learning Series</h1>
        <div className="relative w-full sm:w-auto sm:min-w-55">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
          />
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
            />
          </StaggeredGridItem>
        ))}
      </StaggeredGrid>

      {filteredPaths.length === 0 && searchQuery.trim() && (
        <p className="text-muted-foreground text-center py-8 text-sm">
          No series matching &ldquo;{searchQuery.trim()}&rdquo;
        </p>
      )}

      {paths.length === 0 && !searchQuery.trim() && (
        <p className="text-muted-foreground text-center py-8">No learning series available yet.</p>
      )}
    </>
  );
}
