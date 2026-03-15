/**
 * Shared TypeScript type definitions for Podcast Hub v2.
 *
 * Contains the client-side PodcastData interface used by admin
 * components for displaying and managing podcasts.
 */

/** Represents a podcast record as returned by the API. */
export interface PodcastData {
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
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}
