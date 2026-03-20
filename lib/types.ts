/**
 * Shared TypeScript type definitions for The Audit Brief.
 *
 * Contains the client-side AuditBriefData interface used by admin
 * components for displaying and managing auditBriefs.
 */

/** Represents an audit brief record as returned by the API. */
export interface AuditBriefData {
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
  /** Optional transcripts associated with this audit brief (short and long form). */
  transcripts?: Array<{ transcriptType: string; fullText: string }>;
}
