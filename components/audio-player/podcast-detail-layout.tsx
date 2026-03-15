/**
 * Client-side layout for the podcast detail page.
 *
 * Orchestrates the full audio experience: loads the podcast into the
 * player store on mount, renders the AudioPlayer, and provides tabbed
 * content for Transcript and Bulletins viewers. Also displays podcast
 * metadata (title, domain, year, tags, description).
 */
'use client';
import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/player-store';
import { useHlsPlayer } from '@/hooks/use-hls-player';
import { AudioPlayer } from './audio-player';
import { TranscriptViewer } from './transcript-viewer';
import { BulletinViewer } from './bulletin-viewer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { TranscriptSegment } from '@/hooks/use-transcript-sync';

interface Transcript {
  id: string;
  fullText: string;
  segments: TranscriptSegment[] | unknown;
  transcriptType: string;
}

interface PodcastRecord {
  id: string;
  title: string;
  description: string;
  domain: string;
  year: number;
  tags: string[];
  thumbnailUrl: string;
  audioShortUrl: string;
  audioLongUrl: string | null;
  bulletinUrls: string[];
  transcripts: Transcript[];
}

interface PodcastDetailLayoutProps {
  podcast: PodcastRecord;
  relatedPodcasts?: PodcastRecord[];
}

export function PodcastDetailLayout({ podcast }: PodcastDetailLayoutProps) {
  const { seekTo } = useHlsPlayer();

  /** Load the podcast into the player store on mount. */
  useEffect(() => {
    usePlayerStore.getState().loadPodcast({
      id: podcast.id,
      title: podcast.title,
      audioShortUrl: podcast.audioShortUrl,
      audioLongUrl: podcast.audioLongUrl,
      thumbnailUrl: podcast.thumbnailUrl,
    });
  }, [
    podcast.id,
    podcast.title,
    podcast.audioShortUrl,
    podcast.audioLongUrl,
    podcast.thumbnailUrl,
  ]);

  /** Extract transcript segments for the active audio type. */
  const audioType = usePlayerStore((s) => s.audioType);
  const activeTranscript =
    podcast.transcripts.find((t) => t.transcriptType === audioType) ?? podcast.transcripts[0];

  const segments: TranscriptSegment[] = Array.isArray(activeTranscript?.segments)
    ? (activeTranscript.segments as TranscriptSegment[])
    : [];

  const hasBulletins = podcast.bulletinUrls.length > 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Podcast metadata */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">{podcast.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{podcast.domain}</Badge>
          <span className="text-sm text-muted-foreground">{podcast.year}</span>
          {podcast.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <p className="text-muted-foreground">{podcast.description}</p>
      </div>

      {/* Audio player */}
      <AudioPlayer />

      {/* Tabbed content */}
      <Tabs defaultValue="transcript">
        <TabsList>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          {hasBulletins && <TabsTrigger value="bulletins">Bulletins</TabsTrigger>}
        </TabsList>
        <TabsContent value="transcript">
          <TranscriptViewer segments={segments} onSeek={seekTo} />
        </TabsContent>
        {hasBulletins && (
          <TabsContent value="bulletins">
            <BulletinViewer urls={podcast.bulletinUrls} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
