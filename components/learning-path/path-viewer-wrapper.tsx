/**
 * Full-featured client wrapper for the learning path viewer.
 *
 * Fetches user progress on mount, renders episodes as expandable cards
 * with inline audio players, and provides "Mark as Complete" functionality
 * with a real-time progress bar.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { EpisodePlayer } from './episode-player';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';

interface Episode {
  id: string;
  title: string;
  nodeType: string;
  audioUrl: string;
  description: string | null;
  thumbnailUrl?: string | null;
  transcript?: string | null;
  positionX: number;
  positionY: number;
  sortOrder: number;
}

interface PathViewerWrapperProps {
  graphId: string;
  pathType: 'graph' | 'linear';
  episodes: Episode[];
  edges: { id: string; sourceEpisodeId: string; targetEpisodeId: string }[];
}

export function PathViewerWrapper({
  graphId,
  pathType: _pathType,
  episodes,
  edges: _edges,
}: PathViewerWrapperProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch user progress on mount
  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch('/api/progress');
        if (!res.ok) return;
        const json = await res.json();
        const ids = new Set<string>(
          (json.data ?? [])
            .filter((p: { graph?: { id: string } }) => p.graph?.id === graphId)
            .map((p: { episode?: { id: string } }) => p.episode?.id)
            .filter(Boolean)
        );
        setCompletedIds(ids);
      } catch {
        // User may not be logged in — ignore
      }
    }
    fetchProgress();
  }, [graphId]);

  const handleComplete = useCallback((episodeId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(episodeId);
      return next;
    });
  }, []);

  const sortedEpisodes = [...episodes].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = sortedEpisodes.filter((e) => completedIds.has(e.id)).length;
  const progress =
    sortedEpisodes.length > 0 ? Math.round((completedCount / sortedEpisodes.length) * 100) : 0;

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>
            {completedCount} of {sortedEpisodes.length} episodes completed
          </span>
          <span>{progress}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Episode Cards */}
      <div className="space-y-2 max-w-2xl mx-auto">
        {sortedEpisodes.map((ep, index) => {
          const isCompleted = completedIds.has(ep.id);
          const isExpanded = expandedId === ep.id;

          return (
            <div
              key={ep.id}
              className={`border rounded-lg transition-colors ${
                isCompleted ? 'border-green-500 bg-green-50' : ''
              }`}
            >
              {/* Episode header — click to expand */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : ep.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 rounded-lg"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium">
                  {index + 1}. {ep.title}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded content — audio player */}
              {isExpanded && ep.audioUrl && (
                <div className="px-4 pb-4">
                  <EpisodePlayer
                    episodeId={ep.id}
                    title={ep.title}
                    description={ep.description}
                    audioUrl={ep.audioUrl}
                    thumbnailUrl={ep.thumbnailUrl}
                    transcript={ep.transcript}
                    isCompleted={isCompleted}
                    graphId={graphId}
                    onComplete={() => handleComplete(ep.id)}
                  />
                </div>
              )}

              {isExpanded && !ep.audioUrl && (
                <div className="px-4 pb-4">
                  {ep.description && (
                    <p className="text-sm text-muted-foreground mb-2">{ep.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground italic">
                    No audio available for this episode.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
