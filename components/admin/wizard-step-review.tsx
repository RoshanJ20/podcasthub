/**
 * WizardStepReview — Read-only review component for the podcast upload wizard (Step 3).
 *
 * Displays all form data entered in Steps 1 (Details) and 2 (Content) in a structured,
 * card-based layout so the user can verify everything before submitting.
 *
 * Key responsibilities:
 * - Renders three review cards: Details, Content, and Thumbnail
 * - Displays file metadata (filenames, character counts) rather than raw content
 * - Shows "Not provided" / "None" placeholders for missing optional fields
 *
 * @dependencies shadcn Card, Badge components; next/image for thumbnail preview
 */
'use client';

import Image from 'next/image';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Props for the WizardStepReview component.
 *
 * All values are read-only snapshots from the wizard form state.
 */
export interface WizardStepReviewProps {
  /** Podcast title */
  title: string;
  /** Podcast description (may be multi-line) */
  description: string;
  /** Domain category (e.g., "Auditing", "LEAP", "Tax") */
  domain: string;
  /** Publication year */
  year: number;
  /** Tag labels associated with the podcast */
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
 * Renders a label-value row used within review cards.
 *
 * @param label - The field label text.
 * @param children - The value content to display.
 * @returns A horizontal label-value pair element.
 */
function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <div className="min-w-[160px] text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * Read-only review component that displays all podcast form data
 * entered across wizard Steps 1 and 2.
 *
 * Organized into three cards: Details, Content, and Thumbnail.
 *
 * @param props - All form field values to display.
 * @returns The review step UI with three summary cards.
 */
export function WizardStepReview({
  title,
  description,
  domain,
  year,
  tags,
  thumbnailUrl,
  thumbnailFileName,
  audioShortFileName,
  audioLongFileName,
  bulletinFileNames,
  shortTranscript,
  longTranscript,
}: WizardStepReviewProps) {
  return (
    <div className="space-y-6">
      {/* Card 1: Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewRow label="Title">{title}</ReviewRow>
          <ReviewRow label="Description">
            <span className="whitespace-pre-wrap">{description}</span>
          </ReviewRow>
          <ReviewRow label="Domain">
            <Badge variant="secondary">{domain}</Badge>
          </ReviewRow>
          <ReviewRow label="Year">{String(year)}</ReviewRow>
          <ReviewRow label="Tags">
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </ReviewRow>
        </CardContent>
      </Card>

      {/* Card 2: Content */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewRow label="Brief Summary">
            {audioShortFileName ?? <span className="text-muted-foreground">Not provided</span>}
          </ReviewRow>
          <ReviewRow label="Detailed Overview">
            {audioLongFileName ?? <span className="text-muted-foreground">Not provided</span>}
          </ReviewRow>
          <ReviewRow label="Attachments">
            {bulletinFileNames.length > 0 ? (
              <ul className="list-inside list-disc">
                {bulletinFileNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </ReviewRow>
          <ReviewRow label="Brief Summary Transcript">
            {shortTranscript.length > 0 ? (
              <span>{shortTranscript.length} characters</span>
            ) : (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </ReviewRow>
          <ReviewRow label="Detailed Overview Transcript">
            {longTranscript.length > 0 ? (
              <span>{longTranscript.length} characters</span>
            ) : (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </ReviewRow>
        </CardContent>
      </Card>

      {/* Card 3: Thumbnail */}
      <Card>
        <CardHeader>
          <CardTitle>Thumbnail</CardTitle>
        </CardHeader>
        <CardContent>
          {thumbnailUrl ? (
            <div className="space-y-2">
              <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border">
                <Image
                  src={thumbnailUrl}
                  alt="Thumbnail preview"
                  fill
                  className="object-cover"
                  sizes="(max-width: 384px) 100vw, 384px"
                />
              </div>
              {thumbnailFileName && (
                <p className="text-sm text-muted-foreground">{thumbnailFileName}</p>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">Not provided</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
