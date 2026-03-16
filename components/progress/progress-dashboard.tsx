'use client';

/**
 * Progress dashboard component.
 *
 * Tabs:
 * - In Progress: learning paths with partial completion
 * - Completed: fully completed paths
 * - Bookmarks: all bookmarks across podcasts
 * - History: recent activity feed
 */
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ProgressRecord {
  id: string;
  graphId: string;
  episodeId: string;
  completedAt: string;
  graph: { id: string; title: string };
  episode: { id: string; title: string };
}

interface Bookmark {
  id: string;
  podcastId: string;
  timestampSeconds: number;
  note: string | null;
  createdAt: string;
}

interface GraphProgress {
  graphId: string;
  graphTitle: string;
  completedEpisodes: { id: string; title: string; completedAt: string }[];
}

function groupByGraph(progress: ProgressRecord[]): GraphProgress[] {
  const map = new Map<string, GraphProgress>();
  for (const p of progress) {
    const existing = map.get(p.graphId);
    if (existing) {
      existing.completedEpisodes.push({
        id: p.episode.id,
        title: p.episode.title,
        completedAt: p.completedAt,
      });
    } else {
      map.set(p.graphId, {
        graphId: p.graphId,
        graphTitle: p.graph.title,
        completedEpisodes: [
          { id: p.episode.id, title: p.episode.title, completedAt: p.completedAt },
        ],
      });
    }
  }
  return Array.from(map.values());
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ProgressDashboard() {
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [progressRes, bookmarksRes] = await Promise.all([
          fetch('/api/progress'),
          fetch('/api/bookmarks?limit=100'),
        ]);
        const progressData = await progressRes.json();
        const bookmarksData = await bookmarksRes.json();

        setProgress(progressData.data ?? []);
        setBookmarks(bookmarksData.data ?? []);
      } catch {
        // Fail silently
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const grouped = groupByGraph(progress);

  return (
    <Tabs defaultValue="in-progress" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="in-progress">In Progress</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
        <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      {/* In Progress */}
      <TabsContent value="in-progress" className="space-y-4">
        {grouped.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No learning paths in progress. Start exploring!
              </p>
            </CardContent>
          </Card>
        ) : (
          grouped.map((gp) => (
            <Card key={gp.graphId}>
              <CardHeader>
                <CardTitle className="text-lg">{gp.graphTitle}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {gp.completedEpisodes.map((ep) => (
                    <Badge key={ep.id} variant="secondary">
                      {ep.title}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {gp.completedEpisodes.length} episode(s) completed
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Completed */}
      <TabsContent value="completed" className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Fully completed paths will appear here once all episodes in a path are done.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Bookmarks */}
      <TabsContent value="bookmarks" className="space-y-4">
        {bookmarks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                No bookmarks yet. Bookmark moments while listening!
              </p>
            </CardContent>
          </Card>
        ) : (
          bookmarks.map((bm) => (
            <Card key={bm.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{formatTimestamp(bm.timestampSeconds)}</p>
                    {bm.note && <p className="text-sm text-muted-foreground mt-1">{bm.note}</p>}
                  </div>
                  <Badge variant="outline">{new Date(bm.createdAt).toLocaleDateString()}</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* History */}
      <TabsContent value="history" className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Your recent activity will appear here.
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
