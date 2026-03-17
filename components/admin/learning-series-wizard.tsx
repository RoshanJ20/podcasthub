/**
 * LearningSeriesWizard — Two-step wizard for creating a new learning series.
 *
 * Matches the design language of PodcastUploadWizard.
 *
 * Key responsibilities:
 * - Step 0 (Details): Title, description, domain — creates the graph via API on Next
 * - Step 1 (Episodes): LinearEditor with auto-save for adding/reordering episodes
 * - Exposes goBack() and currentStep via ref for parent back-button control
 *
 * @dependencies react-hook-form, zod, sonner, LinearEditor, useGraphEditorStore
 */
'use client';

import { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WizardStepIndicator } from '@/components/admin/wizard-step-indicator';
import { LinearEditor } from '@/components/learning-path/linear-editor';
import { useGraphEditorStore } from '@/stores/graph-editor-store';
import { LEARNING_SERIES_DOMAINS } from '@/lib/schemas/common';

/** Step labels for this wizard. */
const STEPS = ['Details', 'Episodes'] as const;

/** Zod schema for the details step. */
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  domain: z.string().min(1, 'Domain is required'),
});

/** Inferred type for form values. */
type FormValues = z.infer<typeof formSchema>;

/**
 * Props for LearningSeriesWizard.
 *
 * @property onSuccess - Callback invoked when the user clicks Done on the final step.
 * @property onStepChange - Callback invoked whenever the active step changes.
 */
export interface LearningSeriesWizardProps {
  /** Called when the user finishes and clicks Done. */
  onSuccess?: () => void;
  /** Called whenever the active step index changes. */
  onStepChange?: (step: number) => void;
}

/** Imperative handle exposed via ref for external step control. */
export interface LearningSeriesWizardHandle {
  /** Navigate to the previous step, or no-op if already on step 0. */
  goBack: () => void;
  /** The current zero-indexed step number. */
  currentStep: number;
}

/**
 * Two-step wizard for creating a new learning series.
 *
 * Step 0 creates the graph record via API on Next. Step 1 loads the
 * LinearEditor initialised to that graph so episodes can be added with auto-save.
 *
 * @param props - Component props.
 * @param ref - Optional ref exposing goBack() and currentStep.
 * @returns The wizard UI.
 */
export const LearningSeriesWizard = forwardRef<
  LearningSeriesWizardHandle,
  LearningSeriesWizardProps
>(function LearningSeriesWizard({ onSuccess, onStepChange }, ref) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [graphId, setGraphId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loadFromApi, setAutoSaveGraphId, reset } = useGraphEditorStore();

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      onStepChange?.(step);
    },
    [onStepChange]
  );

  useImperativeHandle(
    ref,
    () => ({
      goBack: () => goToStep(Math.max(0, currentStep - 1)),
      currentStep,
    }),
    [currentStep, goToStep]
  );

  /* Clean up store on unmount */
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  /* ---------- Form ---------- */
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { title: '', description: '', domain: '' },
  });

  const domain = form.watch('domain');

  /**
   * Validates details and either creates or updates the graph, then advances to step 1.
   *
   * First call: POST /api/learning-graphs → sets graphId, initialises store.
   * Subsequent calls (after Back): PUT /api/learning-graphs/[id] → preserves episode state.
   */
  const handleNext = useCallback(async () => {
    const isValid = await form.trigger(['title', 'domain']);
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const body = {
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        domain: data.domain,
        pathType: 'linear',
      };

      if (!graphId) {
        /* First pass — create graph and initialise episode store */
        const res = await fetch('/api/learning-graphs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { message?: string }).message || 'Failed to create learning series'
          );
        }

        const { data: graph } = await res.json();
        setGraphId(graph.id);
        loadFromApi([], []);
        setAutoSaveGraphId(graph.id);
      } else {
        /* Subsequent passes — update metadata only, preserve episode store state */
        const res = await fetch(`/api/learning-graphs/${graphId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { message?: string }).message || 'Failed to update learning series'
          );
        }
      }

      goToStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, graphId, loadFromApi, setAutoSaveGraphId, goToStep]);

  /**
   * Resets the store, fires the success callback, and redirects to learning paths.
   */
  const handleDone = useCallback(() => {
    reset();
    onSuccess?.();
    // Redirect to learning paths page after successful creation
    router.push('/learning-path');
  }, [reset, onSuccess, router]);

  return (
    <div className="w-full py-6">
      <WizardStepIndicator steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {/* Step 0: Details */}
      {currentStep === 0 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ls-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ls-title"
              placeholder="e.g., Introduction to Audit Methodology"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ls-description">Description</Label>
            <Textarea
              id="ls-description"
              rows={2}
              placeholder="Describe what learners will gain from this series"
              {...form.register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Domain <span className="text-destructive">*</span>
            </Label>
            <Select
              value={domain}
              onValueChange={(v) => v && form.setValue('domain', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a domain" />
              </SelectTrigger>
              <SelectContent>
                {LEARNING_SERIES_DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.domain && (
              <p className="text-sm text-destructive">{form.formState.errors.domain.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Episodes */}
      {currentStep === 1 && graphId && <LinearEditor graphId={graphId} />}

      {/* Navigation */}
      <p className="text-sm text-muted-foreground italic mt-4">
        {currentStep === 0 ? 'All fields marked with * are mandatory' : null}
      </p>

      <div className="flex justify-between mt-3">
        {currentStep > 0 && (
          <Button variant="outline" onClick={() => goToStep(currentStep - 1)}>
            Back
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {currentStep === 0 && (
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Next'
              )}
            </Button>
          )}
          {currentStep === 1 && <Button onClick={handleDone}>Done</Button>}
        </div>
      </div>
    </div>
  );
});

LearningSeriesWizard.displayName = 'LearningSeriesWizard';
