/**
 * Admin transcript editor.
 *
 * Lets an admin correct a misrecognised word or typo in a bulletin's
 * transcript. The server regenerates the pgvector embedding so semantic
 * search stays in sync, and the admin sees a "Regenerating embedding…"
 * toast while that happens.
 *
 * Segments (timed transcript data) are rendered read-only and preserved
 * verbatim on save — only the `fullText` field is editable. A future
 * iteration can expose per-segment editing.
 *
 * @dependencies sonner, react
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { withBasePath } from '@/lib/config/base-path';

/** A single stored transcript record. */
export interface TranscriptRecord {
  id: string;
  auditBriefId: string;
  transcriptType: 'short' | 'long';
  fullText: string;
  segments: unknown;
}

/** Props accepted by TranscriptEditor. */
export interface TranscriptEditorProps {
  /** UUID of the parent audit brief. */
  auditBriefId: string;
  /** Brief title — rendered in the heading for context. */
  auditBriefTitle: string;
  /** Transcripts currently stored for the brief (0, 1, or 2 entries). */
  initialTranscripts: TranscriptRecord[];
}

/** Azure OpenAI text-embedding-3-large accepts ~8k tokens. 50k chars is a safe soft cap. */
const EMBEDDING_SOFT_LIMIT_CHARS = 50_000;

/**
 * Renders a tabbed short/long transcript editor wired to
 * `PUT /api/audit-briefs/[id]/transcript`.
 */
export function TranscriptEditor({
  auditBriefId,
  auditBriefTitle,
  initialTranscripts,
}: TranscriptEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<'short' | 'long'>(
    initialTranscripts.find((t) => t.transcriptType === 'short') ? 'short' : 'long'
  );

  const byType: Record<'short' | 'long', TranscriptRecord | undefined> = {
    short: initialTranscripts.find((t) => t.transcriptType === 'short'),
    long: initialTranscripts.find((t) => t.transcriptType === 'long'),
  };

  const [shortText, setShortText] = useState(byType.short?.fullText ?? '');
  const [longText, setLongText] = useState(byType.long?.fullText ?? '');

  const currentText = activeType === 'short' ? shortText : longText;
  const setCurrentText = activeType === 'short' ? setShortText : setLongText;

  const existingSegments = byType[activeType]?.segments ?? [];
  const overSoftLimit = currentText.length > EMBEDDING_SOFT_LIMIT_CHARS;

  const handleSave = (): void => {
    if (!currentText.trim()) {
      toast.error('Transcript text cannot be empty');
      return;
    }

    startTransition(async () => {
      toast.loading('Saving transcript and regenerating embedding…', { id: 'transcript-save' });
      try {
        const res = await fetch(withBasePath(`/api/audit-briefs/${auditBriefId}/transcript`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullText: currentText.trim(),
            segments: existingSegments,
            transcriptType: activeType,
          }),
        });

        if (res.status === 409) {
          toast.error('Another admin updated this transcript. Reload the page and try again.', {
            id: 'transcript-save',
          });
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const message = (payload as { message?: string }).message ?? 'Failed to save transcript';
          toast.error(message, { id: 'transcript-save' });
          return;
        }

        toast.success('Transcript saved', { id: 'transcript-save' });
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        toast.error(message, { id: 'transcript-save' });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit transcript</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For &ldquo;{auditBriefTitle}&rdquo;. Saving regenerates the embedding used by semantic
          search.
        </p>
      </div>

      {/* Transcript type tabs */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {(['short', 'long'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveType(t)}
            className={
              activeType === t
                ? 'rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-foreground'
                : 'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
            }
          >
            {t === 'short' ? 'Short' : 'Long'}
            {!byType[t] && <span className="ml-2 text-[10px] uppercase">new</span>}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="transcript-text">Full text</Label>
        <Textarea
          id="transcript-text"
          value={currentText}
          onChange={(event) => setCurrentText(event.target.value)}
          rows={18}
          className="font-mono text-sm"
          disabled={isPending}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{currentText.length.toLocaleString()} characters</span>
          {overSoftLimit && (
            <span className="text-amber-400">
              Warning: text exceeds {EMBEDDING_SOFT_LIMIT_CHARS.toLocaleString()} characters.
              Embedding may fail.
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save transcript'}
        </Button>
      </div>
    </div>
  );
}
