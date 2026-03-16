'use client';

/**
 * Client wrapper for the learning path listing page.
 *
 * Fetches per-user progress on mount so the progress bars on each
 * PathCard reflect the authenticated user's actual completion state
 * instead of always showing 0%.
 */
import { useEffect, useState } from 'react';
import { PathCard } from './path-card';

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

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch('/api/progress');
        if (!res.ok) return;
        const json = await res.json();
        // Count completed episodes per graph
        const counts: Record<string, number> = {};
        for (const p of json.data ?? []) {
          const graphId = p.graphId ?? p.graph?.id;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paths.map((path) => (
        <PathCard
          key={path.id}
          id={path.id}
          title={path.title}
          description={path.description}
          domain={path.domain}
          episodeCount={path.episodeCount}
          completedCount={progressMap[path.id] ?? 0}
        />
      ))}
    </div>
  );
}
