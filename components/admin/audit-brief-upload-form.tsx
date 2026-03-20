/**
 * Admin audit brief upload/edit form component.
 *
 * Provides a comprehensive form for creating or editing auditBriefs, including
 * file uploads for thumbnail, audio, and attachment documents with real-time
 * progress tracking. Uses React Hook Form with Zod validation.
 *
 * Key responsibilities:
 * - Owns all local form state: tags, transcript text, and staged files.
 * - Delegates file-upload field rendering to AuditBriefUploadFields.
 * - Delegates tag input rendering to TagInput.
 * - Delegates submit orchestration to useAuditBriefSubmit.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useAuditBriefSubmit } from '@/hooks/use-audit-brief-submit';
import { DOMAINS } from '@/lib/schemas/common';
import type { AuditBriefData } from '@/lib/types';
import { AuditBriefUploadFields } from './audit-brief-upload-fields';
import { TagInput } from './tag-input';

/** Form-level validation schema (files are handled separately). */
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  domain: z.string().min(1, 'Domain is required'),
  year: z.coerce.number().int().min(2020).max(2099),
  tags: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

/** Mapped type used for initialData prop. */
export type AuditBriefFormData = Partial<AuditBriefData>;

interface AuditBriefUploadFormProps {
  /** Pre-filled data for editing an existing auditBrief. */
  initialData?: AuditBriefFormData;
  /** Whether the form is creating a new audit brief or editing an existing one. */
  mode?: 'create' | 'edit';
  /** Callback invoked after a successful submission. */
  onSuccess?: () => void;
}

/**
 * Renders a form for creating or editing a auditBrief.
 *
 * Handles file uploads with progress bars, tag management via
 * Enter-to-add/click-to-remove, and submits data to the audit briefs API.
 *
 * @param initialData - Optional pre-existing audit brief data for edit mode.
 * @param mode - 'create' (default) or 'edit'.
 * @param onSuccess - Called after a successful save.
 * @returns A Card-wrapped audit brief upload/edit form.
 */
export function AuditBriefUploadForm({
  initialData,
  mode = 'create',
  onSuccess,
}: AuditBriefUploadFormProps) {
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [shortTranscript, setShortTranscript] = useState(
    initialData?.transcripts?.find(
      (t: { transcriptType: string; fullText: string }) => t.transcriptType === 'short'
    )?.fullText ?? ''
  );
  const [longTranscript, setLongTranscript] = useState(
    initialData?.transcripts?.find(
      (t: { transcriptType: string; fullText: string }) => t.transcriptType === 'long'
    )?.fullText ?? ''
  );

  // File state
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [audioShortFile, setAudioShortFile] = useState<File | null>(null);
  const [audioLongFile, setAudioLongFile] = useState<File | null>(null);
  const [bulletinFiles, setBulletinFiles] = useState<File[]>([]);

  // Upload hooks for each file category
  const thumbnailUpload = useFileUpload();
  const audioShortUpload = useFileUpload();
  const audioLongUpload = useFileUpload();
  const bulletinUpload = useFileUpload();

  const tagInputRef = useRef<HTMLInputElement>(null);

  const isUploading =
    thumbnailUpload.isUploading ||
    audioShortUpload.isUploading ||
    audioLongUpload.isUploading ||
    bulletinUpload.isUploading;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      domain: initialData?.domain ?? '',
      year: initialData?.year ?? new Date().getFullYear(),
      tags: initialData?.tags ?? [],
    },
  });

  const handleAddTag = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = tagInput.trim();
        if (value && !tags.includes(value)) {
          const newTags = [...tags, value];
          setTags(newTags);
          setValue('tags', newTags);
          setTagInput('');
        }
      }
    },
    [tagInput, tags, setValue]
  );

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      const newTags = tags.filter((t) => t !== tagToRemove);
      setTags(newTags);
      setValue('tags', newTags);
    },
    [tags, setValue]
  );

  const { onSubmit, isSubmitting } = useAuditBriefSubmit({
    mode,
    initialData,
    tags,
    thumbnailFile,
    audioShortFile,
    audioLongFile,
    bulletinFiles,
    shortTranscript,
    longTranscript,
    thumbnailUpload,
    audioShortUpload,
    audioLongUpload,
    bulletinUpload,
    onSuccess,
  });

  return (
    <Card className="rounded-xl border border-border bg-card">
      <CardHeader className="border-b border-border px-6 py-4">
        <CardTitle className="text-sm font-semibold">
          {mode === 'create' ? 'Upload New Audit Brief' : 'Edit Audit Brief'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title<span className="text-destructive"> *</span>
            </Label>
            <Input id="title" {...register('title')} placeholder="Audit brief title" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description<span className="text-destructive"> *</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Audit brief description"
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">
              Domain<span className="text-destructive"> *</span>
            </Label>
            <Select
              defaultValue={initialData?.domain}
              onValueChange={(value) => {
                if (value) setValue('domain', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((domain) => (
                  <SelectItem key={domain} value={domain}>
                    {domain}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.domain && <p className="text-sm text-destructive">{errors.domain.message}</p>}
          </div>

          {/* Year */}
          <div className="space-y-2">
            <Label htmlFor="year">
              Year<span className="text-destructive"> *</span>
            </Label>
            <Input id="year" type="number" {...register('year')} />
            {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
          </div>

          {/* Tags */}
          <TagInput
            tags={tags}
            tagInput={tagInput}
            onTagInputChange={setTagInput}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            inputRef={tagInputRef}
          />

          {/* File upload fields */}
          <AuditBriefUploadFields
            mode={mode}
            initialData={initialData}
            thumbnailFile={thumbnailFile}
            shortTranscript={shortTranscript}
            longTranscript={longTranscript}
            thumbnailUpload={thumbnailUpload}
            audioShortUpload={audioShortUpload}
            audioLongUpload={audioLongUpload}
            bulletinUpload={bulletinUpload}
            onThumbnailChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
            onAudioShortChange={(e) => setAudioShortFile(e.target.files?.[0] ?? null)}
            onAudioLongChange={(e) => setAudioLongFile(e.target.files?.[0] ?? null)}
            onBulletinChange={(e) =>
              setBulletinFiles(e.target.files ? Array.from(e.target.files) : [])
            }
            onShortTranscriptChange={setShortTranscript}
            onLongTranscriptChange={setLongTranscript}
          />

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full active:scale-[0.97]"
          >
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? 'Uploading files...' : 'Saving...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create Audit Brief' : 'Update Audit Brief'}
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground italic mt-4">
            All fields marked with * are mandatory
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
