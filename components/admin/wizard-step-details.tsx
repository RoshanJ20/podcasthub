/**
 * WizardStepDetails — Form step component for audit brief metadata (Step 1).
 *
 * Renders the metadata fields for the first step of the audit brief upload wizard:
 * Title, Description, Domain, Year, Tags, and Thumbnail Image.
 *
 * Key responsibilities:
 * - Connects to parent react-hook-form FormProvider via useFormContext()
 * - Renders validation errors from the form context
 * - Manages tag input with enter-to-add and click-to-remove pattern
 * - Conditionally marks Thumbnail as required only in create mode
 *
 * @dependencies react-hook-form FormProvider context, shadcn UI components, PODCAST_DOMAINS
 */
'use client';

import { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MAX_FILE_SIZES } from '@/lib/upload';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TagInput } from '@/components/admin/tag-input';
import { ThumbnailCropDialog } from '@/components/admin/thumbnail-crop-dialog';
import { PODCAST_DOMAINS } from '@/lib/schemas/common';

/**
 * Props for the WizardStepDetails component.
 *
 * The component relies on a parent FormProvider for Title, Description,
 * Domain, and Year fields. Tags and thumbnail are managed via callbacks.
 */
export interface WizardStepDetailsProps {
  /** Whether the wizard is creating a new audit brief or editing an existing one. */
  mode: 'create' | 'edit';
  /** URL for the current thumbnail preview, or null if none uploaded. */
  thumbnailPreview: string | null;
  /** Callback invoked when the user selects a new thumbnail file. */
  onThumbnailChange: (file: File) => void;
  /** Current list of tags attached to the auditBrief. */
  tags: string[];
  /** Callback invoked when the tag list changes (add or remove). */
  onTagsChange: (tags: string[]) => void;
}

/**
 * Renders the audit brief metadata form fields for Step 1 of the upload wizard.
 *
 * Must be rendered inside a react-hook-form FormProvider that provides
 * register/errors for the title, description, domain, and year fields.
 *
 * @param props - Component props (see WizardStepDetailsProps).
 * @returns The rendered form fields for audit brief details.
 */
export function WizardStepDetails({
  mode,
  thumbnailPreview,
  onThumbnailChange,
  tags,
  onTagsChange,
}: WizardStepDetailsProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext();

  const [tagInput, setTagInput] = useState('');
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the Enter key press in the tag input field.
   * Adds the trimmed tag value to the tags list if it is non-empty and not a duplicate.
   *
   * @param event - The keyboard event from the tag input.
   */
  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
    }
    setTagInput('');
  };

  /**
   * Removes a tag from the tags list by value.
   *
   * @param tagToRemove - The tag string to remove.
   */
  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  /**
   * Handles thumbnail file selection and forwards the file to the parent callback.
   *
   * @param event - The change event from the file input.
   */
  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZES.image) {
      toast.error('Thumbnail exceeds the 5 MB limit');
      event.target.value = '';
      return;
    }
    setRawImageSrc(URL.createObjectURL(file));
    setCropOpen(true);
    event.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Thumbnail + Title + Description — side by side */}
      <div className="flex gap-4">
        {/* 1:1 Thumbnail */}
        <div className="shrink-0">
          <Label htmlFor="thumbnail" className="mb-1.5 block">
            Thumbnail{mode === 'create' && <span className="text-destructive"> *</span>}
          </Label>
          <input
            ref={thumbnailInputRef}
            id="thumbnail"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleThumbnailChange}
          />
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            className={cn(
              'relative w-32 h-32 rounded-xl border-2 bg-muted/20 hover:border-primary/50 hover:bg-muted/40 transition-colors cursor-pointer overflow-hidden',
              thumbnailPreview ? 'border-border' : 'border-dashed border-border'
            )}
          >
            {thumbnailPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 h-full">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">Upload</span>
                <span className="text-[10px] text-muted-foreground/60">1:1 · up to 5 MB</span>
              </div>
            )}
            {thumbnailPreview && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Replace</span>
              </div>
            )}
          </button>
        </div>

        {/* Title + Description stacked */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title<span className="text-destructive"> *</span>
            </Label>
            <Input id="title" {...register('title')} placeholder="Audit brief title" />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message as string}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description<span className="text-destructive"> *</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Audit brief description"
              rows={2}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message as string}</p>
            )}
          </div>
        </div>
      </div>

      {/* Domain + Year — two columns */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="domain">
            Domain<span className="text-destructive"> *</span>
          </Label>
          <select
            id="domain"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue=""
            {...register('domain')}
            onChange={(e) => setValue('domain', e.target.value)}
          >
            <option value="" disabled>
              Select a domain
            </option>
            {PODCAST_DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          {errors.domain && (
            <p className="text-sm text-destructive">{errors.domain.message as string}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="year">
            Year<span className="text-destructive"> *</span>
          </Label>
          <Input id="year" type="number" {...register('year')} className="h-9" />
          {errors.year && (
            <p className="text-sm text-destructive">{errors.year.message as string}</p>
          )}
        </div>
      </div>

      {/* Tags — Notion-style input with create dropdown */}
      <TagInput
        tags={tags}
        tagInput={tagInput}
        onTagInputChange={setTagInput}
        onAddTag={handleTagKeyDown}
        onRemoveTag={handleRemoveTag}
      />

      {/* Crop dialog — opens after file selection */}
      <ThumbnailCropDialog
        imageSrc={rawImageSrc}
        open={cropOpen}
        onCrop={(croppedFile) => {
          setCropOpen(false);
          if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
          setRawImageSrc(null);
          onThumbnailChange(croppedFile);
        }}
        onCancel={() => {
          setCropOpen(false);
          if (rawImageSrc) URL.revokeObjectURL(rawImageSrc);
          setRawImageSrc(null);
        }}
      />
    </div>
  );
}
