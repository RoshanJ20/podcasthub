/**
 * WizardStepReview — Read-only review component for the audit brief upload wizard (Step 3).
 *
 * Displays all form data in a single compact card before final submission.
 * Layout: thumbnail + title header strip, 2-column field grid, files pill row.
 *
 * Key responsibilities:
 * - Renders a single summary card with all audit brief metadata and content info
 * - Shows "Not provided" / "None" placeholders for missing optional fields
 *
 * @dependencies shadcn Card, Badge components; next/image for thumbnail preview
 */
'use client';

import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Props for the WizardStepReview component.
 *
 * All values are read-only snapshots from the wizard form state.
 */
export interface WizardStepReviewProps {
  /** Audit brief title */
  title: string;
  /** Audit brief description (may be multi-line) */
  description: string;
  /** Domain category */
  domain: string;
  /** Publication year */
  year: number;
  /** Tag labels associated with the audit brief */
  tags: string[];
  /** Object URL or storage URL for the uploaded thumbnail image */
  thumbnailUrl: string | null;
  /** Original filename of the uploaded thumbnail */
  thumbnailFileName: string | null;
  /** Storage URL for the brief summary audio file */
  audioShortUrl: string | null;
  /** Original filename of the brief summary audio */
  audioShortFileName: string | null;
  /** Storage URL for the detailed overview audio file */
  audioLongUrl: string | null;
  /** Original filename of the detailed overview audio */
  audioLongFileName: string | null;
  /** List of bulletin/attachment filenames */
  bulletinFileNames: string[];
  /** Transcript text for the brief summary audio */
  shortTranscript: string;
  /** Transcript text for the detailed overview audio */
  longTranscript: string;
}

/**
 * Read-only review component that displays all audit brief form data
 * in a single compact card before final submission.
 *
 * @param props - All form field values to display.
 * @returns The review step UI.
 */
export function WizardStepReview({
  title,
  description,
  domain,
  year,
  tags,
  thumbnailUrl,
  audioShortFileName,
  audioLongFileName,
  bulletinFileNames,
  shortTranscript,
  longTranscript,
}: WizardStepReviewProps) {
  const transcriptSummary = [
    shortTranscript.length > 0 ? `Short: ${shortTranscript.length} chars` : null,
    longTranscript.length > 0 ? `Long: ${longTranscript.length} chars` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        {/* Header strip: thumbnail + title + domain + year */}
        <div className="flex gap-3 items-center pb-4 border-b border-border">
          {thumbnailUrl ? (
            <div className="relative shrink-0 w-14 h-10 rounded-md overflow-hidden border">
              <Image
                src={thumbnailUrl}
                alt="Thumbnail"
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          ) : (
            <div className="shrink-0 w-14 h-10 rounded-md bg-muted border" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {domain}
              </Badge>
              <span className="text-xs text-muted-foreground">{year}</span>
            </div>
          </div>
        </div>

        {/* 2-column field grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <ReviewField label="Description">
            <span className="line-clamp-2">{description || <Muted>—</Muted>}</span>
          </ReviewField>

          <ReviewField label="Tags">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <Muted>None</Muted>
            )}
          </ReviewField>

          {transcriptSummary && (
            <ReviewField label="Transcripts">
              <span>{transcriptSummary}</span>
            </ReviewField>
          )}
        </div>

        {/* Files pill row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <FilePill label="Audio (short)" value={audioShortFileName} />
          <FilePill label="Audio (long)" value={audioLongFileName} />
          <FilePill
            label="Attachments"
            value={
              bulletinFileNames.length > 0
                ? `${bulletinFileNames.length} file${bulletinFileNames.length > 1 ? 's' : ''}`
                : null
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** Renders a labelled field in the 2-col grid. */
function ReviewField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Renders a single file summary pill in the bottom row. */
function FilePill({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2.5 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {value ? (
        <p className="text-xs font-medium truncate">{value}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">Not provided</p>
      )}
    </div>
  );
}

/** Inline muted placeholder text. */
function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
