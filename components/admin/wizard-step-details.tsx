/**
 * WizardStepDetails — Form step component for podcast metadata (Step 1).
 *
 * Renders the metadata fields for the first step of the podcast upload wizard:
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

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PODCAST_DOMAINS } from '@/lib/schemas/common';

/**
 * Props for the WizardStepDetails component.
 *
 * The component relies on a parent FormProvider for Title, Description,
 * Domain, and Year fields. Tags and thumbnail are managed via callbacks.
 */
export interface WizardStepDetailsProps {
  /** Whether the wizard is creating a new podcast or editing an existing one. */
  mode: 'create' | 'edit';
  /** URL for the current thumbnail preview, or null if none uploaded. */
  thumbnailPreview: string | null;
  /** Callback invoked when the user selects a new thumbnail file. */
  onThumbnailChange: (file: File) => void;
  /** Current list of tags attached to the podcast. */
  tags: string[];
  /** Callback invoked when the tag list changes (add or remove). */
  onTagsChange: (tags: string[]) => void;
}

/**
 * Renders the podcast metadata form fields for Step 1 of the upload wizard.
 *
 * Must be rendered inside a react-hook-form FormProvider that provides
 * register/errors for the title, description, domain, and year fields.
 *
 * @param props - Component props (see WizardStepDetailsProps).
 * @returns The rendered form fields for podcast details.
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
    if (file) {
      onThumbnailChange(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title<span className="text-destructive"> *</span>
        </Label>
        <Input id="title" {...register('title')} placeholder="Podcast title" />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message as string}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description<span className="text-destructive"> *</span>
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Podcast description"
          rows={4}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message as string}</p>
        )}
      </div>

      {/* Domain */}
      <div className="space-y-2">
        <Label htmlFor="domain">
          Domain<span className="text-destructive"> *</span>
        </Label>
        <select
          id="domain"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Year */}
      <div className="space-y-2">
        <Label htmlFor="year">
          Year<span className="text-destructive"> *</span>
        </Label>
        <Input id="year" type="number" {...register('year')} />
        {errors.year && <p className="text-sm text-destructive">{errors.year.message as string}</p>}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="Type a tag and press Enter"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Image */}
      <div className="space-y-2">
        <Label htmlFor="thumbnail">
          Thumbnail Image
          {mode === 'create' && <span className="text-destructive"> *</span>}
        </Label>
        <Input id="thumbnail" type="file" accept="image/*" onChange={handleThumbnailChange} />
        {thumbnailPreview && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailPreview}
              alt="Thumbnail preview"
              className="h-24 w-24 rounded-md object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
