'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StaggeredGrid, StaggeredGridItem } from '@/components/ui/staggered-grid';

interface BasicResult {
  id: string;
  title: string;
  description: string | null;
  domain: string | null;
  tags: string[];
}

interface SemanticResult {
  id: string;
  podcastId: string;
  podcastTitle: string;
  content: string;
  startTime: number;
  endTime: number;
  similarity: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function BasicResults({ results }: { results: BasicResult[] }) {
  if (results.length === 0)
    return <p className="text-muted-foreground text-center py-8">No results found</p>;

  return (
    <StaggeredGrid className="grid-cols-1 gap-3">
      {results.map((r) => (
        <StaggeredGridItem key={r.id}>
          <Link href={`/podcast/${r.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.title}</h3>
                  {r.domain && <Badge variant="secondary">{r.domain}</Badge>}
                </div>
                {r.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}

export function SemanticResults({ results }: { results: SemanticResult[] }) {
  if (results.length === 0)
    return <p className="text-muted-foreground text-center py-8">No results found</p>;

  return (
    <StaggeredGrid className="grid-cols-1 gap-3">
      {results.map((r) => (
        <StaggeredGridItem key={r.id}>
          <Link href={`/podcast/${r.podcastId}?t=${Math.floor(r.startTime)}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{r.podcastTitle}</h3>
                  <Badge variant="outline">{Math.round(r.similarity * 100)}% match</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">&quot;{r.content}&quot;</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(r.startTime)} - {formatTime(r.endTime)}
                </p>
              </CardContent>
            </Card>
          </Link>
        </StaggeredGridItem>
      ))}
    </StaggeredGrid>
  );
}
