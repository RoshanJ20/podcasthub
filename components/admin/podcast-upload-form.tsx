/**
 * Admin podcast upload/edit form component.
 *
 * Provides a comprehensive form for creating or editing podcasts,
 * including file uploads for thumbnail, audio files, and bulletin
 * documents with real-time progress tracking. Uses React Hook Form
 * with Zod validation and sonner for toast notifications.
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { X, Upload, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFileUpload } from '@/hooks/use-file-upload';
import { DOMAINS } from '@/lib/schemas/common';
import type { PodcastData } from '@/lib/types';

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
export type PodcastFormData = Partial<PodcastData>;

interface PodcastUploadFormProps {
  /** Pre-filled data for editing an existing podcast. */
  initialData?: PodcastFormData;
  /** Whether the form is creating a new podcast or editing an existing one. */
  mode?: 'create' | 'edit';
  /** Callback invoked after a successful submission. */
  onSuccess?: () => void;
}

/**
 * Renders a form for creating or editing a podcast.
 *
 * Handles file uploads with progress bars, tag management via
 * Enter-to-add/click-to-remove, and submits data to the podcasts API.
 */
export function PodcastUploadForm({
  initialData,
  mode = 'create',
  onSuccess,
}: PodcastUploadFormProps) {
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState('');

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

  const [isSubmitting, setIsSubmitting] = useState(false);
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
    resolver: zodResolver(formSchema),
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

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Validate required files in create mode
      if (mode === 'create') {
        if (!thumbnailFile) {
          toast.error('Thumbnail image is required');
          setIsSubmitting(false);
          return;
        }
        if (!audioShortFile) {
          toast.error('Short audio file is required');
          setIsSubmitting(false);
          return;
        }
      }

      // Upload files
      let thumbnailUrl = initialData?.thumbnailUrl ?? '';
      let audioShortUrl = initialData?.audioShortUrl ?? '';
      let audioLongUrl = initialData?.audioLongUrl ?? null;
      let bulletinUrls = initialData?.bulletinUrls ?? [];

      if (thumbnailFile) {
        const key = await thumbnailUpload.upload(thumbnailFile, 'image');
        if (!key) {
          toast.error('Failed to upload thumbnail');
          setIsSubmitting(false);
          return;
        }
        thumbnailUrl = key;
      }

      if (audioShortFile) {
        const key = await audioShortUpload.upload(audioShortFile, 'audio');
        if (!key) {
          toast.error('Failed to upload short audio');
          setIsSubmitting(false);
          return;
        }
        audioShortUrl = key;
      }

      if (audioLongFile) {
        const key = await audioLongUpload.upload(audioLongFile, 'audio');
        if (!key) {
          toast.error('Failed to upload long audio');
          setIsSubmitting(false);
          return;
        }
        audioLongUrl = key;
      }

      if (bulletinFiles.length > 0) {
        const uploadedKeys: string[] = [];
        for (const file of bulletinFiles) {
          const key = await bulletinUpload.upload(file, 'pdf');
          if (!key) {
            toast.error(`Failed to upload bulletin: ${file.name}`);
            setIsSubmitting(false);
            return;
          }
          uploadedKeys.push(key);
        }
        bulletinUrls = uploadedKeys;
      }

      // Submit to API
      const payload = {
        ...data,
        tags,
        thumbnailUrl,
        audioShortUrl,
        audioLongUrl,
        bulletinUrls,
      };

      const url = mode === 'edit' ? `/api/podcasts/${initialData?.id}` : '/api/podcasts';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('Podcast save error:', body);
        throw new Error(body.message || 'Failed to save podcast');
      }

      toast.success(
        mode === 'create' ? 'Podcast created successfully' : 'Podcast updated successfully'
      );
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Upload New Podcast' : 'Edit Podcast'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Podcast title" />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Podcast description"
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Select
              defaultValue={initialData?.domain}
              onValueChange={(value) => setValue('domain', value)}
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
            <Label htmlFor="year">Year</Label>
            <Input id="year" type="number" {...register('year')} />
            {errors.year && <p className="text-sm text-destructive">{errors.year.message}</p>}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
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

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail Image</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)}
            />
            {thumbnailUpload.isUploading && <ProgressBar progress={thumbnailUpload.progress} />}
            {mode === 'edit' && initialData?.thumbnailUrl && !thumbnailFile && (
              <p className="text-sm text-muted-foreground">Current file will be kept</p>
            )}
          </div>

          {/* Audio Short */}
          <div className="space-y-2">
            <Label htmlFor="audioShort">
              Short Audio {mode === 'create' && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="audioShort"
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioShortFile(e.target.files?.[0] ?? null)}
            />
            {audioShortUpload.isUploading && <ProgressBar progress={audioShortUpload.progress} />}
          </div>

          {/* Audio Long */}
          <div className="space-y-2">
            <Label htmlFor="audioLong">Long Audio (Optional)</Label>
            <Input
              id="audioLong"
              type="file"
              accept="audio/*"
              onChange={(e) => setAudioLongFile(e.target.files?.[0] ?? null)}
            />
            {audioLongUpload.isUploading && <ProgressBar progress={audioLongUpload.progress} />}
          </div>

          {/* Bulletins */}
          <div className="space-y-2">
            <Label htmlFor="bulletins">Bulletin Documents (Optional)</Label>
            <Input
              id="bulletins"
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={(e) => setBulletinFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
            {bulletinUpload.isUploading && <ProgressBar progress={bulletinUpload.progress} />}
          </div>

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting || isUploading} className="w-full">
            {isSubmitting || isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading ? 'Uploading files...' : 'Saving...'}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create Podcast' : 'Update Podcast'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Simple progress bar used during file uploads. */
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
