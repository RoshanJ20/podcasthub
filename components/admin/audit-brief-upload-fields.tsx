/**
 * Grouped file-upload fields for the audit brief upload/edit form.
 *
 * Key responsibilities:
 * - Renders six UploadField instances: thumbnail, brief summary audio,
 *   detailed overview audio, bulletin attachments, short transcript file,
 *   and long transcript file.
 * - Delegates all upload state and change handlers to the parent form via props.
 * - Purely presentational: no internal state, no side effects.
 *
 * Dependencies:
 * - UploadField — labelled file input with progress bar and helper text.
 *
 * Usage example:
 * ```tsx
 * <AuditBriefUploadFields
 *   mode="create"
 *   initialData={initialData}
 *   thumbnailFile={thumbnailFile}
 *   shortTranscript={shortTranscript}
 *   longTranscript={longTranscript}
 *   thumbnailUpload={thumbnailUpload}
 *   audioShortUpload={audioShortUpload}
 *   audioLongUpload={audioLongUpload}
 *   bulletinUpload={bulletinUpload}
 *   onThumbnailChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
 *   onAudioShortChange={(e) => setAudioShortFile(e.target.files?.[0] ?? null)}
 *   onAudioLongChange={(e) => setAudioLongFile(e.target.files?.[0] ?? null)}
 *   onBulletinChange={(e) => setBulletinFiles(e.target.files ? Array.from(e.target.files) : [])}
 *   onShortTranscriptChange={setShortTranscript}
 *   onLongTranscriptChange={setLongTranscript}
 * />
 * ```
 */

import { UploadField } from './upload-field';
import type { AuditBriefFormData } from './audit-brief-upload-form';

/** Minimal upload-hook shape required by this component. */
interface UploadState {
  /** Whether an upload is currently in progress for this slot. */
  isUploading: boolean;
  /** Upload completion percentage (0–100). */
  progress: number;
}

interface AuditBriefUploadFieldsProps {
  /** Whether the parent form is creating or editing a auditBrief. */
  mode: 'create' | 'edit';
  /** Pre-existing audit brief data used to determine helper text in edit mode. */
  initialData?: AuditBriefFormData;
  /** Currently selected thumbnail file, or null when none has been chosen. */
  thumbnailFile: File | null;
  /** Short transcript text already loaded; used to show character count helper. */
  shortTranscript: string;
  /** Long transcript text already loaded; used to show character count helper. */
  longTranscript: string;
  /** Upload state for the thumbnail slot. */
  thumbnailUpload: UploadState;
  /** Upload state for the short audio slot. */
  audioShortUpload: UploadState;
  /** Upload state for the long audio slot. */
  audioLongUpload: UploadState;
  /** Upload state for the bulletin attachments slot. */
  bulletinUpload: UploadState;
  /** onChange handler forwarded to the thumbnail file input. */
  onThumbnailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** onChange handler forwarded to the short audio file input. */
  onAudioShortChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** onChange handler forwarded to the long audio file input. */
  onAudioLongChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** onChange handler forwarded to the bulletin file input. */
  onBulletinChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called with the full text content of the selected short transcript file. */
  onShortTranscriptChange: (text: string) => void;
  /** Called with the full text content of the selected long transcript file. */
  onLongTranscriptChange: (text: string) => void;
}

/**
 * Renders all six file-upload fields used in the audit brief upload/edit form.
 *
 * @param mode - 'create' or 'edit'; controls required state and helper text.
 * @param initialData - Existing audit brief data for edit-mode helper messages.
 * @param thumbnailFile - Currently staged thumbnail file.
 * @param shortTranscript - Loaded short transcript text (for character count).
 * @param longTranscript - Loaded long transcript text (for character count).
 * @param thumbnailUpload - Progress/uploading state for the thumbnail slot.
 * @param audioShortUpload - Progress/uploading state for the short audio slot.
 * @param audioLongUpload - Progress/uploading state for the long audio slot.
 * @param bulletinUpload - Progress/uploading state for the bulletin slot.
 * @param onThumbnailChange - File input change handler for the thumbnail.
 * @param onAudioShortChange - File input change handler for the short audio.
 * @param onAudioLongChange - File input change handler for the long audio.
 * @param onBulletinChange - File input change handler for the bulletin attachments.
 * @param onShortTranscriptChange - Receives the text content of the uploaded short transcript.
 * @param onLongTranscriptChange - Receives the text content of the uploaded long transcript.
 * @returns A React fragment containing all six upload fields.
 */
export function AuditBriefUploadFields({
  mode,
  initialData,
  thumbnailFile,
  shortTranscript,
  longTranscript,
  thumbnailUpload,
  audioShortUpload,
  audioLongUpload,
  bulletinUpload,
  onThumbnailChange,
  onAudioShortChange,
  onAudioLongChange,
  onBulletinChange,
  onShortTranscriptChange,
  onLongTranscriptChange,
}: AuditBriefUploadFieldsProps) {
  return (
    <>
      {/* Thumbnail */}
      <UploadField
        id="thumbnail"
        label="Thumbnail Image"
        accept="image/*"
        required={mode === 'create'}
        isUploading={thumbnailUpload.isUploading}
        uploadProgress={thumbnailUpload.progress}
        onChange={onThumbnailChange}
        helperText={
          mode === 'edit' && initialData?.thumbnailUrl && !thumbnailFile
            ? 'Current file will be kept'
            : undefined
        }
      />

      {/* Brief Summary Audio */}
      <UploadField
        id="audioShort"
        label="Brief Summary"
        accept="audio/*"
        isUploading={audioShortUpload.isUploading}
        uploadProgress={audioShortUpload.progress}
        onChange={onAudioShortChange}
      />

      {/* Detailed Overview Audio */}
      <UploadField
        id="audioLong"
        label="Detailed Overview"
        accept="audio/*"
        isUploading={audioLongUpload.isUploading}
        uploadProgress={audioLongUpload.progress}
        onChange={onAudioLongChange}
      />

      {/* Attachments */}
      <UploadField
        id="bulletins"
        label="Attachments"
        accept=".pdf,.doc,.docx"
        multiple
        isUploading={bulletinUpload.isUploading}
        uploadProgress={bulletinUpload.progress}
        onChange={onBulletinChange}
      />

      {/* Brief Summary Transcript */}
      <UploadField
        id="shortTranscript"
        label="Brief Summary Transcript"
        accept=".txt,.srt,.vtt,.md"
        isUploading={false}
        uploadProgress={0}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const text = await file.text();
            onShortTranscriptChange(text);
          }
        }}
        helperText={shortTranscript ? `Loaded: ${shortTranscript.length} characters` : undefined}
      />

      {/* Detailed Overview Transcript */}
      <UploadField
        id="longTranscript"
        label="Detailed Overview Transcript"
        accept=".txt,.srt,.vtt,.md"
        isUploading={false}
        uploadProgress={0}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            const text = await file.text();
            onLongTranscriptChange(text);
          }
        }}
        helperText={longTranscript ? `Loaded: ${longTranscript.length} characters` : undefined}
      />
    </>
  );
}
