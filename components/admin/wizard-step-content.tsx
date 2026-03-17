/**
 * WizardStepContent — Content upload form for the podcast upload wizard (Step 2).
 *
 * Renders file upload fields for audio files, attachments, and transcripts.
 * Uses hidden file inputs with square box drop-zone triggers for audio/attachments,
 * and Textarea inputs for transcript copy-paste.
 *
 * Key responsibilities:
 * - Audio file upload for Audio (short) and Audio (long)
 * - Multiple file upload for attachments (bulletins)
 * - Transcript text entry via copy-paste Textarea for both transcript types
 * - Upload progress display during active uploads
 * - Filename display after successful uploads
 *
 * @dependencies shadcn Label, Input, Textarea components; lucide-react icons
 */
'use client';

import { useRef } from 'react';
import { Upload, Paperclip, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MAX_FILE_SIZES } from '@/lib/upload';

/**
 * Props for the WizardStepContent component.
 *
 * @property audioShortUrl - URL of the uploaded brief summary audio, or null.
 * @property audioShortFileName - Display name for the brief summary audio file.
 * @property onAudioShortChange - Callback when a brief summary audio file is selected.
 * @property audioLongUrl - URL of the uploaded detailed overview audio, or null.
 * @property audioLongFileName - Display name for the detailed overview audio file.
 * @property onAudioLongChange - Callback when a detailed overview audio file is selected.
 * @property bulletinUrls - Array of uploaded attachment URLs.
 * @property bulletinFileNames - Array of uploaded attachment file names.
 * @property onBulletinsChange - Callback when attachment files are selected.
 * @property shortTranscript - Text content of the brief summary transcript.
 * @property onShortTranscriptChange - Callback when brief summary transcript text changes.
 * @property longTranscript - Text content of the detailed overview transcript.
 * @property onLongTranscriptChange - Callback when detailed overview transcript text changes.
 * @property isUploading - Whether a file upload is currently in progress.
 * @property uploadProgress - Upload progress percentage (0-100).
 */
export interface WizardStepContentProps {
  audioShortUrl: string | null;
  audioShortFileName: string | null;
  onAudioShortChange: (file: File) => void;
  audioLongUrl: string | null;
  audioLongFileName: string | null;
  onAudioLongChange: (file: File) => void;
  bulletinUrls: string[];
  bulletinFileNames: string[];
  onBulletinsChange: (files: File[]) => void;
  onBulletinRemove: (index: number) => void;
  shortTranscript: string;
  onShortTranscriptChange: (text: string) => void;
  longTranscript: string;
  onLongTranscriptChange: (text: string) => void;
  isUploading: boolean;
  uploadProgress: number;
}

/**
 * Renders the content upload form fields for Step 2 of the podcast upload wizard.
 *
 * Includes five sections: Brief Summary audio, Detailed Overview audio,
 * Attachments, Brief Summary Transcript, and Detailed Overview Transcript.
 * Shows upload progress and filenames when available.
 *
 * @param props - Component props containing file state and callbacks.
 * @returns The content upload form fields.
 */
export function WizardStepContent({
  audioShortUrl: _audioShortUrl,
  audioShortFileName,
  onAudioShortChange,
  audioLongUrl: _audioLongUrl,
  audioLongFileName,
  onAudioLongChange,
  bulletinUrls: _bulletinUrls,
  bulletinFileNames,
  onBulletinsChange,
  onBulletinRemove,
  shortTranscript,
  onShortTranscriptChange,
  longTranscript,
  onLongTranscriptChange,
  isUploading,
  uploadProgress,
}: WizardStepContentProps) {
  const audioShortRef = useRef<HTMLInputElement>(null);
  const audioLongRef = useRef<HTMLInputElement>(null);
  const bulletinsRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5">
      {/* Upload progress indicator */}
      {isUploading && <ProgressBar progress={uploadProgress} />}

      {/* Audio + Attachments — three equal columns */}
      <div className="space-y-1.5">
        <Label>Files</Label>
        <div className="grid grid-cols-3 gap-3">
          {/* Audio (short) */}
          <div>
            <Input
              ref={audioShortRef}
              id="audioShort"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_FILE_SIZES.audio) {
                  toast.error('Audio file exceeds the 500 MB limit');
                  e.target.value = '';
                  return;
                }
                onAudioShortChange(file);
              }}
            />
            <button
              type="button"
              onClick={() => audioShortRef.current?.click()}
              className={cn(
                'w-full h-28 flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer',
                audioShortFileName ? 'border-border' : 'border-dashed border-border'
              )}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium">Audio (short)</span>
              {audioShortFileName ? (
                <span className="text-xs text-primary px-2 truncate max-w-full text-center leading-tight">
                  {audioShortFileName}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/60">Up to 500 MB</span>
              )}
            </button>
          </div>

          {/* Audio (long) */}
          <div>
            <Input
              ref={audioLongRef}
              id="audioLong"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_FILE_SIZES.audio) {
                  toast.error('Audio file exceeds the 500 MB limit');
                  e.target.value = '';
                  return;
                }
                onAudioLongChange(file);
              }}
            />
            <button
              type="button"
              onClick={() => audioLongRef.current?.click()}
              className={cn(
                'w-full h-28 flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer',
                audioLongFileName ? 'border-border' : 'border-dashed border-border'
              )}
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium">Audio (long)</span>
              {audioLongFileName ? (
                <span className="text-xs text-primary px-2 truncate max-w-full text-center leading-tight">
                  {audioLongFileName}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/60">Up to 500 MB</span>
              )}
            </button>
          </div>

          {/* Attachments */}
          <div>
            <Input
              ref={bulletinsRef}
              id="bulletins"
              type="file"
              multiple
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (!e.target.files || e.target.files.length === 0) return;
                /* Snapshot to array before resetting — FileList is a live reference */
                const snapshot = Array.from(e.target.files);
                e.target.value = '';
                const oversized = snapshot.filter((f) => f.size > MAX_FILE_SIZES.pdf);
                if (oversized.length > 0) {
                  toast.error(`${oversized.map((f) => f.name).join(', ')} exceeds the 50 MB limit`);
                  return;
                }
                onBulletinsChange(snapshot);
              }}
            />
            <button
              type="button"
              onClick={() => bulletinsRef.current?.click()}
              className={cn(
                'w-full h-28 flex flex-col items-center justify-center gap-2 rounded-xl border-2 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer',
                bulletinFileNames.length > 0 ? 'border-border' : 'border-dashed border-border'
              )}
            >
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium">Attachments</span>
              <span className="text-xs text-muted-foreground/60">PDF · up to 50 MB</span>
            </button>

            {/* Attached file chips */}
            {bulletinFileNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {bulletinFileNames.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="max-w-40 truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => onBulletinRemove(index)}
                      className="ml-0.5 rounded-sm text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remove ${name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transcripts — side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Brief Summary Transcript */}
        <div className="space-y-1.5">
          <Label htmlFor="shortTranscript">Brief Summary Transcript (Short)</Label>
          <Textarea
            id="shortTranscript"
            value={shortTranscript}
            onChange={(e) => onShortTranscriptChange(e.target.value)}
            placeholder="Paste brief summary transcript..."
            className="resize-none font-mono text-xs h-32 overflow-y-auto"
          />
          {shortTranscript && (
            <p className="text-xs text-muted-foreground">{shortTranscript.length} chars</p>
          )}
        </div>

        {/* Detailed Overview Transcript */}
        <div className="space-y-1.5">
          <Label htmlFor="longTranscript">Detailed Overview Transcript (Long)</Label>
          <Textarea
            id="longTranscript"
            value={longTranscript}
            onChange={(e) => onLongTranscriptChange(e.target.value)}
            placeholder="Paste detailed overview transcript..."
            className="resize-none font-mono text-xs h-32 overflow-y-auto"
          />
          {longTranscript && (
            <p className="text-xs text-muted-foreground">{longTranscript.length} chars</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple progress bar for displaying file upload progress.
 *
 * @param props - Component props.
 * @param props.progress - Upload progress percentage (0-100).
 * @returns A styled progress bar element.
 */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-secondary rounded-full h-2.5">
      <div
        className="bg-primary h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
