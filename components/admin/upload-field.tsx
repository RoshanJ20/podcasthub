/**
 * Generic labelled file-input field used across the podcast upload/edit form.
 *
 * Key responsibilities:
 * - Renders a labelled <input type="file"> with optional "required" indicator.
 * - Conditionally renders an UploadProgressBar while the file is uploading.
 * - Displays an optional helper message below the input (e.g. "Current file
 *   will be kept" in edit mode, or a character count for transcript previews).
 * - Purely presentational: all state and handlers live in the parent form.
 *
 * Dependencies:
 * - UploadProgressBar — progress indicator component.
 * - shadcn/ui Input and Label — consistent form element styling.
 *
 * Usage example:
 * ```tsx
 * <UploadField
 *   id="thumbnail"
 *   label="Thumbnail Image"
 *   accept="image/*"
 *   required
 *   isUploading={thumbnailUpload.isUploading}
 *   uploadProgress={thumbnailUpload.progress}
 *   onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
 *   helperText="Current file will be kept"
 * />
 * ```
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadProgressBar } from './upload-progress-bar';

interface UploadFieldProps {
  /** The HTML `id` for the input and the associated label's `htmlFor`. */
  id: string;
  /** Human-readable label displayed above the file input. */
  label: string;
  /** The `accept` attribute forwarded to the file input. */
  accept: string;
  /** When true, renders a red asterisk next to the label. */
  required?: boolean;
  /** When true, allows selecting multiple files. */
  multiple?: boolean;
  /** Whether an upload is currently in progress for this field. */
  isUploading: boolean;
  /** Upload completion percentage (0–100); shown in the progress bar. */
  uploadProgress: number;
  /** Change handler forwarded directly to the file input element. */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Optional text rendered below the input in muted style.
   * Used for "Current file will be kept" hints or character count previews.
   */
  helperText?: string;
}

/**
 * Renders a labelled file input with an optional upload progress bar and helper text.
 *
 * @param id - HTML element id shared between the label and the input.
 * @param label - Visible label text.
 * @param accept - Accepted MIME types / file extensions for the input.
 * @param required - Whether the field is mandatory; shows a red asterisk when true.
 * @param multiple - Whether the input allows multiple file selection.
 * @param isUploading - Controls visibility of the progress bar.
 * @param uploadProgress - Percentage value passed to UploadProgressBar.
 * @param onChange - Event handler for the underlying file input.
 * @param helperText - Supplementary text displayed beneath the input.
 * @returns A self-contained upload field block.
 */
export function UploadField({
  id,
  label,
  accept,
  required = false,
  multiple = false,
  isUploading,
  uploadProgress,
  onChange,
  helperText,
}: UploadFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input id={id} type="file" accept={accept} multiple={multiple} onChange={onChange} />
      {isUploading && <UploadProgressBar progress={uploadProgress} />}
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}
