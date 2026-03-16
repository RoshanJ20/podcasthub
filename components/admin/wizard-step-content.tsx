/**
 * WizardStepContent — Content upload form for the podcast upload wizard (Step 2).
 *
 * Renders file upload fields for audio files, attachments, and transcripts.
 * Uses hidden file inputs with button triggers following the existing upload pattern.
 *
 * Key responsibilities:
 * - Audio file upload for Brief Summary and Detailed Overview
 * - Multiple file upload for attachments (bulletins)
 * - Transcript file upload (.txt, .srt, .vtt, .md) read as text strings
 * - Upload progress display during active uploads
 * - Filename display after successful uploads
 *
 * @dependencies shadcn Label, Input, Button components; lucide-react icons
 */
'use client';

import { useRef } from 'react';
import { Upload, FileText, Paperclip } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  onBulletinsChange: (files: FileList) => void;
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
  const shortTranscriptRef = useRef<HTMLInputElement>(null);
  const longTranscriptRef = useRef<HTMLInputElement>(null);

  /**
   * Reads a transcript file as text and passes the content to the callback.
   *
   * @param file - The transcript file to read.
   * @param onChange - Callback to receive the text content.
   */
  async function handleTranscriptFile(file: File, onChange: (text: string) => void): Promise<void> {
    const text = await file.text();
    onChange(text);
  }

  return (
    <div className="space-y-6">
      {/* Upload progress indicator */}
      {isUploading && <ProgressBar progress={uploadProgress} />}

      {/* Brief Summary Audio */}
      <div className="space-y-2">
        <Label htmlFor="audioShort">Brief Summary</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={audioShortRef}
            id="audioShort"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onAudioShortChange(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => audioShortRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          {audioShortFileName && (
            <span className="text-sm text-muted-foreground">{audioShortFileName}</span>
          )}
        </div>
      </div>

      {/* Detailed Overview Audio */}
      <div className="space-y-2">
        <Label htmlFor="audioLong">Detailed Overview</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={audioLongRef}
            id="audioLong"
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onAudioLongChange(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => audioLongRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose File
          </Button>
          {audioLongFileName && (
            <span className="text-sm text-muted-foreground">{audioLongFileName}</span>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className="space-y-2">
        <Label htmlFor="bulletins">Attachments</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={bulletinsRef}
            id="bulletins"
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onBulletinsChange(e.target.files);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => bulletinsRef.current?.click()}
          >
            <Paperclip className="mr-2 h-4 w-4" />
            Choose Files
          </Button>
        </div>
        {bulletinFileNames.length > 0 && (
          <ul className="space-y-1">
            {bulletinFileNames.map((name) => (
              <li key={name} className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Brief Summary Transcript */}
      <div className="space-y-2">
        <Label htmlFor="shortTranscript">Brief Summary Transcript</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={shortTranscriptRef}
            id="shortTranscript"
            type="file"
            accept=".txt,.srt,.vtt,.md"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await handleTranscriptFile(file, onShortTranscriptChange);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shortTranscriptRef.current?.click()}
          >
            <FileText className="mr-2 h-4 w-4" />
            Choose File
          </Button>
        </div>
        {shortTranscript && (
          <p className="text-xs text-muted-foreground">
            Loaded: {shortTranscript.length} characters
          </p>
        )}
      </div>

      {/* Detailed Overview Transcript */}
      <div className="space-y-2">
        <Label htmlFor="longTranscript">Detailed Overview Transcript</Label>
        <div className="flex items-center gap-2">
          <Input
            ref={longTranscriptRef}
            id="longTranscript"
            type="file"
            accept=".txt,.srt,.vtt,.md"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await handleTranscriptFile(file, onLongTranscriptChange);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => longTranscriptRef.current?.click()}
          >
            <FileText className="mr-2 h-4 w-4" />
            Choose File
          </Button>
        </div>
        {longTranscript && (
          <p className="text-xs text-muted-foreground">
            Loaded: {longTranscript.length} characters
          </p>
        )}
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
