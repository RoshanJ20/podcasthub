/**
 * wizard-state-types — Shared type definitions and constants for the AuditBriefUploadWizard state hook.
 *
 * Key responsibilities:
 * - Defines the Zod form schema (`formSchema`) and its inferred TypeScript type (`FormValues`).
 * - Exports the `TOTAL_STEPS` constant that controls wizard navigation bounds.
 * - Declares `UseWizardStateOptions` (hook input) and `UseWizardStateReturn` (hook output) interfaces.
 *
 * @dependencies zod, react-hook-form, react
 *
 * @example
 * import { formSchema, FormValues, UseWizardStateOptions } from './wizard-state-types';
 */

import { z } from 'zod';
import type { useForm } from 'react-hook-form';
import type React from 'react';

import type { AuditBriefFormData } from '@/components/admin/audit-brief-upload-wizard';

/** Zod schema for the metadata fields validated by react-hook-form. */
export const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  domain: z.string().min(1, 'Domain is required'),
  year: z.coerce.number().int().min(2020).max(2099),
});

/** Inferred TypeScript type for the form schema values. */
export type FormValues = z.infer<typeof formSchema>;

/** Total number of steps in the wizard flow. */
export const TOTAL_STEPS = 3;

/**
 * Options accepted by useWizardState.
 *
 * @property mode - Whether the wizard is creating a new audit brief or editing an existing one.
 * @property initialData - Pre-filled data when editing an existing auditBrief.
 * @property onSuccess - Callback invoked after a successful submission.
 * @property onStepChange - Callback invoked whenever the active step changes.
 */
export interface UseWizardStateOptions {
  /** Whether the wizard is creating or editing. Defaults to 'create'. */
  mode?: 'create' | 'edit';
  /** Pre-filled data for editing an existing auditBrief. */
  initialData?: AuditBriefFormData;
  /** Callback invoked after a successful create or update. */
  onSuccess?: () => void;
  /** Callback invoked whenever the active step changes. */
  onStepChange?: (step: number) => void;
}

/**
 * Return value of useWizardState.
 *
 * Exposes all state values and handlers required by AuditBriefUploadWizard and its
 * navigation/step sub-components.
 */
export interface UseWizardStateReturn {
  /** Zero-indexed current step (0 = Details, 1 = Content, 2 = Review). */
  currentStep: number;
  /** Navigate to any step by index and fire onStepChange. */
  goToStep: (step: number) => void;
  /** react-hook-form instance for the metadata fields. */
  form: ReturnType<typeof useForm<FormValues>>;
  /** Selected thumbnail File, or null. */
  thumbnailFile: File | null;
  /** Object-URL preview string for the thumbnail, or null. */
  thumbnailPreview: string | null;
  /** Selected short-version audio File, or null. */
  audioShortFile: File | null;
  /** Selected long-version audio File, or null. */
  audioLongFile: File | null;
  /** Array of selected bulletin/attachment Files. */
  bulletinFiles: File[];
  /** Raw text content of the short transcript textarea. */
  shortTranscript: string;
  /** Setter for shortTranscript. */
  setShortTranscript: (value: string) => void;
  /** Raw text content of the long transcript textarea. */
  longTranscript: string;
  /** Setter for longTranscript. */
  setLongTranscript: (value: string) => void;
  /** Current array of tag strings. */
  tags: string[];
  /** Whether any file upload is currently in progress. */
  isUploading: boolean;
  /** Aggregated upload progress percentage (0-100) across all active uploads. */
  uploadProgress: number;
  /** Whether the final API submission is in progress. */
  isSubmitting: boolean;
  /** Setters exposed for step-1 content changes. */
  setAudioShortFile: (file: File | null) => void;
  /** Setter for the long audio file. */
  setAudioLongFile: (file: File | null) => void;
  /** Setter for appending new bulletin files. */
  setBulletinFiles: React.Dispatch<React.SetStateAction<File[]>>;
  /** Callback for thumbnail file selection; updates file state and preview URL. */
  handleThumbnailChange: (file: File) => void;
  /** Callback for tag list updates. */
  handleTagsChange: (newTags: string[]) => void;
  /**
   * Validates the current step and advances to the next if valid.
   * Step 0: triggers form validation + thumbnail check (create mode).
   * Step 1: requires at least one audio file.
   */
  handleNext: () => Promise<void>;
  /**
   * Uploads all staged files, saves the audit brief via the API,
   * saves transcripts, and redirects to /bulletins on success.
   */
  handleFinalSubmit: () => Promise<void>;
  /** Resolved short-audio URL from initialData (used in review/content steps). */
  audioShortUrl: string | null;
  /** Resolved long-audio URL from initialData (used in review/content steps). */
  audioLongUrl: string | null;
  /** Resolved bulletin URLs from initialData (used in review/content steps). */
  bulletinUrls: string[];
}
