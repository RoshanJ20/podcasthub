/**
 * Search results display components for basic and semantic search.
 *
 * Key responsibilities:
 * - Renders basic keyword search results with podcast metadata
 * - Renders semantic search results with similarity scores and transcript excerpts
 */
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';
import { formatTime } from '@/lib/format-time';

export interface BasicResult {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  tags: string[];
}

export interface SemanticResult {
  id: string;
  podcastId: string;
  podcastTitle: string;
  content: string;
  startTime: number;
  endTime: number;
  similarity: number;
}

/**
 * Renders basic keyword search results as a list of podcast cards.
 *
 * @param props - Component props
 * @param props.results - Array of podcast search results to display
 * @returns List of podcast result cards with title, domain, and description
 */
export function BasicResults({ results }: { results: BasicResult[] }) {
  if (results.length === 0)
    return <p className="text-muted-foreground text-center py-8">No results found</p>;

  return (
    <StaggeredGrid className="grid-cols-1 gap-3">
      {results.map((result) => (
        <StaggeredGridItem key={result.id}>
          <Link href={`/podcast/${result.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{result.title}</h3>
                  {result.domain && <Badge variant="secondary">{result.domain}</Badge>}
                </div>
                {result.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {result.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}

/**
 * Renders semantic search results with similarity scores and transcript excerpts.
 *
 * @param props - Component props
 * @param props.results - Array of semantic search results with scores
 * @returns List of semantic result cards with similarity percentage and excerpts
 */
export function SemanticResults({ results }: { results: SemanticResult[] }) {
  if (results.length === 0)
    return <p className="text-muted-foreground text-center py-8">No results found</p>;

  return (
    <StaggeredGrid className="grid-cols-1 gap-3">
      {results.map((result) => (
        <StaggeredGridItem key={result.id}>
          <Link href={`/podcast/${result.podcastId}?t=${Math.floor(result.startTime)}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{result.podcastTitle}</h3>
                  <Badge variant="outline">{Math.round(result.similarity * 100)}% match</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">&quot;{result.content}&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(result.startTime)} - {formatTime(result.endTime)}
                </p>
              </CardContent>
            </Card>
          </Link>
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
