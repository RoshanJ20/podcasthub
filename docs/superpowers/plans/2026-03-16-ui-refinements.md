# UI Refinements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename audio labels, separate domains, add field indicators, build a three-stage upload wizard, and fix analytics chart types.

**Architecture:** Six independent changes that can be implemented in any order except the wizard (Task 4) which depends on Tasks 1-3 being complete since it incorporates those changes into the new components. The wizard replaces the existing `PodcastUploadForm` with five focused components orchestrated by a wizard wrapper.

**Tech Stack:** Next.js 16, TypeScript, React Hook Form + Zod, shadcn/ui, Recharts, Vitest + RTL

**Spec:** `docs/superpowers/specs/2026-03-16-ui-refinements-design.md`

---

## Chunk 1: Labels, Domains, Indicators

### Task 1: Separate domains into podcast and learning series categories

**Files:**

- Modify: `lib/schemas/common.ts`
- Modify: `lib/schemas/podcast.ts` (if it uses domainSchema)
- Modify: `lib/schemas/learning-graph.ts` (if it uses domainSchema)
- Modify: `app/(admin)/admin/learning-graphs/new/page.tsx`
- Test: `__tests__/unit/lib/schemas/common.test.ts` (create or update)

- [ ] **Step 1: Write tests for the new domain constants**

Create `__tests__/unit/lib/schemas/common.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { PODCAST_DOMAINS, LEARNING_SERIES_DOMAINS, DOMAINS } from '@/lib/schemas/common';

describe('Domain constants', () => {
  it('PODCAST_DOMAINS contains the five Technical Releases domains', () => {
    expect(PODCAST_DOMAINS).toEqual([
      'Audit Methodology',
      'Accounting and Reporting',
      'Audit Technology',
      'Quality and Risk',
      'LEAP',
    ]);
  });

  it('LEARNING_SERIES_DOMAINS contains the two Learning Series domains', () => {
    expect(LEARNING_SERIES_DOMAINS).toEqual(['Auditing', 'Accounting and Reporting']);
  });

  it('DOMAINS contains all unique domains from both categories', () => {
    expect(DOMAINS).toContain('Audit Methodology');
    expect(DOMAINS).toContain('Auditing');
    expect(DOMAINS).toContain('Accounting and Reporting');
    // No duplicates
    const unique = new Set(DOMAINS);
    expect(unique.size).toBe(DOMAINS.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/unit/lib/schemas/common.test.ts`
Expected: FAIL — `PODCAST_DOMAINS` is not exported

- [ ] **Step 3: Update `lib/schemas/common.ts`**

Replace the current DOMAINS constant with:

```typescript
/** Domains for podcast (Technical Releases) content. */
export const PODCAST_DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
] as const;

/** Domains for learning path (Learning Series) content. */
export const LEARNING_SERIES_DOMAINS = ['Auditing', 'Accounting and Reporting'] as const;

/** All unique domains across both categories. Manually maintained tuple for z.enum() compatibility. */
export const DOMAINS = [
  'Audit Methodology',
  'Accounting and Reporting',
  'Audit Technology',
  'Quality and Risk',
  'LEAP',
  'Auditing',
] as const;
```

Keep the existing `domainSchema`, `Domain` type, and `paginationSchema` unchanged.

- [ ] **Step 4: Update learning path creation page to use LEARNING_SERIES_DOMAINS**

In `app/(admin)/admin/learning-graphs/new/page.tsx`, change the import:

```typescript
import { LEARNING_SERIES_DOMAINS } from '@/lib/schemas/common';
```

And update the Select dropdown to map over `LEARNING_SERIES_DOMAINS` instead of `DOMAINS`.

- [ ] **Step 5: Run tests and verify**

Run: `npx vitest run __tests__/unit/lib/schemas/common.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/common.ts app/(admin)/admin/learning-graphs/new/page.tsx __tests__/unit/lib/schemas/common.test.ts
git commit -m "feat: separate domains into podcast and learning series categories"
```

---

### Task 2: Rename audio labels across UI

**Files:**

- Modify: `components/audio-player/audio-player.tsx` (lines 225, 228)
- Modify: `components/admin/podcast-upload-form.tsx` (lines 379-381, 393, 418, 440)
- Test: `__tests__/unit/components/audio-player/audio-labels.test.tsx` (create)

- [ ] **Step 1: Write test for player toggle labels**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Test that the audio player shows "Brief Summary" / "Detailed Overview" instead of "Short" / "Long"
// Mock the player store to provide a podcast with both audio types
```

Test that when audioType is 'short', the button text is "Brief Summary", and when 'long', it shows "Detailed Overview".

- [ ] **Step 2: Update audio player toggle text**

In `components/audio-player/audio-player.tsx`:

- Line 225: Change aria-label from `'Short version'`/`'Long version'` to `'Brief Summary version'`/`'Detailed Overview version'`
- Line 228: Change display text from `'Short'`/`'Long'` to `'Brief Summary'`/`'Detailed Overview'`

- [ ] **Step 3: Update upload form labels**

In `components/admin/podcast-upload-form.tsx`:

- Line 379-381: Change "Short Audio" to "Brief Summary"
- Line 393: Change "Long Audio (Optional)" to "Detailed Overview"
- Line 418: Change "Short Transcript (Optional)" to "Brief Summary Transcript"
- Line 440: Change "Long Transcript (Optional)" to "Detailed Overview Transcript"

- [ ] **Step 4: Search for any other "Short"/"Long" display text in audio context**

Run: `grep -rn "Short\|Long" --include="*.tsx" --include="*.ts" components/ app/ | grep -i "audio\|transcript\|version\|duration"`

Update any additional occurrences found.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add components/audio-player/audio-player.tsx components/admin/podcast-upload-form.tsx
git commit -m "feat: rename Short/Long audio labels to Brief Summary/Detailed Overview"
```

---

### Task 3: Remove "(Optional)" labels and add `*` indicators with footer

**Files:**

- Modify: `components/admin/podcast-upload-form.tsx`
- Test: `__tests__/unit/components/admin/podcast-upload-form-indicators.test.tsx` (create)

- [ ] **Step 1: Write tests for field indicators**

Test that:

- Title, Description, Domain, Year labels have `*` indicator
- Thumbnail label has `*` in create mode, no `*` in edit mode
- Brief Summary audio label does NOT have `*` (changed from current behavior)
- No labels contain "(Optional)"
- Footer text "All fields marked with \* are mandatory" is present and italic

- [ ] **Step 2: Remove all "(Optional)" from labels**

In `podcast-upload-form.tsx`:

- Line 393: Remove "(Optional)" from "Detailed Overview" label
- Line 405: Remove "(Optional)" from "Attachments" label
- Line 418: Remove "(Optional)" from "Brief Summary Transcript" label
- Line 440: Remove "(Optional)" from "Detailed Overview Transcript" label

- [ ] **Step 3: Add `*` indicators to required field labels**

Add `<span className="text-destructive">*</span>` to:

- Title label (line 287)
- Description label (line 294)
- Domain label (line 308)
- Year label (line 329)
- Thumbnail label (line 364) — with `{mode === 'create' && ...}` guard

- [ ] **Step 4: Remove `*` from Brief Summary audio label**

Line 379-381: Remove the `{mode === 'create' && <span className="text-destructive">*</span>}` from the Brief Summary label. Also remove the corresponding validation guard in the submit handler that requires `audioShortFile` in create mode (around line 155).

- [ ] **Step 5: Add footer note**

After the submit button, add:

```tsx
<p className="text-sm text-muted-foreground italic mt-4">All fields marked with * are mandatory</p>
```

- [ ] **Step 6: Search for any other "(Optional)" in the codebase**

Run: `grep -rn "(Optional)" --include="*.tsx" --include="*.ts" components/ app/`

Remove any found in labels (NOT in placeholder text like bookmark-panel.tsx).

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 8: Commit**

```bash
git add components/admin/podcast-upload-form.tsx __tests__/unit/components/admin/
git commit -m "feat: add required field indicators, remove Optional labels, add footer note"
```

---

## Chunk 2: Three-Stage Upload Wizard

### Task 4: Create WizardStepIndicator component

**Files:**

- Create: `components/admin/wizard-step-indicator.tsx`
- Test: `__tests__/unit/components/admin/wizard-step-indicator.test.tsx`

- [ ] **Step 1: Write tests**

Test that:

- Renders 3 steps with labels "Details", "Content", "Review"
- Active step has distinct styling (e.g. primary color)
- Completed steps show check icon
- Future steps are muted

- [ ] **Step 2: Implement component**

```tsx
'use client';

/**
 * Step indicator for the podcast upload wizard.
 *
 * Shows three steps (Details, Content, Review) with active/completed/future states.
 */
import { Check } from 'lucide-react';

const STEPS = ['Details', 'Content', 'Review'] as const;

interface WizardStepIndicatorProps {
  currentStep: number; // 0-indexed
}

export function WizardStepIndicator({ currentStep }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {index > 0 && (
              <div className={`h-px w-12 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

---

### Task 5: Create WizardStepDetails component (Step 1)

**Files:**

- Create: `components/admin/wizard-step-details.tsx`
- Test: `__tests__/unit/components/admin/wizard-step-details.test.tsx`

- [ ] **Step 1: Write tests**

Test that:

- Renders Title, Description, Domain, Year, Tags, Thumbnail fields
- Title, Description, Domain, Year have `*` indicators
- Thumbnail has `*` when mode is 'create'
- Domain dropdown shows `PODCAST_DOMAINS` values
- No "(Optional)" text anywhere

- [ ] **Step 2: Implement component**

Extract Step 1 fields from `podcast-upload-form.tsx` into a standalone component. It receives `react-hook-form` control/register via props (or useFormContext). Fields:

- Title \* (Input)
- Description \* (Textarea)
- Domain \* (Select with PODCAST_DOMAINS)
- Year \* (Input type number)
- Tags (Input with Enter-to-add)
- Thumbnail Image \* (File upload, create mode only required)

Use `PODCAST_DOMAINS` for the domain dropdown.

- [ ] **Step 3: Run tests, commit**

---

### Task 6: Create WizardStepContent component (Step 2)

**Files:**

- Create: `components/admin/wizard-step-content.tsx`
- Test: `__tests__/unit/components/admin/wizard-step-content.test.tsx`

- [ ] **Step 1: Write tests**

Test that:

- Renders Brief Summary, Detailed Overview audio upload fields
- Renders Attachments file upload
- Renders Brief Summary Transcript, Detailed Overview Transcript file upload fields
- No field has `*` indicator
- No "(Optional)" text
- Upload progress is shown when uploading

- [ ] **Step 2: Implement component**

Extract content fields from `podcast-upload-form.tsx`. All file uploads happen immediately when selected (same behavior as current form — files uploaded to MinIO, storage key saved in form state). Show progress bars inline.

Labels use the new names: "Brief Summary", "Detailed Overview", "Brief Summary Transcript", "Detailed Overview Transcript", "Attachments".

- [ ] **Step 3: Run tests, commit**

---

### Task 7: Create WizardStepReview component (Step 3)

**Files:**

- Create: `components/admin/wizard-step-review.tsx`
- Test: `__tests__/unit/components/admin/wizard-step-review.test.tsx`

- [ ] **Step 1: Write tests**

Test that:

- Displays title, description, domain, year as text
- Displays tags as badges
- Shows thumbnail preview image
- Shows audio file names when present
- Shows attachment file names when present
- Shows transcript character counts when present
- Shows "Not provided" or similar for empty optional fields

- [ ] **Step 2: Implement component**

Read-only review component that receives all form values and displays them in a clean summary layout. Use Card components for grouping:

```
Card: "Details"
  - Title: value
  - Description: value
  - Domain: badge
  - Year: value
  - Tags: badge list

Card: "Content"
  - Brief Summary: filename or "Not provided"
  - Detailed Overview: filename or "Not provided"
  - Attachments: file list or "None"
  - Brief Summary Transcript: "X characters" or "Not provided"
  - Detailed Overview Transcript: "X characters" or "Not provided"

Card: "Thumbnail"
  - Image preview
```

- [ ] **Step 3: Run tests, commit**

---

### Task 8: Create PodcastUploadWizard orchestrator

**Files:**

- Create: `components/admin/podcast-upload-wizard.tsx`
- Test: `__tests__/unit/components/admin/podcast-upload-wizard.test.tsx`

- [ ] **Step 1: Write tests**

Test that:

- Renders step indicator with step 1 active initially
- Shows Step 1 (Details) fields on initial render
- "Next" button validates step 1 fields and advances to step 2
- "Back" button on step 2 returns to step 1
- Step 3 shows review and "Submit" button
- "Submit" calls the API to create the podcast
- Footer shows "All fields marked with \* are mandatory"

- [ ] **Step 2: Implement orchestrator**

```tsx
'use client';

/**
 * Three-stage podcast upload wizard.
 *
 * Manages form state with react-hook-form, step navigation,
 * validation per step, and final submission.
 */
```

Key responsibilities:

- Create react-hook-form with Zod resolver (same schema as current form)
- Track `currentStep` (0, 1, 2) in local state
- On "Next" from step 0: `trigger(['title', 'description', 'domain', 'year'])` — advance only if valid
- On "Next" from step 1: advance (no required fields)
- On "Submit" from step 2: call the same API sequence as current form (POST podcast, then PUT transcripts)
- Accept `mode: 'create' | 'edit'` and `initialData` props
- Accept `onSuccess` callback

Render:

```tsx
<div className="container max-w-3xl py-6">
  <WizardStepIndicator currentStep={currentStep} />
  {currentStep === 0 && <WizardStepDetails />}
  {currentStep === 1 && <WizardStepContent />}
  {currentStep === 2 && <WizardStepReview />}
  <div className="flex justify-between mt-6">
    {currentStep > 0 && (
      <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>
        Back
      </Button>
    )}
    {currentStep < 2 && <Button onClick={handleNext}>Next</Button>}
    {currentStep === 2 && <Button onClick={handleSubmit}>Submit</Button>}
  </div>
  <p className="text-sm text-muted-foreground italic mt-4">
    All fields marked with * are mandatory
  </p>
</div>
```

- [ ] **Step 3: Run tests, commit**

---

### Task 9: Wire wizard into upload and edit pages

**Files:**

- Modify: `app/(admin)/admin/upload/page.tsx`
- Modify: `app/(admin)/admin/edit/[id]/page.tsx`
- Modify: `components/admin/edit-podcast-client.tsx`

- [ ] **Step 1: Update upload page**

Replace `PodcastUploadForm` with `PodcastUploadWizard`:

```tsx
import { PodcastUploadWizard } from '@/components/admin/podcast-upload-wizard';

// In the render:
<PodcastUploadWizard mode="create" />;
```

- [ ] **Step 2: Update edit page client component**

In `edit-podcast-client.tsx`, replace `PodcastUploadForm` with `PodcastUploadWizard`:

```tsx
<PodcastUploadWizard mode="edit" initialData={podcast} onSuccess={() => router.push('/admin')} />
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add app/(admin)/admin/upload/page.tsx app/(admin)/admin/edit/[id]/page.tsx components/admin/edit-podcast-client.tsx
git commit -m "feat: wire three-stage upload wizard into admin pages"
```

---

## Chunk 3: Analytics Charts

### Task 10: Fix analytics chart types

**Files:**

- Modify: `components/admin/analytics-charts.tsx`
- Test: `__tests__/unit/components/admin/analytics-charts.test.tsx` (create or update)

- [ ] **Step 1: Write tests**

Test that:

- Domain chart renders as PieChart without innerRadius (true pie, not donut)
- Monthly trends renders as BarChart (not AreaChart)
- Top topics data is sorted descending by count

- [ ] **Step 2: Fix domain chart — remove innerRadius**

In `analytics-charts.tsx` line 110, remove `innerRadius={60}` from the `<Pie>` component to convert from donut to true pie chart.

- [ ] **Step 3: Change monthly trends from AreaChart to BarChart**

Replace lines 136-146 (AreaChart block) with:

```tsx
<ResponsiveContainer width="100%" height={250}>
  <BarChart data={data.monthlyTrends}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Update imports: add `Bar, BarChart` (if not already imported), remove `Area, AreaChart`.

- [ ] **Step 4: Sort top topics descending**

Before passing data to the top topics chart, sort it:

```typescript
const sortedTopics = [...data.topTopics].sort((a, b) => b.count - a.count);
```

Pass `sortedTopics` to the `<BarChart data={sortedTopics}>` instead of `data.topTopics`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add components/admin/analytics-charts.tsx __tests__/unit/components/admin/
git commit -m "feat: fix analytics charts — pie chart, column bars, sorted topics"
```

---

## Chunk 4: Final Verification

### Task 11: Final type check and test suite

- [ ] **Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: No new errors (pre-existing errors in episode-player.tsx and lib/db.ts are acceptable)

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: No errors

- [ ] **Step 4: Manual smoke test checklist**

- [ ] Admin upload page shows three-step wizard (Details → Content → Review)
- [ ] Step 1 has `*` on Title, Description, Domain, Year, Thumbnail
- [ ] Domain dropdown shows only podcast domains (5 items)
- [ ] No "(Optional)" text anywhere
- [ ] Step 2 shows Brief Summary, Detailed Overview labels (not Short/Long)
- [ ] Step 3 shows read-only review of all entered data
- [ ] Submit creates the podcast
- [ ] Admin edit page shows wizard pre-populated with existing data
- [ ] Learning path creation shows only Learning Series domains (2 items)
- [ ] Audio player toggle shows "Brief Summary" / "Detailed Overview"
- [ ] Analytics: Domain chart is a full pie (no donut hole)
- [ ] Analytics: Monthly trends is a column bar chart
- [ ] Analytics: Top topics sorted highest to lowest
- [ ] Footer shows "All fields marked with \* are mandatory" in italics
